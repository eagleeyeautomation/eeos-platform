import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createAuthInvitation,
  createPasswordResetToken,
  getAuthInvitationByTokenHash,
  getGhlToken,
  getMembershipById,
  getPasswordResetTokenByHash,
  getUserByEmail,
  getUserById,
  insertAuthAuditEvent,
  markAuthInvitationAccepted,
  markPasswordResetTokenUsed,
  revokeUserAuthSessions,
  upsertMembershipUser,
  upsertUser,
} from "../db";
import { listAuthorizedLocationsForMembership, requirePlatformAdmin, resolveAuthorizationContext } from "../authorization";
import { getSessionCookieOptions } from "./cookies";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "./passwordAuth";
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
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
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

async function buildSessionSummary(req: Request) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    return {
      loading: false,
      authenticated: false,
      user: null,
      role: null,
      organization: null,
      authorizedLocations: [],
      ghlConnected: false,
    };
  }

  const authorization = await resolveAuthorizationContext(user);
  const authorizedLocations = await listAuthorizedLocationsForMembership(authorization.membershipId);
  const connectedTokens = await Promise.all(
    authorization.authorizedLocationIds.map((locationId) => getGhlToken(locationId)),
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
    organization: authorization.organizationId ? {
      id: authorization.organizationId,
      name: authorization.organizationName ?? "Organization",
    } : null,
    authorizedLocations,
    ghlConnected: connectedTokens.some((token) => token?.isActive && token.scope === "private_integration"),
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
    const summary = await buildSessionSummary(req);
    res.status(summary.authenticated ? 200 : 401).json(summary);
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
        await audit({ actorUserId: user.id, action: "auth.password_reset.requested", targetType: "user", targetId: String(user.id) });
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
