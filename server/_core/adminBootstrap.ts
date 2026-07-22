import { createHash, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import {
  getMembershipByOrg,
  getMembershipUser,
  getOrganizationBySlug,
  getSubaccountsByMembership,
  getUserByEmail,
  insertAuditEntry,
} from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const PRODUCTION_BOOTSTRAP_ORIGIN = "https://eeos-platform-production.up.railway.app";

type BootstrapUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
};

type BootstrapOrganization = { id: number; name: string; isActive: boolean };
type BootstrapMembership = { id: number; status: string };
type BootstrapMembershipUser = { role: string; isActive: boolean };
type BootstrapSubaccount = { ghlLocationId: string; name: string; isActive: boolean };

export type AdminBootstrapDependencies = {
  getUserByEmail(email: string): Promise<BootstrapUser | undefined>;
  getOrganizationBySlug(slug: string): Promise<BootstrapOrganization | undefined>;
  getMembershipByOrg(organizationId: number): Promise<BootstrapMembership | undefined>;
  getMembershipUser(membershipId: number, userId: number): Promise<BootstrapMembershipUser | undefined>;
  getSubaccountsByMembership(membershipId: number): Promise<BootstrapSubaccount[]>;
  createSessionToken(openId: string, options: { name: string; expiresInMs: number }): Promise<string>;
  audit(outcome: "success" | "failure", reason: string, userId?: number, locationId?: string): Promise<void>;
};

const productionDependencies: AdminBootstrapDependencies = {
  getUserByEmail,
  getOrganizationBySlug,
  getMembershipByOrg,
  getMembershipUser,
  getSubaccountsByMembership,
  createSessionToken: (openId, options) => sdk.createSessionToken(openId, options),
  audit: async (outcome, reason, userId, locationId) => {
    await insertAuditEntry({
      tenantId: locationId || "admin-bootstrap",
      actor: "system",
      action: "admin_session_bootstrap",
      entityType: "user",
      entityId: userId ? String(userId) : null,
      outcome,
      details: { reason },
    });
  },
};

export function registerAdminBootstrapRoute(
  app: Express,
  dependencies: AdminBootstrapDependencies = productionDependencies,
  env: NodeJS.ProcessEnv = process.env,
) {
  let consumed = false;

  app.post("/api/auth/bootstrap-admin-session", async (req: Request, res: Response) => {
    const enabled = env.EEOS_ADMIN_BOOTSTRAP_ENABLED === "true";
    const configuredSecret = env.EEOS_ADMIN_BOOTSTRAP_SECRET?.trim();
    const administratorEmail = env.EEOS_ADMIN_BOOTSTRAP_EMAIL?.trim();

    if (!enabled || !configuredSecret || !administratorEmail || consumed) {
      await auditSafely(dependencies, "failure", consumed ? "already_used" : "disabled");
      res.status(404).json({ error: "not_found" });
      return;
    }

    if (!isAllowedOrigin(req, env)) {
      await auditSafely(dependencies, "failure", "origin_mismatch");
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const suppliedSecret = readSecret(req);
    if (!suppliedSecret) {
      await auditSafely(dependencies, "failure", "secret_missing");
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (!constantTimeEqual(suppliedSecret, configuredSecret)) {
      await auditSafely(dependencies, "failure", "secret_mismatch");
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    try {
      const user = await dependencies.getUserByEmail(administratorEmail);
      if (!user || user.role !== "admin") {
        await auditSafely(dependencies, "failure", "administrator_not_found");
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const organization = await dependencies.getOrganizationBySlug("prn-staffers");
      if (!organization || !organization.isActive) {
        await auditSafely(dependencies, "failure", "organization_not_authorized", user.id);
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const membership = await dependencies.getMembershipByOrg(organization.id);
      const membershipUser = membership
        ? await dependencies.getMembershipUser(membership.id, user.id)
        : undefined;
      if (
        !membership ||
        membership.status !== "active" ||
        !membershipUser ||
        !membershipUser.isActive ||
        membershipUser.role !== "owner"
      ) {
        await auditSafely(dependencies, "failure", "membership_not_authorized", user.id);
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const subaccounts = await dependencies.getSubaccountsByMembership(membership.id);
      const southCarolina = subaccounts.find(
        (subaccount) => subaccount.isActive && subaccount.name.trim().toLowerCase() === "south carolina",
      );
      if (!southCarolina) {
        await auditSafely(dependencies, "failure", "south_carolina_not_authorized", user.id);
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const sessionToken = await dependencies.createSessionToken(user.openId, {
        name: user.name?.trim() || user.email || "EEOS administrator",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      consumed = true;
      await auditSafely(dependencies, "success", "session_created", user.id, southCarolina.ghlLocationId);
      res.status(200).json({
        ok: true,
        redirectTo: "/integrations/gohighlevel",
        locationId: southCarolina.ghlLocationId,
      });
    } catch {
      await auditSafely(dependencies, "failure", "internal_error");
      res.status(500).json({ error: "bootstrap_failed" });
    }
  });
}

function readSecret(req: Request) {
  const header = req.header("x-eeos-admin-bootstrap-secret")?.trim();
  if (header) return header;
  const bodySecret = req.body?.secret;
  return typeof bodySecret === "string" ? bodySecret.trim() : "";
}

function constantTimeEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function isAllowedOrigin(req: Request, env: NodeJS.ProcessEnv) {
  const origin = req.header("origin");
  if (!origin) return false;

  try {
    const parsedOrigin = normalizeOrigin(origin);
    const environment = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();
    const productionLike = environment === "production" || environment === "staging" || Boolean(env.RAILWAY_ENVIRONMENT);
    if (productionLike) {
      return parsedOrigin === PRODUCTION_BOOTSTRAP_ORIGIN;
    }

    const host = req.header("x-forwarded-host") || req.header("host");
    const protocol = req.header("x-forwarded-proto") || req.protocol;
    return Boolean(host) && parsedOrigin === normalizeOrigin(`${protocol}://${host}`);
  } catch {
    return false;
  }
}

function normalizeOrigin(value: string) {
  return new URL(value.trim()).origin.replace(/\/$/, "");
}

async function auditSafely(
  dependencies: AdminBootstrapDependencies,
  outcome: "success" | "failure",
  reason: string,
  userId?: number,
  locationId?: string,
) {
  try {
    await dependencies.audit(outcome, reason, userId, locationId);
  } catch {
    console.warn("[AdminBootstrap] Audit persistence failed");
  }
}
