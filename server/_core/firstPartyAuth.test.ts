import { createServer } from "http";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { registerFirstPartyAuthRoutes } from "./firstPartyAuth";
import { encryptMfaSecret, hashRecoveryCode, totpCode } from "./mfa";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { hashOpaqueToken } from "./sessionTokens";

const dbMocks = vi.hoisted(() => ({
  createAuthInvitation: vi.fn(),
  createVerifiedGhlSubaccount: vi.fn(),
  deleteVerifiedGhlSubaccount: vi.fn(),
  createAuthSession: vi.fn(),
  createPasswordResetToken: vi.fn(),
  getAuthInvitationByTokenHash: vi.fn(),
  getAuthSessionByTokenHash: vi.fn(),
  getGhlToken: vi.fn(),
  getMembershipById: vi.fn(),
  getMfaFactor: vi.fn(),
  getPasswordResetTokenByHash: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  insertAuthAuditEvent: vi.fn(),
  inspectLegacyGhlBinding: vi.fn(),
  markAuthInvitationAccepted: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  revokeAuthSession: vi.fn(),
  revokeUserAuthSessions: vi.fn(),
  touchAuthSession: vi.fn(),
  consumeMfaRecoveryCode: vi.fn(),
  disableMfaFactor: vi.fn(),
  enableMfaFactor: vi.fn(),
  listActiveAuthSessions: vi.fn(),
  markSessionMfaVerified: vi.fn(),
  revokeAuthSessionById: vi.fn(),
  savePendingMfaFactor: vi.fn(),
  updateMfaCounter: vi.fn(),
  upsertMembershipUser: vi.fn(),
  upsertUser: vi.fn(),
}));

const runtimePersistenceMocks = vi.hoisted(() => ({
  inspectRuntimeGhlBinding: vi.fn(),
  reconcileRuntimeGhlBinding: vi.fn(),
}));

const ghlTokenStoreMocks = vi.hoisted(() => ({
  storeGhlConnectionTokenWithAudit: vi.fn(),
}));

const authorizationMocks = vi.hoisted(() => ({
  listAuthorizedLocationsForMembership: vi.fn(),
  requirePlatformAdmin: vi.fn(),
  resolveAuthorizationContext: vi.fn(),
  resolveOrganizationAuthorizationContext: vi.fn(),
}));

