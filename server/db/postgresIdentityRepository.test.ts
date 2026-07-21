import { describe, expect, it, vi } from "vitest";
import { PostgresIdentityRepository, parseSafeNumericId, type IdentityQueryable } from "./postgresIdentityRepository";

const now = new Date("2026-07-21T00:00:00.000Z");

function repositoryWithRows(rows: Record<string, unknown>[]) {
  const query = vi.fn().mockResolvedValue({ rows });
  return { repository: new PostgresIdentityRepository({ query } as IdentityQueryable), query };
}

describe("PostgresIdentityRepository", () => {
  it("maps the canonical users table without exposing bigint strings", async () => {
    const { repository } = repositoryWithRows([{
      id: "1", open_id: "legacy-open-id", name: "Admin", email: "admin@example.com",
      login_method: "manus", role: "admin", password_hash: null, is_active: true,
      created_at: now, updated_at: now, last_signed_in: now,
    }]);
    await expect(repository.getUserByOpenId("legacy-open-id")).resolves.toMatchObject({ id: 1, openId: "legacy-open-id", role: "admin" });
  });

  it("maps the canonical organizations table", async () => {
    const { repository } = repositoryWithRows([{
      id: "2", slug: "prn-staffers", name: "PRN Staffers", type: "customer",
      industry: null, website: null, logo_url: null, is_active: true, created_at: now, updated_at: now,
    }]);
    await expect(repository.getOrganizationById(2)).resolves.toMatchObject({ id: 2, slug: "prn-staffers", type: "customer" });
  });

  it("maps the canonical memberships table without changing status semantics", async () => {
    const { repository } = repositoryWithRows([{
      id: "3", organization_id: "2", plan: "enterprise", status: "suspended", ie_enabled: true,
      ie_model_version: "1.0", max_subaccounts: 10, billing_email: null,
      trial_ends_at: null, renews_at: null, created_at: now, updated_at: now,
    }]);
    await expect(repository.getMembershipById(3)).resolves.toMatchObject({ id: 3, organizationId: 2, status: "suspended" });
  });

  it("maps only repository-selected active membership-user records", async () => {
    const { repository, query } = repositoryWithRows([{
      id: "4", membership_id: "3", user_id: "1", role: "owner", is_active: true,
      invited_at: now, accepted_at: now,
    }]);
    await expect(repository.getActiveMembershipUsersByUserId(1)).resolves.toMatchObject([{ id: 4, membershipId: 3, userId: 1, role: "owner" }]);
    expect(query.mock.calls[0][0]).toContain("is_active = true");
  });

  it("maps canonical subaccounts and preserves active filtering", async () => {
    const { repository, query } = repositoryWithRows([{
      id: "5", membership_id: "3", ghl_location_id: "loc-sc", ghl_company_id: null,
      name: "South Carolina", timezone: "America/New_York", is_active: true, ie_enabled: true,
      connected_at: now, created_at: now, updated_at: now,
    }]);
    await expect(repository.getActiveSubaccountsByMembershipId(3)).resolves.toMatchObject([{ id: 5, membershipId: 3, ghlLocationId: "loc-sc" }]);
    expect(query.mock.calls[0][0]).toContain("is_active = true");
  });

  it("preserves the current user-to-subaccount authorization filters only", async () => {
    const { repository, query } = repositoryWithRows([{
      id: "5", membership_id: "3", ghl_location_id: "loc-sc", ghl_company_id: null,
      name: "South Carolina", timezone: "America/New_York", is_active: true, ie_enabled: true,
      connected_at: now, created_at: now, updated_at: now, org_name: "PRN Staffers",
    }]);
    await expect(repository.getUserSubaccounts(1)).resolves.toMatchObject([{ membershipId: 3, ghlLocationId: "loc-sc", orgName: "PRN Staffers" }]);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("mu.is_active = true");
    expect(sql).toContain("s.is_active = true");
    expect(sql).not.toContain("m.status");
    expect(sql).not.toContain("o.is_active");
  });

  it("accepts safe bigint values and rejects unsafe or lossy serialization", () => {
    expect(parseSafeNumericId("9007199254740991", "id")).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => parseSafeNumericId("9007199254740992", "id")).toThrow(RangeError);
    expect(() => parseSafeNumericId("01", "id")).toThrow(RangeError);
    expect(() => parseSafeNumericId("0", "id")).toThrow(RangeError);
  });
});
