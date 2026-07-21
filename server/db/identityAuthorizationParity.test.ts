import { describe, expect, it } from "vitest";
import type {
  CanonicalMembership, CanonicalMembershipUser, CanonicalOrganization, CanonicalSubaccount,
  CanonicalUser, IdentityRepository, LegacySubaccountUpsert, LegacyUserUpsert,
} from "./identityRepository";
import { compareUserSubaccountsInShadow } from "./identityShadowComparison";
import { resolveMysqlUserSubaccounts } from "./mysqlIdentityAuthorization";
import { PostgresIdentityRepository, type IdentityQueryable } from "./postgresIdentityRepository";

const now = new Date("2026-07-21T12:00:00.000Z");
type Fixture = {
  users: CanonicalUser[]; organizations: CanonicalOrganization[]; memberships: CanonicalMembership[];
  membershipUsers: CanonicalMembershipUser[]; subaccounts: CanonicalSubaccount[];
};

function fixture(): Fixture {
  const user = (id: number, openId: string, role: "user" | "admin" = "user"): CanonicalUser => ({
    id, openId, name: openId, email: `${openId}@example.test`, loginMethod: "manus", role,
    passwordHash: null, isActive: true, createdAt: now, updatedAt: now, lastSignedIn: now,
  });
  const organization = (id: number, name: string, isActive = true): CanonicalOrganization => ({
    id, slug: name.toLowerCase().replaceAll(" ", "-"), name, type: "customer", industry: null,
    website: null, logoUrl: null, isActive, createdAt: now, updatedAt: now,
  });
  const membership = (id: number, organizationId: number, status: CanonicalMembership["status"] = "active"): CanonicalMembership => ({
    id, organizationId, plan: "enterprise", status, ieEnabled: true, ieModelVersion: "1.0",
    maxSubaccounts: 10, billingEmail: null, trialEndsAt: null, renewsAt: null, createdAt: now, updatedAt: now,
  });
  const link = (id: number, membershipId: number, userId: number, isActive = true): CanonicalMembershipUser => ({
    id, membershipId, userId, role: "owner", isActive, invitedAt: now, acceptedAt: now,
  });
  const subaccount = (id: number, membershipId: number, location: string, isActive = true): CanonicalSubaccount => ({
    id, membershipId, ghlLocationId: location, ghlCompanyId: null, name: location,
    timezone: "America/New_York", isActive, ieEnabled: true, connectedAt: now, createdAt: now, updatedAt: now,
  });
  return {
    users: [user(1, "admin", "admin"), user(2, "member"), user(2_147_483_647, "mysql-int-max")],
    organizations: [organization(10, "Organization A"), organization(20, "Organization B"), organization(30, "Inactive Organization", false)],
    memberships: [membership(100, 10), membership(200, 20), membership(300, 10, "suspended"), membership(400, 30), membership(500, 999)],
    membershipUsers: [link(1, 100, 1), link(2, 200, 2)],
    subaccounts: [subaccount(1000, 100, "south-carolina"), subaccount(1001, 100, "inactive-location", false), subaccount(2000, 200, "organization-b")],
  };
}