const passwordResetEmailMocks = vi.hoisted(() => ({
  buildPasswordResetUrl: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../db/runtimePersistence", () => runtimePersistenceMocks);
vi.mock("../ghl-token-store", () => ghlTokenStoreMocks);
vi.mock("../authorization", () => authorizationMocks);
vi.mock("./passwordResetEmail", () => passwordResetEmailMocks);

const now = new Date("2026-07-23T12:00:00.000Z");

function user(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "eeos-user-1",
    name: "EEOS User",
    email: "owner@example.com",
    loginMethod: "eeos",
    role: "user",
    passwordHash: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    ...overrides,
  };
}

async function withServer<T>(callback: (baseUrl: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  registerFirstPartyAuthRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start.");
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("EEOS first-party authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-session-signing-secret-at-least-32-characters";
    process.env.EEOS_MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.EEOS_MFA_REQUIRED_ROLES = "disabled";
    dbMocks.createAuthSession.mockResolvedValue(undefined);
    dbMocks.createPasswordResetToken.mockResolvedValue(undefined);
    dbMocks.createAuthInvitation.mockResolvedValue(undefined);
    dbMocks.createVerifiedGhlSubaccount.mockResolvedValue({ created: true, id: 301 });
    dbMocks.deleteVerifiedGhlSubaccount.mockResolvedValue(undefined);
    dbMocks.getGhlToken.mockResolvedValue({ isActive: true, scope: "private_integration" });
    dbMocks.getMembershipById.mockResolvedValue({ id: 100, organizationId: 10 });
    dbMocks.getMfaFactor.mockResolvedValue(undefined);
    dbMocks.insertAuthAuditEvent.mockResolvedValue(undefined);
    dbMocks.inspectLegacyGhlBinding.mockResolvedValue({
      connection: {
        id: 3,
        providerLocationId: "cNQAsS4J15aPtGtOqgM0",
        tokenType: "private_integration",
        active: true,
      },
      subaccount: null,
    });
    runtimePersistenceMocks.inspectRuntimeGhlBinding.mockResolvedValue({
      connections: [],
      auditHistory: [],
      onboardingStates: [],
      snapshotHistory: [],
    });
    runtimePersistenceMocks.reconcileRuntimeGhlBinding.mockResolvedValue(undefined);
    ghlTokenStoreMocks.storeGhlConnectionTokenWithAudit.mockResolvedValue(undefined);
    dbMocks.markAuthInvitationAccepted.mockResolvedValue(undefined);
    dbMocks.markPasswordResetTokenUsed.mockResolvedValue(undefined);
    dbMocks.revokeAuthSession.mockResolvedValue(undefined);
    dbMocks.revokeUserAuthSessions.mockResolvedValue(undefined);
    dbMocks.touchAuthSession.mockResolvedValue(undefined);
    dbMocks.upsertMembershipUser.mockResolvedValue(undefined);
    dbMocks.upsertUser.mockResolvedValue(undefined);
    passwordResetEmailMocks.buildPasswordResetUrl.mockImplementation(
      (token: string) => `https://app.geteeos.com/reset-password?token=${encodeURIComponent(token)}`,
    );
    passwordResetEmailMocks.sendPasswordResetEmail.mockResolvedValue({
      delivered: true,
      providerMessageId: "message-1",
    });

    authorizationMocks.listAuthorizedLocationsForMembership.mockResolvedValue([{ id: "loc-sc", name: "South Carolina" }]);
    authorizationMocks.resolveAuthorizationContext.mockImplementation(async (account: User) => (
      account.role === "admin"
        ? {
            userId: String(account.id),
            role: "PLATFORM_ADMIN",
            organizationId: null,
            organizationName: "Eagle Eye Automation",
            membershipId: null,
            authorizedLocationIds: [],
          }
        : {
            userId: String(account.id),
            role: "ORGANIZATION_OWNER",
            organizationId: "10",
            organizationName: "PRN Staffers",
            membershipId: "100",
            authorizedLocationIds: ["loc-sc"],
          }
    ));
    authorizationMocks.resolveOrganizationAuthorizationContext.mockImplementation(async (account: User) => (
      account.role === "admin"
        ? null
        : {
            userId: String(account.id),
            role: "ORGANIZATION_OWNER",
            organizationId: "10",
            organizationName: "PRN Staffers",
            membershipId: "100",
            authorizedLocationIds: ["loc-sc"],
            selectedLocationId: "loc-sc",
            selectedLocationName: "South Carolina",
          }
    ));
    authorizationMocks.requirePlatformAdmin.mockImplementation(async (account: User | null | undefined) => {
      if (account?.role !== "admin") throw new Error("Platform administrator access is required.");
      return {
        userId: String(account.id),
        role: "PLATFORM_ADMIN",
        organizationId: null,
        organizationName: "Eagle Eye Automation",
        membershipId: null,
        authorizedLocationIds: [],
      };
    });
  });

  it("verifies EEOS-controlled password hashes", async () => {
    const stored = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong", stored)).resolves.toBe(false);
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
  }, 15_000);

  it("creates an opaque owner session and returns /executive-home after valid credentials", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "OWNER@example.com", password: "valid-password" }),
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({ success: true, redirectTo: "/executive-home", role: "ORGANIZATION_OWNER" });
      expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=`);
      expect(dbMocks.createAuthSession).toHaveBeenCalledWith(expect.objectContaining({
        userId: account.id,
        tokenHash: expect.any(String),
      }));
      expect(dbMocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
        openId: account.openId,
        loginMethod: "eeos",
      }));
    });
  }, 15_000);

  it("creates a platform-admin session and returns /admin", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ role: "admin", passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "valid-password" }),
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({ success: true, redirectTo: "/admin", role: "PLATFORM_ADMIN" });
      expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=`);
    });
  }, 15_000);

  it("creates only a pending session when an enabled MFA factor exists", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account); dbMocks.getUserById.mockResolvedValue(account);
    dbMocks.getMfaFactor.mockResolvedValue({ enabledAt: now });
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "valid-password" }) });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ requiresMfa: true, redirectTo: "/mfa-challenge" });
      expect(dbMocks.createAuthSession).toHaveBeenCalledWith(expect.objectContaining({ mfaVerifiedAt: null }));
    });
  }, 15_000);

  it("fails safely when role enforcement is enabled before enrollment", async () => {
    process.env.EEOS_MFA_REQUIRED_ROLES = "PLATFORM_ADMIN";
    const stored = await hashPassword("valid-password"); const account = user({ role: "admin", passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account); dbMocks.getUserById.mockResolvedValue(account);
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "valid-password" }) });
      expect(response.status).toBe(403); expect(dbMocks.createAuthSession).not.toHaveBeenCalled();
    });
  }, 15_000);

  it("uses the owner fallback instead of returning to the public homepage", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "valid-password",
          returnTo: "/",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        redirectTo: "/executive-home",
        role: "ORGANIZATION_OWNER",
      });
    });
  }, 15_000);

  it("uses the platform-admin fallback instead of returning to the public homepage", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ role: "admin", passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "valid-password",
          returnTo: "/",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        redirectTo: "/admin",
        role: "PLATFORM_ADMIN",
      });
    });
  }, 15_000);

  it("accepts valid authenticated internal return paths", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "valid-password",
          returnTo: "/ai-recommendations?priority=high",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        redirectTo: "/ai-recommendations?priority=high",
      });
    });
  }, 15_000);

  it.each([
    ["external URL", "https://example.com/redirect"],
    ["protocol-relative URL", "//example.com/redirect"],
    ["API path", "/api/private"],
  ])("rejects an unsafe %s return destination", async (_label, returnTo) => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "valid-password",
          returnTo,
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        redirectTo: "/executive-home",
      });
    });
  }, 15_000);

  it("rejects invalid passwords without issuing a session", async () => {
    const stored = await hashPassword("valid-password");
    dbMocks.getUserByEmail.mockResolvedValue(user({ passwordHash: stored }));

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@example.com", password: "wrong" }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(dbMocks.createAuthSession).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({ success: false, error: "Invalid email or password." });
    });
  }, 15_000);

  it("returns authenticated session context from a stored opaque session", async () => {
    const account = user();
    const token = "browser-session-token";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 20,
      userId: account.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        authenticated: true,
        role: "ORGANIZATION_OWNER",
        organization: { id: "10", name: "PRN Staffers" },
        ghlConnected: true,
      });
      expect(dbMocks.touchAuthSession).toHaveBeenCalledWith(20);
    });
  });

  it("enrolls MFA only from a recent authenticated session and audits both enrollment steps", async () => {
    const account = user();
    const token = "recent-session-for-mfa-enrollment";
    const session = {
      id: 30, userId: account.id, tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000), revokedAt: null, createdAt: now,
      lastSeenAt: new Date(), recentAuthAt: new Date(), mfaVerifiedAt: new Date(),
      ipAddress: null, userAgent: null,
    };
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue(session);
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const contextResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: `${COOKIE_NAME}=${token}` } });
      const context = await contextResponse.json() as { csrfToken: string };
      const start = await fetch(`${baseUrl}/api/auth/mfa/enrollment/start`, {
        method: "POST", headers: { Cookie: `${COOKIE_NAME}=${token}`, "x-eeos-csrf-token": context.csrfToken },
      });
      expect(start.status).toBe(200);
      const started = await start.json() as { provisioningUri: string };
      const secret = new URL(started.provisioningUri).searchParams.get("secret");
      expect(secret).toMatch(/^[A-Z2-7]+$/);
      expect(dbMocks.savePendingMfaFactor).toHaveBeenCalledWith(account.id, expect.stringMatching(/^v1\./));

      dbMocks.getMfaFactor.mockResolvedValue({ encryptedSecret: encryptMfaSecret(secret!), enabledAt: null, lastTotpCounter: null });
      dbMocks.enableMfaFactor.mockResolvedValue(undefined);
      const counter = Math.floor(Date.now() / 30_000);
      const confirm = await fetch(`${baseUrl}/api/auth/mfa/enrollment/confirm`, {
        method: "POST", headers: { Cookie: `${COOKIE_NAME}=${token}`, "content-type": "application/json", "x-eeos-csrf-token": context.csrfToken },
        body: JSON.stringify({ code: totpCode(secret!, counter) }),
      });
      expect(confirm.status).toBe(200);
      const confirmed = await confirm.json() as { recoveryCodes: string[] };
      expect(confirmed.recoveryCodes).toHaveLength(10);
      expect(dbMocks.enableMfaFactor).toHaveBeenCalledWith(account.id, confirmed.recoveryCodes.map(hashRecoveryCode), counter);
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.enrollment.started" }));
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.enrollment.completed" }));
    });
  });

  it("rejects MFA bypass and replay attempts while auditing the denied challenge", async () => {
    const account = user();
    const token = "pending-session-for-mfa-challenge";
    const secret = "JBSWY3DPEHPK3PXP";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 31, userId: account.id, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null, createdAt: now, lastSeenAt: new Date(), recentAuthAt: new Date(), mfaVerifiedAt: null,
      ipAddress: null, userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    dbMocks.getMfaFactor.mockResolvedValue({ encryptedSecret: encryptMfaSecret(secret), enabledAt: now, lastTotpCounter: null });
    dbMocks.consumeMfaRecoveryCode.mockResolvedValue(false);

    await withServer(async (baseUrl) => {
      const pending = await fetch(`${baseUrl}/api/auth/mfa/pending`, { headers: { Cookie: `${COOKIE_NAME}=${token}` } });
      const context = await pending.json() as { csrfToken: string };
      const invalid = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
        method: "POST", headers: { Cookie: `${COOKIE_NAME}=${token}`, "content-type": "application/json", "x-eeos-csrf-token": context.csrfToken },
        body: JSON.stringify({ code: "000000" }),
      });
      expect(invalid.status).toBe(401);
      expect(dbMocks.markSessionMfaVerified).not.toHaveBeenCalled();
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.challenge.failed" }));

      const counter = Math.floor(Date.now() / 30_000);
      dbMocks.updateMfaCounter.mockResolvedValue(false);
      const replay = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
        method: "POST", headers: { Cookie: `${COOKIE_NAME}=${token}`, "content-type": "application/json", "x-eeos-csrf-token": context.csrfToken },
        body: JSON.stringify({ code: totpCode(secret, counter) }),
      });
      expect(replay.status).toBe(401);
      expect(dbMocks.markSessionMfaVerified).not.toHaveBeenCalled();
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.challenge.replay_denied" }));
    });
  });

  it("consumes a recovery code once, marks only that pending session verified, and audits its use", async () => {
    const account = user();
    const token = "pending-session-for-recovery-code";
    const recoveryCode = "12345678-90abcdef";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 32, userId: account.id, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null, createdAt: now, lastSeenAt: new Date(), recentAuthAt: new Date(), mfaVerifiedAt: null,
      ipAddress: null, userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    dbMocks.getMfaFactor.mockResolvedValue({ encryptedSecret: encryptMfaSecret("JBSWY3DPEHPK3PXP"), enabledAt: now, lastTotpCounter: null });
    dbMocks.consumeMfaRecoveryCode.mockResolvedValue(true);
    dbMocks.markSessionMfaVerified.mockResolvedValue(undefined);

    await withServer(async (baseUrl) => {
      const pending = await fetch(`${baseUrl}/api/auth/mfa/pending`, { headers: { Cookie: `${COOKIE_NAME}=${token}` } });
      const context = await pending.json() as { csrfToken: string };
      const response = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
        method: "POST", headers: { Cookie: `${COOKIE_NAME}=${token}`, "content-type": "application/json", "x-eeos-csrf-token": context.csrfToken },
        body: JSON.stringify({ code: recoveryCode }),
      });
      expect(response.status).toBe(200);
      expect(dbMocks.consumeMfaRecoveryCode).toHaveBeenCalledWith(account.id, hashRecoveryCode(recoveryCode));
      expect(dbMocks.markSessionMfaVerified).toHaveBeenCalledWith(32);
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.recovery.used" }));
    });
  });

  it("keeps the platform role while exposing an independently validated owner context", async () => {
    const account = user({ role: "admin" });
    const token = "opaque-session-token-for-dual-role-owner";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 21,
      userId: account.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    authorizationMocks.resolveOrganizationAuthorizationContext.mockResolvedValue({
      userId: String(account.id),
      role: "ORGANIZATION_OWNER",
      organizationId: "10",
      organizationName: "PRN Staffers",
      membershipId: "100",
      authorizedLocationIds: ["loc-sc"],
      selectedLocationId: "loc-sc",
      selectedLocationName: "South Carolina",
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        authenticated: true,
        role: "PLATFORM_ADMIN",
        organizationRole: "ORGANIZATION_OWNER",
        organization: { id: "10", name: "PRN Staffers" },
        authorizedLocations: [{ id: "loc-sc", name: "South Carolina" }],
      });
    });
  });

  it("lets a platform admin enter only the organization they actively own and audits the action", async () => {
    const account = user({ role: "admin" });
    const token = "opaque-session-token-for-owner-entry";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 22,
      userId: account.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    authorizationMocks.resolveOrganizationAuthorizationContext.mockResolvedValue({
      userId: String(account.id),
      role: "ORGANIZATION_OWNER",
      organizationId: "10",
      organizationName: "PRN Staffers",
      membershipId: "100",
      authorizedLocationIds: ["loc-sc"],
      selectedLocationId: "loc-sc",
      selectedLocationName: "South Carolina",
    });

    await withServer(async (baseUrl) => {
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });
      const session = await sessionResponse.json();
      expect(session.csrfToken).toEqual(expect.any(String));

      const response = await fetch(`${baseUrl}/api/admin/organizations/10/enter`, {
        method: "POST",
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
          "x-eeos-csrf-token": session.csrfToken,
        },
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true, redirectTo: "/executive-home" });
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        actorUserId: account.id,
        organizationId: 10,
        action: "organization.context.entered",
      }));

      const crossOrganizationResponse = await fetch(`${baseUrl}/api/admin/organizations/11/enter`, {
        method: "POST",
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
          "x-eeos-csrf-token": session.csrfToken,
        },
      });
      expect(crossOrganizationResponse.status).toBe(403);
    });
  });

  it("rejects owner-context entry without a valid CSRF token", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/organizations/10/enter`, { method: "POST" });
      expect(response.status).toBe(403);
      expect(authorizationMocks.requirePlatformAdmin).not.toHaveBeenCalled();
    });
  });

  it("inspects and migrates the exact legacy Florida binding without OAuth or a provider call", async () => {
    const account = user({ role: "admin" });
    const token = "opaque-session-token-for-florida-reconciliation";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 23,
      userId: account.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    dbMocks.getGhlToken.mockResolvedValue({
      tenantId: "cNQAsS4J15aPtGtOqgM0",
      locationId: "cNQAsS4J15aPtGtOqgM0",
      accessToken: "legacy-access-token",
      refreshToken: "legacy-refresh-token",
      tokenType: "Bearer",
      scope: "private_integration",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      companyId: null,
      isActive: true,
    });
    authorizationMocks.resolveOrganizationAuthorizationContext.mockResolvedValue({
      userId: String(account.id),
      role: "ORGANIZATION_OWNER",
      organizationId: "10",
      organizationName: "PRN Staffers Inc.",
      membershipId: "100",
      authorizedLocationIds: ["loc-sc"],
      selectedLocationId: "loc-sc",
      selectedLocationName: "South Carolina",
    });

    await withServer(async (baseUrl) => {
      const inspection = await fetch(`${baseUrl}/api/admin/integrations/gohighlevel/florida-binding`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });
      expect(inspection.status).toBe(200);
      await expect(inspection.json()).resolves.toMatchObject({
        providerLocationId: "cNQAsS4J15aPtGtOqgM0",
        legacy: { connection: { id: 3 }, subaccount: null },
        runtime: { connections: [] },
      });

      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });
      const session = await sessionResponse.json();
      const response = await fetch(`${baseUrl}/api/admin/integrations/gohighlevel/florida-binding/reconcile`, {
        method: "POST",
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`,
          "x-eeos-csrf-token": session.csrfToken,
        },
      });
      expect(response.status).toBe(200);
      expect(dbMocks.createVerifiedGhlSubaccount).toHaveBeenCalledWith({
        membershipId: 100,
        providerLocationId: "cNQAsS4J15aPtGtOqgM0",
        name: "PRN Staffers FL",
        city: "Greensboro",
        state: "Florida",
      });
      expect(ghlTokenStoreMocks.storeGhlConnectionTokenWithAudit).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: "10",
        locationId: "cNQAsS4J15aPtGtOqgM0",
        operationalDivisionId: "cNQAsS4J15aPtGtOqgM0",
      }), expect.objectContaining({
        eventType: "binding.legacy_migrated",
        metadata: expect.objectContaining({ legacyConnectionId: 3, subaccountId: 301 }),
      }));
      expect(runtimePersistenceMocks.reconcileRuntimeGhlBinding).not.toHaveBeenCalled();
      expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: "gohighlevel.binding.reconciled",
      }));
    });
  });

  it("stops Florida reconciliation when the binding is already linked or ambiguous", async () => {
    const account = user({ role: "admin" });
    const token = "opaque-session-token-for-florida-stop";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 24, userId: account.id, tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
      createdAt: now, lastSeenAt: new Date(), ipAddress: null, userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(account);
    authorizationMocks.resolveOrganizationAuthorizationContext.mockResolvedValue({
      userId: String(account.id), role: "ORGANIZATION_OWNER",
      organizationId: "10", organizationName: "PRN Staffers Inc.", membershipId: "100",
      authorizedLocationIds: ["loc-sc"], selectedLocationId: "loc-sc", selectedLocationName: "South Carolina",
    });
    dbMocks.inspectLegacyGhlBinding.mockResolvedValueOnce({
      connection: { id: 3, providerLocationId: "cNQAsS4J15aPtGtOqgM0", active: true },
      subaccount: { id: 301 },
    });

    await withServer(async (baseUrl) => {
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });
      const session = await sessionResponse.json();
      const response = await fetch(`${baseUrl}/api/admin/integrations/gohighlevel/florida-binding/reconcile`, {
        method: "POST",
        headers: { Cookie: `${COOKIE_NAME}=${token}`, "x-eeos-csrf-token": session.csrfToken },
      });
      expect(response.status).toBe(409);
      expect(dbMocks.createVerifiedGhlSubaccount).not.toHaveBeenCalled();
      expect(runtimePersistenceMocks.reconcileRuntimeGhlBinding).not.toHaveBeenCalled();
    });
  });

  it("stores only the reset-token hash, uses a one-hour expiration, and sends the raw token only in the delivery URL", async () => {
    const account = user();
    dbMocks.getUserByEmail.mockResolvedValue(account);
    const requestedAt = Date.now();

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        message: "If the account exists, reset instructions will be sent.",
      });
    });

    expect(passwordResetEmailMocks.buildPasswordResetUrl).toHaveBeenCalledOnce();
    const rawToken = passwordResetEmailMocks.buildPasswordResetUrl.mock.calls[0][0] as string;
    const resetUrl = `https://app.geteeos.com/reset-password?token=${encodeURIComponent(rawToken)}`;
    expect(passwordResetEmailMocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      recipientEmail: account.email,
      resetUrl,
    });
    expect(dbMocks.createPasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: account.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: expect.any(Date),
    }));
    const storedReset = dbMocks.createPasswordResetToken.mock.calls[0][0];
    expect(JSON.stringify(storedReset)).not.toContain(rawToken);
    expect(storedReset.expiresAt.getTime()).toBeGreaterThanOrEqual(requestedAt + 60 * 60_000);
    expect(storedReset.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 60 * 60_000);
  });

  it("returns the same neutral response for a nonexistent email without creating or delivering a token", async () => {
    dbMocks.getUserByEmail.mockResolvedValue(undefined);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        message: "If the account exists, reset instructions will be sent.",
      });
    });

    expect(dbMocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(passwordResetEmailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 429 and records a sanitized security event after the password-reset request threshold", async () => {
    const email = "phase-one-rate-limit@example.com";
    dbMocks.getUserByEmail.mockResolvedValue(undefined);

    await withServer(async (baseUrl) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        expect(response.status).toBe(200);
      }
      const limited = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      expect(limited.status).toBe(429);
    });

    expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.rate_limit.triggered",
      targetType: "authentication_route",
      targetId: "forgot-password",
      metadata: expect.objectContaining({
        outcome: "denied",
        reasonCode: "RATE_LIMIT_EXCEEDED",
        sourceService: "eeos-core",
        securitySeverity: "warn",
      }),
    }));
    expect(JSON.stringify(dbMocks.insertAuthAuditEvent.mock.calls)).not.toContain(email);
  });

  it("preserves the neutral response and logs only a sanitized reason when delivery fails", async () => {
    const account = user();
    dbMocks.getUserByEmail.mockResolvedValue(account);
    passwordResetEmailMocks.sendPasswordResetEmail.mockResolvedValue({
      delivered: false,
      reason: "provider",
    });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        message: "If the account exists, reset instructions will be sent.",
      });
    });

    const rawToken = passwordResetEmailMocks.buildPasswordResetUrl.mock.calls[0][0] as string;
    expect(warning).toHaveBeenCalledWith("[PasswordResetEmail] Delivery failed: provider.");
    expect(JSON.stringify(warning.mock.calls)).not.toContain(rawToken);
    warning.mockRestore();
  });

  it("revokes all user sessions after password reset", async () => {
    const account = user();
    const token = "reset-token-value";
    dbMocks.getPasswordResetTokenByHash.mockResolvedValue({
      id: 50,
      userId: account.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: now,
    });
    dbMocks.getUserById.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "new-valid-password" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(dbMocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
        openId: account.openId,
        passwordHash: expect.any(String),
      }));
      const passwordHash = dbMocks.upsertUser.mock.calls[0][0].passwordHash;
      await expect(verifyPassword("new-valid-password", passwordHash)).resolves.toBe(true);
      expect(dbMocks.markPasswordResetTokenUsed).toHaveBeenCalledWith(50);
      expect(dbMocks.revokeUserAuthSessions).toHaveBeenCalledWith(account.id);
    });
  }, 15_000);

  it.each([
    ["missing", undefined],
    ["already used", {
      id: 51,
      userId: 1,
      tokenHash: hashOpaqueToken("reset-token-value"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      createdAt: now,
    }],
    ["expired", {
      id: 52,
      userId: 1,
      tokenHash: hashOpaqueToken("reset-token-value"),
      expiresAt: new Date(Date.now() - 1),
      usedAt: null,
      createdAt: now,
    }],
  ])("rejects a %s reset token without changing the password", async (_label, reset) => {
    dbMocks.getPasswordResetTokenByHash.mockResolvedValue(reset);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "reset-token-value", password: "new-valid-password" }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: "Reset link is invalid or expired.",
      });
    });

    expect(dbMocks.upsertUser).not.toHaveBeenCalled();
    expect(dbMocks.markPasswordResetTokenUsed).not.toHaveBeenCalled();
    expect(dbMocks.revokeUserAuthSessions).not.toHaveBeenCalled();
  });

  it("accepts invitations without returning the raw invitation token", async () => {
    const token = "invitation-token-value";
    const acceptedUser = user({ id: 2, email: "new.owner@example.com", openId: "eeos-new-owner" });
    dbMocks.getAuthInvitationByTokenHash.mockResolvedValue({
      id: 80,
      email: "new.owner@example.com",
      organizationId: 10,
      membershipId: 100,
      role: "owner",
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      invitedByUserId: 1,
      createdAt: now,
    });
    dbMocks.getUserByEmail.mockResolvedValueOnce(undefined).mockResolvedValueOnce(acceptedUser);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, displayName: "New Owner", password: "new-valid-password" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true, redirectTo: "/login" });
      expect(dbMocks.upsertMembershipUser).toHaveBeenCalledWith(100, acceptedUser.id, "owner");
      expect(dbMocks.markAuthInvitationAccepted).toHaveBeenCalledWith(80);
    });
  }, 15_000);

  it("creates admin invitations only for authenticated platform admins", async () => {
    const admin = user({ id: 9, role: "admin", openId: "eeos-admin", email: "admin@example.com" });
    const token = "admin-session-token";
    dbMocks.getAuthSessionByTokenHash.mockResolvedValue({
      id: 90,
      userId: admin.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: now,
      lastSeenAt: new Date(),
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(admin);

    await withServer(async (baseUrl) => {
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: `${COOKIE_NAME}=${token}` },
      });
      const session = await sessionResponse.json();
      const response = await fetch(`${baseUrl}/api/admin/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${COOKIE_NAME}=${token}`,
          "x-eeos-csrf-token": session.csrfToken,
        },
        body: JSON.stringify({
          email: "owner@example.com",
          organizationId: 10,
          membershipId: 100,
          role: "owner",
        }),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({ success: true, delivery: "email_provider_not_configured" });
      expect(dbMocks.createAuthInvitation).toHaveBeenCalledWith(expect.objectContaining({
        email: "owner@example.com",
        organizationId: 10,
        membershipId: 100,
        role: "owner",
        tokenHash: expect.any(String),
      }));
    });
  });

  it("rejects administrator invitation creation before authentication when CSRF is missing", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          organizationId: 10,
          membershipId: 100,
          role: "owner",
        }),
      });

      expect(response.status).toBe(403);
      expect(dbMocks.createAuthInvitation).not.toHaveBeenCalled();
      expect(authorizationMocks.requirePlatformAdmin).not.toHaveBeenCalled();
    });
  });
});
