import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createAuthInvitation,
  createVerifiedGhlSubaccount,
  deleteVerifiedGhlSubaccount,
  createPasswordResetToken,
  getAuthInvitationByTokenHash,
  getGhlToken,
  getMembershipById,
  getPasswordResetTokenByHash,
  getUserByEmail,
  getUserById,
  insertAuthAuditEvent,
  inspectLegacyGhlBinding,
  markAuthInvitationAccepted,
  markPasswordResetTokenUsed,
  revokeUserAuthSessions,
  upsertMembershipUser,
  upsertUser,
} from "../db";
import {
  inspectRuntimeGhlBinding,
  reconcileRuntimeGhlBinding,
} from "../db/runtimePersistence";
import { storeGhlConnectionTokenWithAudit } from "../ghl-token-store";
import {
  listAuthorizedLocationsForMembership,
  requirePlatformAdmin,
  resolveAuthorizationContext,
  resolveOrganizationAuthorizationContext,
} from "../authorization";
import { getSessionCookieOptions } from "./cookies";
import { hasValidSessionCsrf, issueSessionCsrfToken } from "./csrf";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "./passwordAuth";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "./passwordResetEmail";
import { createOpaqueToken, hashOpaqueToken, readClientIp } from "./sessionTokens";
import { sdk } from "./sdk";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(512),
  returnTo: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(320),
});

const resetPasswordSchema = z.object({
  token: z.string().min(16).max(512),
  password: z.string().min(1).max(512),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(16).max(512),
  displayName: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(512),
});

const createInvitationSchema = z.object({
  email: z.string().email().max(320),
  organizationId: z.number().int().positive(),
  membershipId: z.number().int().positive(),
  role: z.enum(["owner", "executive", "analyst", "viewer"]),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value || value === "/" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}

function defaultRouteForRole(role: Awaited<ReturnType<typeof resolveAuthorizationContext>>["role"]) {
  return role === "PLATFORM_ADMIN" ? "/admin" : "/executive-home";
}

function invalidLogin(res: Response) {
  res.status(401).json({ success: false, error: "Invalid email or password." });
}

function rateLimitKey(req: Request, email: string) {
  return `${readClientIp(req) || "unknown"}:${email}`;
}

function isRateLimited(key: string) {
  const record = failedLoginAttempts.get(key);
  if (!record) return false;
  if (record.resetAt <= Date.now()) {
    failedLoginAttempts.delete(key);
    return false;
  }
  return record.count >= 8;
}

function recordFailedLogin(key: string) {
  const current = failedLoginAttempts.get(key);
  const resetAt = Date.now() + 15 * 60_000;
  failedLoginAttempts.set(key, {
    count: current && current.resetAt > Date.now() ? current.count + 1 : 1,
    resetAt,
  });
}

function clearFailedLogin(key: string) {
  failedLoginAttempts.delete(key);
}

async function audit(input: {
  actorUserId?: number | null;
  organizationId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await insertAuthAuditEvent({
    actorUserId: input.actorUserId ?? null,
    organizationId: input.organizationId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
  });
}

async function buildSessionSummary(req: Request, res: Response) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    return {
      loading: false,
      authenticated: false,
      user: null,
      role: null,
      organizationRole: null,
      organization: null,
      authorizedLocations: [],
      ghlConnected: false,
      csrfToken: null,
    };
  }

  const authorization = await resolveAuthorizationContext(user);
  const organizationAuthorization = await resolveOrganizationAuthorizationContext(user);
  const authorizedLocations = await listAuthorizedLocationsForMembership(organizationAuthorization?.membershipId ?? null);
  const connectedTokens = await Promise.all(
    (organizationAuthorization?.authorizedLocationIds ?? []).map((locationId) => getGhlToken(locationId)),
  );

  return {
    loading: false,
    authenticated: true,
    user: {
      id: String(user.id),
      name: user.name ?? undefined,
      email: user.email ?? undefined,
    },
    role: authorization.role,
    organizationRole: organizationAuthorization?.role ?? null,
    organization: organizationAuthorization?.organizationId ? {
      id: organizationAuthorization.organizationId,
      name: organizationAuthorization.organizationName ?? "Organization",
    } : null,
    authorizedLocations,
    ghlConnected: connectedTokens.some((token) => token?.isActive && token.scope === "private_integration"),
    csrfToken: issueSessionCsrfToken(req, res),
  };
}