class MysqlFixtureAdapter implements IdentityRepository {
  constructor(private readonly data: Fixture, private readonly ownerOpenId = "owner") {}
  async getUserById(id: number) { return this.data.users.find((row) => row.id === id); }
  async getUserByOpenId(openId: string) { return this.data.users.find((row) => row.openId === openId); }
  async getOrganizationById(id: number) { return this.data.organizations.find((row) => row.id === id); }
  async getMembershipById(id: number) { return this.data.memberships.find((row) => row.id === id); }
  async getActiveMembershipUsersByUserId(userId: number) { return this.data.membershipUsers.filter((row) => row.userId === userId && row.isActive); }
  async getSubaccountByGhlLocationId(location: string) { return this.data.subaccounts.find((row) => row.ghlLocationId === location); }
  async getActiveSubaccountsByMembershipId(membershipId: number) { return this.data.subaccounts.filter((row) => row.membershipId === membershipId && row.isActive); }
  async getUserSubaccounts(userId: number) {
    return resolveMysqlUserSubaccounts(userId, {
      getActiveMembershipLinks: (id) => this.getActiveMembershipUsersByUserId(id),
      getMembershipById: (id) => this.getMembershipById(id),
      getOrganizationById: (id) => this.getOrganizationById(id),
      getActiveSubaccountsByMembershipId: (id) => this.getActiveSubaccountsByMembershipId(id),
    });
  }
  async upsertUser(input: LegacyUserUpsert) {
    if (!input.openId) throw new Error("User openId is required for upsert");
    const existing = await this.getUserByOpenId(input.openId);
    if (existing) {
      if (input.name !== undefined) existing.name = input.name;
      if (input.email !== undefined) existing.email = input.email;
      if (input.loginMethod !== undefined) existing.loginMethod = input.loginMethod;
      if (input.lastSignedIn !== undefined) existing.lastSignedIn = input.lastSignedIn;
      else if (input.name === undefined && input.email === undefined && input.loginMethod === undefined && input.role === undefined) existing.lastSignedIn = new Date();
      if (input.role !== undefined) existing.role = input.role;
      else if (input.openId === this.ownerOpenId) existing.role = "admin";
      return;
    }
    const nextId = Math.max(0, ...this.data.users.map((row) => row.id)) + 1;
    this.data.users.push({
      id: nextId, openId: input.openId, name: input.name ?? null, email: input.email ?? null,
      loginMethod: input.loginMethod ?? null, role: input.role ?? (input.openId === this.ownerOpenId ? "admin" : "user"),
      passwordHash: null, isActive: true, createdAt: now, updatedAt: now, lastSignedIn: input.lastSignedIn ?? new Date(),
    });
  }
  async upsertSubaccount(input: LegacySubaccountUpsert) {
    const existing = await this.getSubaccountByGhlLocationId(input.ghlLocationId);
    if (existing) {
      existing.name = input.name ?? existing.name;
      existing.ghlCompanyId = input.ghlCompanyId ?? existing.ghlCompanyId;
      existing.isActive = input.isActive ?? true;
      return existing.id;
    }
    const id = Math.max(0, ...this.data.subaccounts.map((row) => row.id)) + 1;
    this.data.subaccounts.push({ id, membershipId: input.membershipId, ghlLocationId: input.ghlLocationId,
      ghlCompanyId: input.ghlCompanyId ?? null, name: input.name, timezone: input.timezone ?? "America/New_York",
      isActive: input.isActive ?? true, ieEnabled: input.ieEnabled ?? true, connectedAt: input.connectedAt ?? now,
      createdAt: now, updatedAt: now });
    return id;
  }
}

class PostgresFixtureQueryable implements IdentityQueryable {
  constructor(private readonly data: Fixture) {}
  async query<R extends Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<{ rows: R[] }> {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    let rows: unknown[] = [];
    if (normalized.startsWith("select") && normalized.includes(" from users where id")) rows = this.data.users.filter((row) => row.id === values[0]).map(userRow);
    else if (normalized.startsWith("select") && normalized.includes(" from users where open_id")) rows = this.data.users.filter((row) => row.openId === values[0]).map(userRow);
    else if (normalized.startsWith("select") && normalized.includes(" from organizations")) rows = this.data.organizations.filter((row) => row.id === values[0]).map(organizationRow);
    else if (normalized.startsWith("select") && normalized.includes(" from memberships where id")) rows = this.data.memberships.filter((row) => row.id === values[0]).map(membershipRow);
    else if (normalized.startsWith("select") && normalized.includes(" from membership_users mu")) {
      for (const link of this.data.membershipUsers.filter((row) => row.userId === values[0] && row.isActive)) {
        const membership = this.data.memberships.find((row) => row.id === link.membershipId);
        if (!membership) continue;
        const organization = this.data.organizations.find((row) => row.id === membership.organizationId);
        rows.push(...this.data.subaccounts.filter((row) => row.membershipId === membership.id && row.isActive)
          .map((row) => ({ ...subaccountRow(row), org_name: organization?.name ?? null })));
      }
      rows.sort((a, b) => Number((a as { id: string }).id) - Number((b as { id: string }).id));
    }
    else if (normalized.startsWith("select") && normalized.includes(" from membership_users")) rows = this.data.membershipUsers.filter((row) => row.userId === values[0] && row.isActive).map(membershipUserRow);
    else if (normalized.startsWith("select") && normalized.includes(" from subaccounts where ghl_location_id")) rows = this.data.subaccounts.filter((row) => row.ghlLocationId === values[0]).map(subaccountRow);
    else if (normalized.startsWith("select") && normalized.includes(" from subaccounts where membership_id")) rows = this.data.subaccounts.filter((row) => row.membershipId === values[0] && row.isActive).map(subaccountRow);
    else if (normalized.startsWith("insert into users")) this.upsertUserSql(sql, values);
    else if (normalized.startsWith("update subaccounts")) {
      const row = this.data.subaccounts.find((item) => item.id === values[3]);
      if (row) { row.name = values[0] as string; row.ghlCompanyId = values[1] as string | null; row.isActive = values[2] as boolean; }
    } else if (normalized.startsWith("insert into subaccounts")) {
      const id = Math.max(0, ...this.data.subaccounts.map((row) => row.id)) + 1;
      this.data.subaccounts.push({ id, membershipId: values[0] as number, ghlLocationId: values[1] as string,
        ghlCompanyId: values[2] as string | null, name: values[3] as string, timezone: values[4] as string,
        isActive: values[5] as boolean, ieEnabled: values[6] as boolean, connectedAt: values[7] as Date,
        createdAt: now, updatedAt: now });
      rows = [{ id: String(id) }];
    } else throw new Error(`Unsupported fixture SQL: ${normalized}`);
    return { rows: rows as R[] };
  }
  private upsertUserSql(sql: string, values: unknown[]) {
    const columns = sql.match(/insert into users \(([^)]+)\)/i)?.[1].split(",").map((value) => value.trim()) ?? [];
    const record = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    const existing = this.data.users.find((row) => row.openId === record.open_id);
    if (existing) {
      if ("name" in record) existing.name = record.name as string | null;
      if ("email" in record) existing.email = record.email as string | null;
      if ("login_method" in record) existing.loginMethod = record.login_method as string | null;
      if ("role" in record) existing.role = record.role as "user" | "admin";
      if (/last_signed_in = excluded\.last_signed_in/i.test(sql)) existing.lastSignedIn = record.last_signed_in as Date;
      return;
    }
    const id = Math.max(0, ...this.data.users.map((row) => row.id)) + 1;
    this.data.users.push({ id, openId: record.open_id as string, name: (record.name as string | null) ?? null,
      email: (record.email as string | null) ?? null, loginMethod: (record.login_method as string | null) ?? null,
      role: (record.role as "user" | "admin") ?? "user", passwordHash: null, isActive: true,
      createdAt: now, updatedAt: now, lastSignedIn: (record.last_signed_in as Date) ?? now });
  }
}

