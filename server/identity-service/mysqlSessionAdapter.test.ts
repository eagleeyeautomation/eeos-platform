import type { RowDataPacket } from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { MysqlSessionIdentityAdapter, type ReadOnlyMysql } from "./mysqlSessionAdapter";
import { resolveMysqlUserSubaccounts } from "../db/mysqlIdentityAuthorization";

type Fixture = { users: any[]; links: any[]; memberships: any[]; organizations: any[]; subaccounts: any[] };
const fixture = (): Fixture => ({ users: [{ id: 1, openId: "open-1", name: "User", email: null, role: "user" }],
  links: [{ membershipId: 20, userId: 1, role: "viewer", isActive: true }], memberships: [{ id: 20, organizationId: 10 }],
  organizations: [{ id: 10, name: "Org" }], subaccounts: [{ id: 30, membershipId: 20, ghlLocationId: "loc-a", isActive: true }] });
function database(data: Fixture): ReadOnlyMysql & { statements: string[] } {
  const statements: string[] = [];
  return { statements, end: async () => {}, query: async <T extends RowDataPacket[]>(sql: string, values: unknown[] = []) => {
    statements.push(sql); const n = sql.toLowerCase(); let rows: any[] = [];
    if (n === "select 1") rows = [{ 1: 1 }];
    else if (n.includes(" from users ")) rows = data.users.filter((r) => r.openId === values[0]).slice(0, 1);
    else if (n.includes(" from membership_users ")) rows = data.links.filter((r) => r.userId === values[0] && r.isActive);
    else if (n.includes(" from memberships ")) rows = data.memberships.filter((r) => r.id === values[0]).slice(0, 1);
    else if (n.includes(" from organizations ")) rows = data.organizations.filter((r) => r.id === values[0]).slice(0, 1);
    else if (n.includes(" from subaccounts ")) rows = data.subaccounts.filter((r) => r.membershipId === values[0] && r.isActive);
    return [rows as T, []];
  } };
}

describe("MySQL session identity adapter parity fixtures", () => {
  it("matches the canonical MySQL authorization algorithm on identical fixtures", async () => {
    const data = fixture();
    data.links.push({ ...data.links[0] });
    data.subaccounts.push({ id: 31, membershipId: 20, ghlLocationId: "loc-b", isActive: true });
    const canonical = await resolveMysqlUserSubaccounts(1, {
      getActiveMembershipLinks: async (userId) => data.links.filter((row) => row.userId === userId && row.isActive),
      getMembershipById: async (id) => data.memberships.find((row) => row.id === id),
      getOrganizationById: async (id) => data.organizations.find((row) => row.id === id),
      getActiveSubaccountsByMembershipId: async (membershipId) => data.subaccounts.filter((row) => row.membershipId === membershipId && row.isActive),
    });
    const identity = await new MysqlSessionIdentityAdapter(async () => database(data)).resolve("open-1");
    const normalizeCanonical = canonical.map((row) => `${row.id}:${row.membershipId}:${row.ghlLocationId}:${row.orgName}`);
    const normalizeIdentity = identity?.scopes.map((row) => `${row.subaccountId}:${row.membershipId}:${row.ghlLocationId}:${row.orgName}`);
    expect(normalizeIdentity).toEqual(normalizeCanonical);
  });

  it("uses SELECT only and reproduces active/missing/duplicate current behavior", async () => {
    const data = fixture(); data.links.push({ ...data.links[0] }); data.links.push({ membershipId: 99, userId: 1, role: "viewer", isActive: true });
    data.links.push({ membershipId: 20, userId: 1, role: "owner", isActive: false });
    data.subaccounts.push({ id: 31, membershipId: 20, ghlLocationId: "inactive", isActive: false });
    data.organizations = [];
    const db = database(data); const result = await new MysqlSessionIdentityAdapter(async () => db).resolve("open-1");
    expect(result?.scopes).toHaveLength(2);
    expect(result?.scopes.map((row) => [row.subaccountId, row.orgName])).toEqual([[30, "Unknown"], [30, "Unknown"]]);
    expect(db.statements.every((sql) => /^SELECT\b/i.test(sql))).toBe(true);
    expect(db.statements.join(" ")).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|UPSERT)\b/i);
  });

  it("covers missing user, inactive links, inactive subaccounts, multiple subaccounts, and readiness", async () => {
    const data = fixture(); const db = database(data); const adapter = new MysqlSessionIdentityAdapter(async () => db);
    await expect(adapter.resolve("missing")).resolves.toBeUndefined();
    data.links[0].isActive = false; await expect(adapter.resolve("open-1")).resolves.toMatchObject({ scopes: [] });
    data.links[0].isActive = true; data.subaccounts.push({ id: 31, membershipId: 20, ghlLocationId: "loc-b", isActive: true });
    await expect(adapter.resolve("open-1")).resolves.toMatchObject({ scopes: [{ subaccountId: 30 }, { subaccountId: 31 }] });
    await expect(adapter.ready()).resolves.toBe(true);
  });

  it("fails closed for MySQL failure, timeout, and malformed numeric results", async () => {
    const failed = new MysqlSessionIdentityAdapter(async () => { throw new Error("offline"); });
    await expect(failed.resolve("open-1")).rejects.toMatchObject({ status: 503, code: "IDENTITY_DATABASE_UNAVAILABLE" });
    const hanging: ReadOnlyMysql = { query: async () => new Promise(() => {}), end: async () => {} };
    await expect(new MysqlSessionIdentityAdapter(async () => hanging, 5).resolve("open-1"))
      .rejects.toMatchObject({ status: 504, code: "IDENTITY_TIMEOUT" });
    const data = fixture(); data.users[0].id = "9007199254740992";
    await expect(new MysqlSessionIdentityAdapter(async () => database(data)).resolve("open-1")).rejects.toThrow(/Malformed users.id/);
  });
});
