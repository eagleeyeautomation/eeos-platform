import {
  ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS,
  COOKIE_NAME,
  USER_SESSION_ABSOLUTE_TIMEOUT_MS,
} from "@shared/const";
import type { Express, Request, Response } from "express";
import { createHmac, randomUUID } from "crypto";
import { z } from "zod";
import {
  createAuthInvitation,
  createVerifiedGhlSubaccount,
  deleteVerifiedGhlSubaccount,
  createPasswordResetToken,
  getAuthInvitationByTokenHash,
  getGhlToken,
  getMembershipById,
  getMfaFactor,
  getPasswordResetTokenByHash,
  getUserByEmail,
  getUserById,
  insertAuthAuditEvent,
  consumeMfaRecoveryCode,
  disableMfaFactor,
  enableMfaFactor,
  listActiveAuthSessions,
  markSessionMfaVerifiedAndRecent,
  markSessionRecentlyAuthenticated,
  revokeAuthSessionById,
  savePendingMfaFactor,
  updateMfaCounter,
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
import {
  storeGhlConnectionTokenWithAudit,
  updateGhlConnectionScopesWithAudit,
} from "../ghl-token-store";
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
import { AuthenticationRateLimiter, createProductionRateLimitStore, rateLimitIdentity } from "./distributedRateLimit";
import { decryptMfaSecret, encryptMfaSecret, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, mfaRequiredForRole, verifyTotp } from "./mfa";
import { sanitizedRecentMfaState } from "./recentMfa";

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

const mfaCodeSchema = z.object({ code: z.string().trim().min(6).max(64) });
const reauthenticateSchema = z.object({ password: z.string().min(1).max(512) });
const sessionRevokeSchema = z.object({ sessionId: z.string().regex(/^session_[a-f0-9]{32}$/) });
const distributedLimiter = new AuthenticationRateLimiter(createProductionRateLimitStore());

function sessionHandle(id: number) {
  const key = process.env.JWT_SECRET;
  if (!key) throw new Error("JWT_SECRET is required");
  return `session_${createHmac("sha256", key).update(`eeos:session-handle:v1:${id}`).digest("hex").slice(0, 32)}`;
}

const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const sensitiveRouteAttempts = new Map<string, { count: number; resetAt: number }>();
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

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

async function enforceDistributedLimit(req: Request, res: Response, route: string, account: string, limit: number, failClosed = false) {
  if (process.env.NODE_ENV === "test") return true;
  const decision = await distributedLimiter.consume({
    route,
    network: readClientIp(req) || "unknown",
    account,
    limit,
    windowSeconds: AUTH_RATE_LIMIT_WINDOW_MS / 1000,
    failClosed,
  });
  if (decision.allowed) return true;
  await auditRateLimit(route, req);
  res.set("Retry-After", String(decision.retryAfterSeconds)).status(429)
    .json({ success: false, error: "Too many requests. Try again later." });
  return false;
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

export function consumeSensitiveRouteLimit(key: string, limit: number, now = Date.now()) {
  const current = sensitiveRouteAttempts.get(key);
  if (!current || current.resetAt <= now) {
    sensitiveRouteAttempts.set(key, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

async function auditRateLimit(route: string, req: Request) {
  await audit({
    action: "auth.rate_limit.triggered",
    targetType: "authentication_route",
    targetId: route,
    outcome: "denied",
    reasonCode: "RATE_LIMIT_EXCEEDED",
    severity: "warn",
    correlationId: req.header("x-request-id") ?? req.header("x-eeos-request-id") ?? null,
    metadata: { source: readClientIp(req) ? "network" : "unknown" },
  });
}

async function audit(input: {
  actorUserId?: number | null;
  organizationId?: number | null;
  locationId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  outcome?: "success" | "failure" | "denied";
  reasonCode?: string | null;
  correlationId?: string | null;
  severity?: "info" | "warn" | "critical";
  metadata?: Record<string, unknown>;
}) {
  const inferredDenied = input.action.includes("failed") || input.action.includes("denied") || input.action.includes("rate_limit");
  await insertAuthAuditEvent({
    actorUserId: input.actorUserId ?? null,
    organizationId: input.organizationId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: {
      locationId: input.locationId ?? null,
      role: input.actorRole ?? null,
      outcome: input.outcome ?? (inferredDenied ? "denied" : "success"),
      reasonCode: input.reasonCode ?? null,
      correlationId: input.correlationId ?? null,
      sourceService: "eeos-core",
      securitySeverity: input.severity ?? (inferredDenied ? "warn" : "info"),
      ...(input.metadata ?? {}),
    },
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

function setSessionCookie(req: Request, res: Response, token: string, maxAge: number) {
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

  app.post("/api/admin/integrations/gohighlevel/florida-binding/repair-scopes", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) {
      res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
      return;
    }
    const providerLocationId = "cNQAsS4J15aPtGtOqgM0";
    const requiredScopes = ["contacts.readonly", "opportunities.readonly"];
    try {
      const user = await sdk.authenticateRequest(req);
      await requirePlatformAdmin(user);
      const ownerContext = await resolveOrganizationAuthorizationContext(user);
      if (
        ownerContext?.role !== "ORGANIZATION_OWNER"
        || ownerContext.organizationName !== "PRN Staffers Inc."
        || !ownerContext.organizationId
      ) {
        res.status(403).json({ success: false, error: "An active PRN Staffers owner membership is required." });
        return;
      }
      const runtime = await inspectRuntimeGhlBinding(providerLocationId);
      const active = runtime.connections.filter((connection) => !connection.disconnected_at);
      if (
        active.length !== 1
        || active[0].organization_id !== ownerContext.organizationId
        || active[0].location_id !== providerLocationId
      ) {
        res.status(409).json({ success: false, error: "The exact Florida runtime binding could not be verified." });
        return;
      }
      await updateGhlConnectionScopesWithAudit(
        ownerContext.organizationId,
        providerLocationId,
        requiredScopes,
        {
          organizationId: ownerContext.organizationId,
          source: "gohighlevel",
          eventType: "binding.private_integration_scopes_verified",
          locationId: providerLocationId,
          metadata: {
            actorUserId: String(user.id),
            integrationName: "EEOS Prn Staffers",
            scopes: requiredScopes,
            providerPermissionsVerifiedInPlace: true,
          },
        },
      );
      res.status(200).json({
        success: true,
        provider: "gohighlevel",
        maskedLocationId: "cNQAsS4J…OqgM0",
        scopes: requiredScopes,
      });
    } catch {
      res.status(500).json({ success: false, error: "Florida scope metadata repair failed safely." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await getUserByEmail(email);
    if (!(await enforceDistributedLimit(req, res, "login", email, 8, user?.role === "admin"))) return;
    const limitKey = rateLimitKey(req, email);
    if (isRateLimited(limitKey)) {
      await auditRateLimit("login", req);
      res.status(429).json({ success: false, error: "Too many failed attempts. Try again later." });
      return;
    }

    if (!user || user.isActive === false || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      recordFailedLogin(limitKey);
      await audit({ action: "auth.login.failed", targetType: "user", targetId: email });
      invalidLogin(res);
      return;
    }

    // Successful authentication does not clear shared abuse evidence. The local
    // fallback record is retained until its fixed window expires as well.
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
    const factor = await getMfaFactor(refreshedUser.id);
    const requiresMfa = Boolean(factor?.enabledAt || mfaRequiredForRole(authorization.role));
    if (mfaRequiredForRole(authorization.role) && !factor?.enabledAt) {
      res.status(403).json({ success: false, error: "MFA enrollment is required before this role can sign in." });
      return;
    }
    const fallbackRoute = defaultRouteForRole(authorization.role);
    const redirectTo = safeReturnTo(parsed.data.returnTo, fallbackRoute);
    const sessionMaxAge = authorization.role === "PLATFORM_ADMIN"
      ? ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS
      : USER_SESSION_ABSOLUTE_TIMEOUT_MS;
    const session = await sdk.createSessionForUser(refreshedUser, req, { expiresInMs: sessionMaxAge, mfaVerified: !requiresMfa });

    setSessionCookie(req, res, session.token, sessionMaxAge);
    issueSessionCsrfToken(req, res, session.token);
    await audit({
      actorUserId: refreshedUser.id,
      organizationId: authorization.organizationId ? Number(authorization.organizationId) : null,
      action: "auth.login.success",
      targetType: "user",
      targetId: String(refreshedUser.id),
    });
    res.status(200).json({
      success: true,
      redirectTo: requiresMfa ? "/mfa-challenge" : redirectTo,
      requiresMfa,
      user: { id: String(refreshedUser.id), name: refreshedUser.name, email: refreshedUser.email },
      role: authorization.role,
    });
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) {
      res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
      return;
    }
    await sdk.revokeCurrentSession(req);
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  });

  app.get("/api/auth/mfa/pending", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticatePendingMfaRequest(req);
      const factor = await getMfaFactor(user.id);
      const session = await sdk.currentSession(req);
      if (!factor?.enabledAt || session?.mfaVerifiedAt) throw new Error("No pending challenge");
      res.status(200).json({ success: true, csrfToken: issueSessionCsrfToken(req, res) });
    } catch {
      res.status(401).json({ success: false, error: "An MFA challenge session is required." });
    }
  });

  app.post("/api/auth/mfa/challenge", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    const parsed = mfaCodeSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: "A valid authentication code is required." });
    try {
      const user = await sdk.authenticatePendingMfaRequest(req);
      if (!(await enforceDistributedLimit(req, res, "mfa-challenge", String(user.id), 6, user.role === "admin"))) return;
      const [factor, session] = await Promise.all([getMfaFactor(user.id), sdk.currentSession(req)]);
      if (!factor?.enabledAt || !session) throw new Error("MFA unavailable");
      const recoveryHash = hashRecoveryCode(parsed.data.code);
      const recovered = await consumeMfaRecoveryCode(user.id, recoveryHash);
      let counter: number | undefined;
      if (!recovered) counter = verifyTotp(decryptMfaSecret(factor.encryptedSecret), parsed.data.code, Date.now());
      if (counter !== undefined && factor.lastTotpCounter != null && counter <= factor.lastTotpCounter) {
        await audit({ actorUserId: user.id, action: "auth.mfa.challenge.replay_denied", targetType: "user", targetId: String(user.id), outcome: "denied" });
        return void res.status(401).json({ success: false, error: "Invalid authentication code." });
      }
      if (!recovered && counter === undefined) {
        await audit({ actorUserId: user.id, action: "auth.mfa.challenge.failed", targetType: "user", targetId: String(user.id), outcome: "denied" });
        return void res.status(401).json({ success: false, error: "Invalid authentication code." });
      }
      if (counter !== undefined && !(await updateMfaCounter(user.id, counter))) {
        await audit({ actorUserId: user.id, action: "auth.mfa.challenge.replay_denied", targetType: "user", targetId: String(user.id), outcome: "denied" });
        return void res.status(401).json({ success: false, error: "Invalid authentication code." });
      }
      const updatedSession = await markSessionMfaVerifiedAndRecent(session.id);
      console.info("[auth.recent_mfa]", {
        phase: "mfa_post_update",
        sameSessionId: updatedSession.id === session.id,
        updateRowCount: 1,
        sessionRotated: false,
        adapter: "first_party_mysql",
        ...sanitizedRecentMfaState(updatedSession),
      });
      await audit({ actorUserId: user.id, action: recovered ? "auth.mfa.recovery.used" : "auth.mfa.challenge.succeeded", targetType: "user", targetId: String(user.id) });
      res.status(200).json({ success: true, redirectTo: user.role === "admin" ? "/admin" : "/executive-home" });
    } catch {
      res.status(401).json({ success: false, error: "An MFA challenge session is required." });
    }
  });

  app.post("/api/auth/mfa/enrollment/start", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      const session = await sdk.currentSession(req);
      if (!session?.recentAuthAt || session.recentAuthAt.getTime() < Date.now() - 10 * 60_000) {
        return void res.status(403).json({ success: false, error: "Recent authentication is required." });
      }
      if (!(await enforceDistributedLimit(req, res, "mfa-enrollment", String(user.id), 5, user.role === "admin"))) return;
      const existingFactor = await getMfaFactor(user.id);
      if (existingFactor?.enabledAt) return void res.status(409).json({ success: false, error: "MFA is already enabled." });
      const secret = existingFactor ? decryptMfaSecret(existingFactor.encryptedSecret) : generateTotpSecret();
      if (!existingFactor) await savePendingMfaFactor(user.id, encryptMfaSecret(secret));
      const label = encodeURIComponent(user.email ?? `user-${user.id}`);
      await audit({ actorUserId: user.id, action: "auth.mfa.enrollment.started", targetType: "user", targetId: String(user.id) });
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ success: true, provisioningUri: `otpauth://totp/EEOS:${label}?secret=${secret}&issuer=EEOS&algorithm=SHA1&digits=6&period=30` });
    } catch {
      res.status(401).json({ success: false, error: "Authentication is required." });
    }
  });

  app.post("/api/auth/reauthenticate", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    const parsed = reauthenticateSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: "Password is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      const session = await sdk.currentSession(req);
      if (!session) throw new Error("Session unavailable");
      if (!(await enforceDistributedLimit(req, res, "reauthenticate", String(user.id), 5, user.role === "admin"))) return;
      if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
        await audit({ actorUserId: user.id, action: "auth.reauthentication.failed", targetType: "user", targetId: String(user.id), outcome: "denied" });
        return void res.status(401).json({ success: false, error: "Reauthentication failed." });
      }
      await markSessionRecentlyAuthenticated(session.id);
      await audit({ actorUserId: user.id, action: "auth.reauthentication.succeeded", targetType: "user", targetId: String(user.id) });
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ success: true });
    } catch {
      res.status(401).json({ success: false, error: "Authentication is required." });
    }
  });

  app.post("/api/auth/mfa/enrollment/resume", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      const session = await sdk.currentSession(req);
      if (!session?.recentAuthAt || session.recentAuthAt.getTime() < Date.now() - 10 * 60_000) {
        return void res.status(403).json({ success: false, error: "Recent authentication is required." });
      }
      const factor = await getMfaFactor(user.id);
      if (!factor || factor.enabledAt) return void res.status(404).json({ success: false, error: "No pending enrollment is available." });
      const secret = decryptMfaSecret(factor.encryptedSecret);
      const label = encodeURIComponent(user.email ?? `user-${user.id}`);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ success: true, provisioningUri: `otpauth://totp/EEOS:${label}?secret=${secret}&issuer=EEOS&algorithm=SHA1&digits=6&period=30` });
    } catch {
      res.status(401).json({ success: false, error: "Authentication is required." });
    }
  });

  app.post("/api/auth/mfa/enrollment/confirm", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    const parsed = mfaCodeSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: "A valid authentication code is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      const factor = await getMfaFactor(user.id);
      if (!factor || factor.enabledAt) throw new Error("Enrollment unavailable");
      const counter = verifyTotp(decryptMfaSecret(factor.encryptedSecret), parsed.data.code);
      if (counter === undefined) return void res.status(401).json({ success: false, error: "Invalid authentication code." });
      const recoveryCodes = generateRecoveryCodes();
      await enableMfaFactor(user.id, recoveryCodes.map(hashRecoveryCode), counter);
      await audit({ actorUserId: user.id, action: "auth.mfa.enrollment.completed", targetType: "user", targetId: String(user.id) });
      res.status(200).json({ success: true, recoveryCodes });
    } catch {
      res.status(400).json({ success: false, error: "MFA enrollment could not be completed." });
    }
  });

  app.post("/api/auth/mfa/disable", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    const parsed = z.object({ password: z.string().min(1).max(512) }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: "Password confirmation is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return void res.status(403).json({ success: false, error: "Strong authorization is required." });
      if (mfaRequiredForRole((await resolveAuthorizationContext(user)).role)) return void res.status(409).json({ success: false, error: "MFA is required for this role." });
      await disableMfaFactor(user.id);
      await revokeUserAuthSessions(user.id);
      await audit({ actorUserId: user.id, action: "auth.mfa.disabled", targetType: "user", targetId: String(user.id) });
      clearSessionCookie(req, res);
      res.status(200).json({ success: true });
    } catch {
      res.status(401).json({ success: false, error: "Authentication is required." });
    }
  });

  app.get("/api/auth/sessions", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const sessions = await listActiveAuthSessions(user.id);
      res.status(200).json({ sessions: sessions.map((session) => ({ ...session, id: sessionHandle(session.id), ipAddress: undefined })) });
    } catch { res.status(401).json({ success: false, error: "Authentication is required." }); }
  });

  app.post("/api/auth/sessions/revoke", async (req: Request, res: Response) => {
    if (!hasValidSessionCsrf(req)) return void res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
    const parsed = sessionRevokeSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ success: false, error: "A valid session is required." });
    try {
      const user = await sdk.authenticateRequest(req);
      const target = (await listActiveAuthSessions(user.id)).find((session) => sessionHandle(session.id) === parsed.data.sessionId);
      const revoked = target ? await revokeAuthSessionById(user.id, target.id) : false;
      await audit({ actorUserId: user.id, action: "auth.session.revoked", targetType: "session", targetId: parsed.data.sessionId.slice(0, 12) + "****", outcome: revoked ? "success" : "denied" });
      res.status(revoked ? 200 : 404).json({ success: revoked });
    } catch { res.status(401).json({ success: false, error: "Authentication is required." }); }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    const email = parsed.success ? normalizeEmail(parsed.data.email) : "invalid";
    if (!(await enforceDistributedLimit(req, res, "forgot-password", email, 5))) return;
    if (consumeSensitiveRouteLimit(`forgot-password:${readClientIp(req) || "unknown"}:${email}`, 5)) {
      await auditRateLimit("forgot-password", req);
      res.status(429).json({ success: false, error: "Too many requests. Try again later." });
      return;
    }
    if (parsed.success) {
      const user = await getUserByEmail(email);
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
    const resetLimitIdentity = parsed.success ? hashOpaqueToken(parsed.data.token) : "invalid";
    if (!(await enforceDistributedLimit(req, res, "reset-password", resetLimitIdentity, 8))) return;
    if (consumeSensitiveRouteLimit(`reset-password:${readClientIp(req) || "unknown"}:${resetLimitIdentity}`, 8)) {
      await auditRateLimit("reset-password", req);
      res.status(429).json({ success: false, error: "Too many requests. Try again later." });
      return;
    }
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
    if (!hasValidSessionCsrf(req)) {
      res.status(403).json({ success: false, error: "A valid EEOS CSRF token is required." });
      return;
    }
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