const userRow = (r: CanonicalUser) => ({ id: String(r.id), open_id: r.openId, name: r.name, email: r.email, login_method: r.loginMethod, role: r.role, password_hash: r.passwordHash, is_active: r.isActive, created_at: r.createdAt, updated_at: r.updatedAt, last_signed_in: r.lastSignedIn });
const organizationRow = (r: CanonicalOrganization) => ({ id: String(r.id), slug: r.slug, name: r.name, type: r.type, industry: r.industry, website: r.website, logo_url: r.logoUrl, is_active: r.isActive, created_at: r.createdAt, updated_at: r.updatedAt });
const membershipRow = (r: CanonicalMembership) => ({ id: String(r.id), organization_id: String(r.organizationId), plan: r.plan, status: r.status, ie_enabled: r.ieEnabled, ie_model_version: r.ieModelVersion, max_subaccounts: r.maxSubaccounts, billing_email: r.billingEmail, trial_ends_at: r.trialEndsAt, renews_at: r.renewsAt, created_at: r.createdAt, updated_at: r.updatedAt });
const membershipUserRow = (r: CanonicalMembershipUser) => ({ id: String(r.id), membership_id: String(r.membershipId), user_id: String(r.userId), role: r.role, is_active: r.isActive, invited_at: r.invitedAt, accepted_at: r.acceptedAt });
const subaccountRow = (r: CanonicalSubaccount) => ({ id: String(r.id), membership_id: String(r.membershipId), ghl_location_id: r.ghlLocationId, ghl_company_id: r.ghlCompanyId, name: r.name, timezone: r.timezone, is_active: r.isActive, ie_enabled: r.ieEnabled, connected_at: r.connectedAt, created_at: r.createdAt, updated_at: r.updatedAt });

type Factory = (data: Fixture) => IdentityRepository;
const implementations: Array<[string, Factory]> = [
  ["authoritative MySQL algorithm fixture adapter", (data) => new MysqlFixtureAdapter(data)],
  ["PostgreSQL repository fixture adapter", (data) => new PostgresIdentityRepository(new PostgresFixtureQueryable(data), "owner")],
];

function locations(repository: IdentityRepository, userId = 1) {
  return repository.getUserSubaccounts(userId).then((rows) => rows.map((row) => `${row.ghlLocationId}:${row.orgName}`).sort());
}

