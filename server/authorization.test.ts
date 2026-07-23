import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

const dbMocks = vi.hoisted(() => ({
  getAllOrganizations: vi.fn(),
  getMembershipById: vi.fn(),
  getMembershipUser: vi.fn(),
  getSubaccountsByMembership: vi.fn(),
  getUserSubaccounts: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

const {
  listPlatformOrganizations,
  requireAuthorizedLocation,
  requirePlatformAdmin,
  requireWritableOrganizationRole,
  resolveAuthorizationContext,
} = await import("./authorization");

function user(role: "user" | "admin" = "user"): User {
  const now = new Date();
  return {
    id: role === "admin" ? 1 : 2,
    openId: `${role}-open-id`,
    name: role,
    email: `${role}@example.test`,
    loginMethod: "manus",
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

describe("EEOS authorization helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getMembershipById.mockResolvedValue({ id: 100, organizationId: 10 });
    dbMocks.getMembershipUser.mockResolvedValue({ role: "owner", isActive: true });
    dbMocks.getSubaccountsByMembership.mockResolvedValue([
      { ghlLocationId: "loc-a", name: "A" },
      { ghlLocationId: "loc-b", name: "B" },
    ]);
    dbMocks.getUserSubaccounts.mockResolvedValue([
      { membershipId: 100, orgName: "PRN Staffers", ghlLocationId: "loc-a" },
      { membershipId: 100, orgName: "PRN Staffers", ghlLocationId: "loc-b" },
    ]);
  });

  it("maps a platform admin to PLATFORM_ADMIN without customer locations", async () => {
    await expect(resolveAuthorizationContext(user("admin"))).resolves.toMatchObject({
      role: "PLATFORM_ADMIN",
      organizationId: null,
      authorizedLocationIds: [],
    });
  });

  it("maps an organization owner to authorized organization locations", async () => {
    await expect(resolveAuthorizationContext(user())).resolves.toMatchObject({
      role: "ORGANIZATION_OWNER",
      organizationId: "10",
      organizationName: "PRN Staffers",
      authorizedLocationIds: ["loc-a", "loc-b"],
    });
  });

  it("blocks a customer from retrieving another organization's location", async () => {
    await expect(requireAuthorizedLocation(user(), "loc-other")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a customer to retrieve an assigned location", async () => {
    await expect(requireAuthorizedLocation(user(), "loc-a")).resolves.toMatchObject({
      organizationId: "10",
    });
  });

  it("blocks read-only users from mutations", async () => {
    dbMocks.getMembershipUser.mockResolvedValue({ role: "viewer", isActive: true });

    await expect(requireWritableOrganizationRole(user())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("blocks customer roles from platform-admin organization lists", async () => {
    await expect(requirePlatformAdmin(user())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns safe organization metadata for platform admins", async () => {
    dbMocks.getAllOrganizations.mockResolvedValue([
      { id: 10, name: "PRN Staffers", slug: "prn-staffers", type: "customer", isActive: true },
    ]);

    await expect(listPlatformOrganizations(user("admin"))).resolves.toEqual([
      { id: "10", name: "PRN Staffers", slug: "prn-staffers", type: "customer", isActive: true },
    ]);
  });
});