function setSessionCookie(req: Request, res: Response, token: string, maxAge = ONE_YEAR_MS) {
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge,
    expires: new Date(Date.now() + maxAge),
  });
}

function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export function registerFirstPartyAuthRoutes(app: Express) {
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    const summary = await buildSessionSummary(req, res);
    res.status(summary.authenticated ? 200 : 401).json(summary);
  });

  app.post("/api/admin/organizations/:organizationId/enter", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) {
      res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
      return;
    }

    try {
      const user = await sdk.authenticateRequest(req);
      await requirePlatformAdmin(user);
      const organizationContext = await resolveOrganizationAuthorizationContext(user);
      const targetOrganizationId = z.coerce.number().int().positive().safeParse(req.params.organizationId);

      if (
        !targetOrganizationId.success
        || organizationContext?.role !== "ORGANIZATION_OWNER"
        || organizationContext.organizationId !== String(targetOrganizationId.data)
      ) {
        res.status(403).json({ success: false, error: "No active owner membership is available for this organization." });
        return;
      }

      await audit({
        actorUserId: user.id,
        organizationId: targetOrganizationId.data,
        action: "organization.context.entered",
        targetType: "organization",
        targetId: String(targetOrganizationId.data),
        metadata: { role: organizationContext.role },
      });
      res.status(200).json({ success: true, redirectTo: "/executive-home" });
    } catch (error) {
      const status = error instanceof Error && error.message.includes("Authentication") ? 401 : 403;
      res.status(status).json({ success: false, error: status === 401 ? "Authentication is required." : "Platform administrator access is required." });
    }
  });

  app.get("/api/admin/integrations/gohighlevel/florida-binding", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      await requirePlatformAdmin(user);
      const providerLocationId = "cNQAsS4J15aPtGtOqgM0";
      const [legacy, runtime] = await Promise.all([
        inspectLegacyGhlBinding(providerLocationId),
        inspectRuntimeGhlBinding(providerLocationId),
      ]);
      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .status(200)
        .json({ provider: "gohighlevel", providerLocationId, legacy, runtime });
    } catch {
      res.status(403).json({ success: false, error: "Platform administrator access is required." });
    }
  });

  app.post("/api/admin/integrations/gohighlevel/florida-binding/reconcile", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) {
      res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
      return;
    }

    const providerLocationId = "cNQAsS4J15aPtGtOqgM0";
    let createdSubaccount: { id: number } | null = null;
    try {
      const user = await sdk.authenticateRequest(req);
      await requirePlatformAdmin(user);
      const ownerContext = await resolveOrganizationAuthorizationContext(user);
      if (
        ownerContext?.role !== "ORGANIZATION_OWNER"
        || ownerContext.organizationName !== "PRN Staffers Inc."
        || !ownerContext.membershipId
        || !ownerContext.organizationId
      ) {
        res.status(403).json({ success: false, error: "An active PRN Staffers owner membership is required." });
        return;
      }

      const [legacy, runtime] = await Promise.all([
        inspectLegacyGhlBinding(providerLocationId),
        inspectRuntimeGhlBinding(providerLocationId),
      ]);
      if (!legacy.connection?.active || legacy.connection.providerLocationId !== providerLocationId) {
        res.status(409).json({ success: false, error: "The legacy Florida provider binding is not active or does not match." });
        return;
      }
      if (legacy.subaccount) {
        res.status(409).json({ success: false, error: "The Florida provider binding is already linked to a subaccount." });
        return;
      }
      const activeRuntime = runtime.connections.filter((connection) => !connection.disconnected_at);
      if (activeRuntime.length > 1) {
        res.status(409).json({ success: false, error: "Multiple active runtime Florida bindings require manual review." });
        return;
      }

      const created = await createVerifiedGhlSubaccount({
        membershipId: Number(ownerContext.membershipId),
        providerLocationId,
        name: "PRN Staffers FL",
        city: "Greensboro",
        state: "Florida",
      });
      if (!created.created) {
        res.status(409).json({ success: false, error: `Florida reconciliation stopped: ${created.reason}.` });
        return;
      }
      createdSubaccount = { id: created.id };

      if (activeRuntime.length === 1) {
        await reconcileRuntimeGhlBinding({
          connectionId: activeRuntime[0].id,
          locationId: providerLocationId,
          currentOrganizationId: activeRuntime[0].organization_id,
          organizationId: ownerContext.organizationId,
          actorUserId: String(user.id),
          subaccountId: created.id,
        });
      } else {
        const token = await getGhlToken(providerLocationId);
        if (
          !token
          || !token.isActive
          || (token.locationId ?? token.tenantId) !== providerLocationId
        ) {
          throw new Error("The legacy Florida token cannot be migrated safely.");
        }
        await storeGhlConnectionTokenWithAudit({
          organizationId: ownerContext.organizationId,
          operationalDivisionId: providerLocationId,
          locationId: providerLocationId,
          payload: {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            tokenType: token.tokenType ?? "Bearer",
            expiresAt: token.expiresAt.toISOString(),
            scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? [],
            locationId: providerLocationId,
            companyId: token.companyId ?? undefined,
            userType: "Location",
          },
        }, {
          organizationId: ownerContext.organizationId,
          source: "gohighlevel",
          eventType: "binding.legacy_migrated",
          locationId: providerLocationId,
          metadata: {
            actorUserId: String(user.id),
            legacyConnectionId: legacy.connection.id,
            subaccountId: created.id,
          },
        });
      }
      await audit({
        actorUserId: user.id,
        organizationId: Number(ownerContext.organizationId),
        action: "gohighlevel.binding.reconciled",
        targetType: "operational_location",
        targetId: providerLocationId,
        metadata: { subaccountId: created.id, provider: "gohighlevel" },
      });
      res.status(200).json({
        success: true,
        organization: { id: ownerContext.organizationId, name: ownerContext.organizationName },
        subaccount: { id: created.id, name: "PRN Staffers FL", city: "Greensboro", state: "Florida" },
        provider: "gohighlevel",
      });
    } catch {
      if (createdSubaccount) {
        await deleteVerifiedGhlSubaccount(createdSubaccount.id, providerLocationId).catch(() => undefined);
      }
      res.status(500).json({ success: false, error: "Florida provider binding reconciliation failed safely." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const limitKey = rateLimitKey(req, email);
    if (isRateLimited(limitKey)) {
      res.status(429).json({ success: false, error: "Too many failed attempts. Try again later." });
      return;
    }

    const user = await getUserByEmail(email);
    if (!user || user.isActive === false || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      recordFailedLogin(limitKey);
      await audit({ action: "auth.login.failed", targetType: "user", targetId: email });
      invalidLogin(res);
      return;
    }

    clearFailedLogin(limitKey);
    await upsertUser({
      openId: user.openId,
      loginMethod: "eeos",
      lastSignedIn: new Date(),
    });

    const refreshedUser = await getUserById(user.id);
    if (!refreshedUser) {
      res.status(500).json({ success: false, error: "Unable to create EEOS session." });
      return;
    }

    const authorization = await resolveAuthorizationContext(refreshedUser);
    const fallbackRoute = defaultRouteForRole(authorization.role);
    const redirectTo = safeReturnTo(parsed.data.returnTo, fallbackRoute);
    const session = await sdk.createSessionForUser(refreshedUser, req, { expiresInMs: ONE_YEAR_MS });

    setSessionCookie(req, res, session.token);
    await audit({
      actorUserId: refreshedUser.id,
      organizationId: authorization.organizationId ? Number(authorization.organizationId) : null,
      action: "auth.login.success",
      targetType: "user",
      targetId: String(refreshedUser.id),
    });
    res.status(200).json({
      success: true,
      redirectTo,
      user: { id: String(refreshedUser.id), name: refreshedUser.name, email: refreshedUser.email },
      role: authorization.role,
    });
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    await sdk.revokeCurrentSession(req);
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (parsed.success) {
      const user = await getUserByEmail(normalizeEmail(parsed.data.email));
      if (user?.isActive) {
        const token = createOpaqueToken();
        await createPasswordResetToken({
          userId: user.id,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + 60 * 60_000),
        });
        const resetUrl = buildPasswordResetUrl(token);
        const delivery = resetUrl
          ? await sendPasswordResetEmail({
              recipientEmail: user.email ?? normalizeEmail(parsed.data.email),
              resetUrl,
            })
          : { delivered: false as const, reason: "configuration" as const };
        if (!delivery.delivered) {
          console.warn(`[PasswordResetEmail] Delivery failed: ${delivery.reason}.`);
        }
        await audit({
          actorUserId: user.id,
          action: "auth.password_reset.requested",
          targetType: "user",
          targetId: String(user.id),
          metadata: { delivery: delivery.delivered ? "delivered" : delivery.reason },
        });
      }
    }
    res.status(200).json({ success: true, message: "If the account exists, reset instructions will be sent." });
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "A valid reset token and password are required." });
      return;
    }
    const policyError = validatePasswordPolicy(parsed.data.password);
    if (policyError) {
      res.status(400).json({ success: false, error: policyError });
      return;
    }

    const reset = await getPasswordResetTokenByHash(hashOpaqueToken(parsed.data.token));
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      res.status(400).json({ success: false, error: "Reset link is invalid or expired." });
      return;
    }
    const user = await getUserById(reset.userId);
    if (!user || user.isActive === false) {
      res.status(400).json({ success: false, error: "Reset link is invalid or expired." });
      return;
    }

    await upsertUser({
      openId: user.openId,
      passwordHash: await hashPassword(parsed.data.password),
      loginMethod: "eeos",
    });
    await markPasswordResetTokenUsed(reset.id);
    await revokeUserAuthSessions(user.id);
    await audit({ actorUserId: user.id, action: "auth.password_reset.completed", targetType: "user", targetId: String(user.id) });
    res.status(200).json({ success: true });
  });

  app.post("/api/auth/invitations/accept", async (req: Request, res: Response) => {
    const parsed = acceptInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "A valid invitation, name, and password are required." });
      return;
    }
    const policyError = validatePasswordPolicy(parsed.data.password);
    if (policyError) {
      res.status(400).json({ success: false, error: policyError });
      return;
    }

    const invitation = await getAuthInvitationByTokenHash(hashOpaqueToken(parsed.data.token));
    if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
      res.status(400).json({ success: false, error: "Invitation is invalid or expired." });
      return;
    }

    const email = normalizeEmail(invitation.email);
    const existing = await getUserByEmail(email);
    const openId = existing?.openId ?? `eeos_${randomUUID()}`;
    await upsertUser({
      openId,
      email,
      name: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
      loginMethod: "eeos",
      isActive: true,
    });
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(500).json({ success: false, error: "Invitation could not be accepted." });
      return;
    }

    await upsertMembershipUser(invitation.membershipId, user.id, invitation.role);
    await markAuthInvitationAccepted(invitation.id);
    await audit({
      actorUserId: user.id,
      organizationId: invitation.organizationId,
      action: "auth.invitation.accepted",
      targetType: "invitation",
      targetId: String(invitation.id),
    });
    res.status(200).json({ success: true, redirectTo: "/login" });
  });

  app.post("/api/admin/invitations", async (req: Request, res: Response) => {
    let actor;
    try {
      actor = await sdk.authenticateRequest(req);
      await requirePlatformAdmin(actor);
    } catch {
      res.status(401).json({ success: false, error: "Authentication is required." });
      return;
    }

    const parsed = createInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invitation details are invalid." });
      return;
    }
    const membership = await getMembershipById(parsed.data.membershipId);
    if (!membership || membership.organizationId !== parsed.data.organizationId) {
      res.status(400).json({ success: false, error: "Organization membership is invalid." });
      return;
    }

    const token = createOpaqueToken();
    await createAuthInvitation({
      email: normalizeEmail(parsed.data.email),
      organizationId: parsed.data.organizationId,
      membershipId: parsed.data.membershipId,
      role: parsed.data.role,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + (parsed.data.expiresInDays ?? 7) * 24 * 60 * 60_000),
      invitedByUserId: actor.id,
    });
    await audit({
      actorUserId: actor.id,
      organizationId: parsed.data.organizationId,
      action: "auth.invitation.created",
      targetType: "email",
      targetId: normalizeEmail(parsed.data.email),
      metadata: { role: parsed.data.role, delivery: "email_provider_not_configured" },
    });
    res.status(202).json({ success: true, delivery: "email_provider_not_configured" });
  });
}
