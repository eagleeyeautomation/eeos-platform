import { createServer } from "http";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { registerFirstPartyAuthRoutes } from "./firstPartyAuth";
import { hashPassword, verifyPassword } from "./passwordAuth";

const dbMocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getUserSubaccounts: vi.fn(),
  getMembershipById: vi.fn(),
  getMembershipUser: vi.fn(),
}));

vi.mock("../db", () => dbMocks);

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
    process.env.JWT_SECRET = "first-party-test-secret";
    process.env.EEOS_SESSION_AUDIENCE = "eeos-platform";
    dbMocks.upsertUser.mockResolvedValue(undefined);
    dbMocks.getMembershipById.mockResolvedValue({ id: 100, organizationId: 10 });
    dbMocks.getMembershipUser.mockResolvedValue({ role: "owner" });
    dbMocks.getUserSubaccounts.mockResolvedValue([
      { membershipId: 100, orgName: "PRN Staffers", ghlLocationId: "loc-sc" },
    ]);
  });

  it("verifies EEOS-controlled password hashes", async () => {
    const stored = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong", stored)).resolves.toBe(false);
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
  });

  it("creates an owner session and returns /executive-home after valid credentials", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserByOpenId.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "OWNER@example.com", password: "valid-password" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true, redirectTo: "/executive-home" });
      expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=`);
      expect(dbMocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
        openId: account.openId,
        loginMethod: "eeos",
      }));
    });
  });

  it("creates a platform-admin session and returns /admin", async () => {
    const stored = await hashPassword("valid-password");
    const account = user({ role: "admin", passwordHash: stored });
    dbMocks.getUserByEmail.mockResolvedValue(account);
    dbMocks.getUserByOpenId.mockResolvedValue(account);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "valid-password" }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true, redirectTo: "/admin" });
      expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=`);
    });
  });

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
      await expect(response.json()).resolves.toEqual({ success: false, error: "Invalid email or password." });
    });
  });

  it("rejects inactive users without issuing a session", async () => {
    const stored = await hashPassword("valid-password");
    dbMocks.getUserByEmail.mockResolvedValue(user({ passwordHash: stored, isActive: false }));

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@example.com", password: "valid-password" }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    });
  });
});
