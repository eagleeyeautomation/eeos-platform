import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME, SESSION_IDLE_TIMEOUT_MS } from "../../shared/const";
import { hashOpaqueToken } from "./sessionTokens";

const db = vi.hoisted(() => ({
  createAuthSession: vi.fn(),
  getAuthSessionByTokenHash: vi.fn(),
  getUserById: vi.fn(),
  getMfaFactor: vi.fn(),
  revokeAuthSession: vi.fn(),
  touchAuthSession: vi.fn(),
  upsertUser: vi.fn(),
}));
vi.mock("../db", () => db);
vi.mock("../identity-shadow/observer", () => ({ observeIdentityShadow: vi.fn() }));

import { sdk } from "./sdk";

const token = "phase-one-session";
const now = new Date();
const account: User = {
  id: 7,
  openId: "phase-one-account",
  name: "Phase One",
  email: "phase-one@example.com",
  loginMethod: "eeos",
  role: "user",
  passwordHash: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

function request() {
  return { headers: { cookie: `${COOKIE_NAME}=${token}` } } as Request;
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    userId: account.id,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

describe("server session validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getUserById.mockResolvedValue(account);
    db.getMfaFactor.mockResolvedValue(undefined);
    db.touchAuthSession.mockResolvedValue(undefined);
    db.upsertUser.mockResolvedValue(undefined);
  });

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1) }],
    ["revoked", { revokedAt: new Date() }],
    ["idle", { lastSeenAt: new Date(Date.now() - SESSION_IDLE_TIMEOUT_MS - 1) }],
  ])("rejects a %s session without refreshing it", async (_label, overrides) => {
    db.getAuthSessionByTokenHash.mockResolvedValue(session(overrides));
    await expect(sdk.authenticateRequest(request())).rejects.toThrow();
    expect(db.touchAuthSession).not.toHaveBeenCalled();
  });

  it("rejects an inactive account even when the session is current", async () => {
    db.getAuthSessionByTokenHash.mockResolvedValue(session());
    db.getUserById.mockResolvedValue({ ...account, isActive: false });
    await expect(sdk.authenticateRequest(request())).rejects.toThrow();
    expect(db.touchAuthSession).not.toHaveBeenCalled();
  });

  it("refreshes activity only after both session and account validation succeed", async () => {
    db.getAuthSessionByTokenHash.mockResolvedValue(session());
    await expect(sdk.authenticateRequest(request())).resolves.toEqual(account);
    expect(db.touchAuthSession).toHaveBeenCalledWith(3);
  });

  it("blocks protected access until an enabled factor is verified in this session", async () => {
    db.getAuthSessionByTokenHash.mockResolvedValue(session({ mfaVerifiedAt: null }));
    db.getMfaFactor.mockResolvedValue({ enabledAt: now });
    await expect(sdk.authenticateRequest(request())).rejects.toThrow(/MFA/);
    await expect(sdk.authenticatePendingMfaRequest(request())).resolves.toEqual(account);
  });
});
