import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapPlatformAdmin } from "./bootstrapPlatformAdmin";

const dbMocks = vi.hoisted(() => ({
  countPlatformAdmins: vi.fn(),
  getUserByEmail: vi.fn(),
  insertAuthAuditEvent: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("../db", () => dbMocks);

describe("bootstrapPlatformAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.countPlatformAdmins.mockResolvedValue(0);
    dbMocks.getUserByEmail.mockResolvedValue({ id: 1, openId: "eeos-admin" });
    dbMocks.insertAuthAuditEvent.mockResolvedValue(undefined);
    dbMocks.upsertUser.mockResolvedValue(undefined);
  });

  it("creates the first platform admin from environment values", async () => {
    const result = await bootstrapPlatformAdmin({
      INITIAL_PLATFORM_ADMIN_EMAIL: "ADMIN@EXAMPLE.COM",
      INITIAL_PLATFORM_ADMIN_PASSWORD: "strong-admin-password",
      INITIAL_PLATFORM_ADMIN_NAME: "Admin User",
    });

    expect(result).toEqual({ email: "admin@example.com", userId: 1 });
    expect(dbMocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      loginMethod: "eeos",
      isActive: true,
      passwordHash: expect.any(String),
    }));
    expect(dbMocks.insertAuthAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.platform_admin.bootstrap",
      targetType: "user",
    }));
  });

  it("refuses to run after a platform admin exists", async () => {
    dbMocks.countPlatformAdmins.mockResolvedValue(1);

    await expect(bootstrapPlatformAdmin({
      INITIAL_PLATFORM_ADMIN_EMAIL: "admin@example.com",
      INITIAL_PLATFORM_ADMIN_PASSWORD: "strong-admin-password",
    })).rejects.toThrow("A platform admin already exists");

    expect(dbMocks.upsertUser).not.toHaveBeenCalled();
  });

  it("requires a production-strength password", async () => {
    await expect(bootstrapPlatformAdmin({
      INITIAL_PLATFORM_ADMIN_EMAIL: "admin@example.com",
      INITIAL_PLATFORM_ADMIN_PASSWORD: "short",
    })).rejects.toThrow("Password must be at least 12 characters.");
  });
});
