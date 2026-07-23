import { createServer } from "http";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { registerFirstPartyAuthRoutes } from "./firstPartyAuth";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { hashOpaqueToken } from "./sessionTokens";

const dbMocks = vi.hoisted(() => ({
  createAuthInvitation: vi.fn(),
  createAuthSession: vi.fn(),
  createPasswordResetToken: vi.fn(),
  getAuthInvitationByTokenHash: vi.fn(),
  getAuthSessionByTokenHash: vi.fn(),
  getGhlToken: vi.fn(),
  getMembershipById: vi.fn(),
  getPasswordResetTokenByHash: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  insertAuthAuditEvent: vi.fn(),
  markAuthInvitationAccepted: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  revokeAuthSession: vi.fn(),
  revokeUserAuthSessions: vi.fn(),
  touchAuthSession: vi.fn(),
  upsertMembershipUser: vi.fn(),
  upsertUser: vi.fn(),
}));

const authorizationMocks = vi.hoisted(() => ({
  listAuthorizedLocationsForMembership: vi.fn(),
  requirePlatformAdmin: vi.fn(),
  resolveAuthorizationContext: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../authorization", () => authorizationMocks);

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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("EEOS first-party authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createAuthSession.mockResolvedValue(undefined);
    dbMocks.createPasswordResetToken.mockResolvedValue(undefined);
    dbMocks.createAuthInvitation.mockResolvedValue(undefined);
    dbMocks.getGhlToken.mockResolvedValue({ isActive: true, scope: "private_integration" });
    dbMocks.getMembershipById.mockResolvedValue({ id: 100, organizationId: 10 });
    dbMocks.insertAuthAuditEvent.mockResolvedValue(undefined);
    dbMocks.markAuthInvitationAccepted.mockResolvedValue(undefined);
    dbMocks.markPasswordResetTokenUsed.mockResolvedValue(undefined);
    dbMocks.revokeAuthSession.mockResolvedValue(undefined);
    dbMocks.revokeUserAuthSessions.mockResolvedValue(undefined);
    dbMocks.touchAuthSession.mockResolvedValue(undefined);
    dbMocks.upsertMembershipUser.mockResolvedValue(undefined);
    dbMocks.upsertUser.mockResolvedValue(undefined);

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
      lastSeenAt: now,
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
      expect(dbMocks.markPasswordResetTokenUsed).toHaveBeenCalledWith(50);
      expect(dbMocks.revokeUserAuthSessions).toHaveBeenCalledWith(account.id);
    });
  }, 15_000);

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
      lastSeenAt: now,
      ipAddress: null,
      userAgent: null,
    });
    dbMocks.getUserById.mockResolvedValue(admin);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${COOKIE_NAME}=${token}`,
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
});