describe.each(implementations)("identity authorization contract: %s", (_name, create) => {
  it("A valid authorization and multiple subaccounts", async () => {
    const data = fixture(); data.subaccounts.push({ ...data.subaccounts[0], id: 1002, ghlLocationId: "south-carolina-two" });
    await expect(locations(create(data))).resolves.toEqual(["south-carolina-two:Organization A", "south-carolina:Organization A"]);
  });
  it("B excludes inactive membership-user rows", async () => { const data = fixture(); data.membershipUsers[0].isActive = false; await expect(locations(create(data))).resolves.toEqual([]); });
  it("C excludes inactive subaccounts", async () => { const data = fixture(); data.subaccounts[0].isActive = false; await expect(locations(create(data))).resolves.toEqual([]); });
  it("D preserves access through suspended memberships", async () => { const data = fixture(); data.membershipUsers[0].membershipId = 300; data.subaccounts.push({ ...data.subaccounts[0], id: 3000, membershipId: 300, ghlLocationId: "suspended" }); await expect(locations(create(data))).resolves.toEqual(["suspended:Organization A"]); });
  it("E preserves access through inactive organizations", async () => { const data = fixture(); data.membershipUsers[0].membershipId = 400; data.subaccounts.push({ ...data.subaccounts[0], id: 4000, membershipId: 400, ghlLocationId: "inactive-org" }); await expect(locations(create(data))).resolves.toEqual(["inactive-org:Inactive Organization"]); });
  it("F isolates locations in organizations without an active link", async () => { await expect(locations(create(fixture()))).resolves.toEqual(["south-carolina:Organization A"]); });
  it("G includes only actively linked memberships", async () => { const data = fixture(); data.membershipUsers.push({ ...data.membershipUsers[0], id: 3, membershipId: 200, isActive: false }); await expect(locations(create(data))).resolves.toEqual(["south-carolina:Organization A"]); });
  it("H returns every accessible subaccount", async () => { const data = fixture(); data.subaccounts.push({ ...data.subaccounts[0], id: 1002, ghlLocationId: "second" }); await expect(locations(create(data))).resolves.toHaveLength(2); });
  it("I preserves duplicate results from duplicate membership-user rows", async () => { const data = fixture(); data.membershipUsers.push({ ...data.membershipUsers[0], id: 3 }); await expect(locations(create(data))).resolves.toEqual(["south-carolina:Organization A", "south-carolina:Organization A"]); });
  it("J skips missing memberships and retains missing organizations as Unknown", async () => { const data = fixture(); data.membershipUsers.push({ ...data.membershipUsers[0], id: 3, membershipId: 9999 }, { ...data.membershipUsers[0], id: 4, membershipId: 500 }); data.subaccounts.push({ ...data.subaccounts[0], id: 5000, membershipId: 500, ghlLocationId: "orphan-org" }); await expect(locations(create(data))).resolves.toEqual(["orphan-org:Unknown", "south-carolina:Organization A"]); });
  it("K returns undefined for missing users", async () => { await expect(create(fixture()).getUserByOpenId("missing")).resolves.toBeUndefined(); });
  it("L preserves platform admin and user roles separately", async () => { const repository = create(fixture()); await expect(repository.getUserByOpenId("admin")).resolves.toMatchObject({ role: "admin" }); await expect(repository.getUserByOpenId("member")).resolves.toMatchObject({ role: "user" }); });
  it("M preserves normal and maximum MySQL integer IDs", async () => { const repository = create(fixture()); await expect(repository.getUserById(1)).resolves.toMatchObject({ id: 1 }); await expect(repository.getUserById(2_147_483_647)).resolves.toMatchObject({ id: 2_147_483_647 }); });
  it("maps memberships and inactive location lookup without adding filters", async () => { const repository = create(fixture()); await expect(repository.getMembershipById(300)).resolves.toMatchObject({ status: "suspended" }); await expect(repository.getSubaccountByGhlLocationId("inactive-location")).resolves.toMatchObject({ isActive: false }); });
  it("preserves legacy user and subaccount upsert behavior", async () => { const repository = create(fixture()); await repository.upsertUser({ openId: "owner", email: null }); await expect(repository.getUserByOpenId("owner")).resolves.toMatchObject({ role: "admin", email: null }); const id = await repository.upsertSubaccount({ membershipId: 100, ghlLocationId: "inactive-location", name: "Reactivated" }); expect(id).toBe(1001); await expect(repository.getSubaccountByGhlLocationId("inactive-location")).resolves.toMatchObject({ name: "Reactivated", isActive: true }); });
});

describe("shadow comparison design", () => {
  it("reports only counts and non-PII fingerprints and always returns MySQL", async () => {
    const mysql = new MysqlFixtureAdapter(fixture());
    const postgresData = fixture(); postgresData.subaccounts[0].isActive = false;
    const postgres = new PostgresIdentityRepository(new PostgresFixtureQueryable(postgresData));
    const reports: unknown[] = [];
    const result = await compareUserSubaccountsInShadow(1, mysql, postgres, (event) => reports.push(event));
    expect(result).toHaveLength(1);
    expect(reports).toEqual([expect.objectContaining({ operation: "getUserSubaccounts", mysqlCount: 1, postgresCount: 0 })]);
    expect(JSON.stringify(reports)).not.toContain("south-carolina");
  });
});
