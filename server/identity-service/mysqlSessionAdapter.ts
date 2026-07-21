import type { Pool, RowDataPacket } from "mysql2/promise";
import type { MembershipUserRole, UserRole } from "../db/identityRepository";
import { IdentityServiceError } from "./errors";

export type SessionIdentityUser = { id: number; openId: string; name: string | null; email: string | null; role: UserRole };
export type SessionIdentityScope = {
  organizationId: number;
  membershipId: number;
  subaccountId: number;
  membershipRole: MembershipUserRole;
  ghlLocationId: string;
  orgName: string;
};
export type SessionIdentityContext = { user: SessionIdentityUser; scopes: SessionIdentityScope[] };

export interface SessionIdentityAdapter {
  resolve(openId: string): Promise<SessionIdentityContext | undefined>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export type ReadOnlyMysql = { query<T extends RowDataPacket[]>(sql: string, values?: unknown[]): Promise<[T, unknown]>; end(): Promise<void> };
export type MysqlFactory = () => Promise<ReadOnlyMysql>;

const integer = (value: unknown, field: string) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`Malformed ${field}`);
  return parsed;
};

export class MysqlSessionIdentityAdapter implements SessionIdentityAdapter {
  private database?: Promise<ReadOnlyMysql>;
  constructor(private readonly factory: MysqlFactory, private readonly timeoutMs = 5_000) {}

  private connection() { return this.database ??= this.factory(); }
  private async query<T extends RowDataPacket[]>(sql: string, values: unknown[] = []): Promise<T> {
    try {
      const database = await this.connection();
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          database.query<T>(sql, values).then(([rows]) => rows),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new IdentityServiceError(504, "IDENTITY_TIMEOUT", "Identity request timed out.", true)), this.timeoutMs); }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    } catch (error) {
      if (error instanceof IdentityServiceError) throw error;
      throw new IdentityServiceError(503, "IDENTITY_DATABASE_UNAVAILABLE", "Identity database is not available.", true);
    }
  }

  async resolve(openId: string): Promise<SessionIdentityContext | undefined> {
    const users = await this.query<RowDataPacket[]>(
      "SELECT id, openId, name, email, role FROM users WHERE openId = ? LIMIT 1", [openId],
    );
    if (users.length === 0) return undefined;
    const row = users[0];
    if (!row || typeof row.openId !== "string" || !["user", "admin"].includes(row.role)) throw new Error("Malformed users result");
    const user: SessionIdentityUser = {
      id: integer(row.id, "users.id"), openId: row.openId,
      name: typeof row.name === "string" ? row.name : null,
      email: typeof row.email === "string" ? row.email : null,
      role: row.role as UserRole,
    };
    const links = await this.query<RowDataPacket[]>(
      "SELECT membershipId, role FROM membership_users WHERE userId = ? AND isActive = true", [user.id],
    );
    const scopes: SessionIdentityScope[] = [];
    for (const link of links) {
      const membershipId = integer(link.membershipId, "membership_users.membershipId");
      if (!["owner", "executive", "analyst", "viewer"].includes(link.role)) throw new Error("Malformed membership_users result");
      const memberships = await this.query<RowDataPacket[]>(
        "SELECT id, organizationId FROM memberships WHERE id = ? LIMIT 1", [membershipId],
      );
      if (memberships.length === 0) continue;
      const membership = memberships[0];
      if (!membership) continue;
      const organizationId = integer(membership.organizationId, "memberships.organizationId");
      const organizations = await this.query<RowDataPacket[]>(
        "SELECT id, name FROM organizations WHERE id = ? LIMIT 1", [organizationId],
      );
      const orgName = typeof organizations[0]?.name === "string" ? organizations[0].name : "Unknown";
      const subaccounts = await this.query<RowDataPacket[]>(
        "SELECT id, membershipId, ghlLocationId FROM subaccounts WHERE membershipId = ? AND isActive = true", [membershipId],
      );
      for (const subaccount of subaccounts) {
        if (typeof subaccount.ghlLocationId !== "string" || subaccount.ghlLocationId.length === 0) throw new Error("Malformed subaccounts result");
        scopes.push({ organizationId, membershipId, subaccountId: integer(subaccount.id, "subaccounts.id"),
          membershipRole: link.role as MembershipUserRole, ghlLocationId: subaccount.ghlLocationId, orgName });
      }
    }
    return { user, scopes };
  }

  async ready() { try { await this.query<RowDataPacket[]>("SELECT 1"); return true; } catch { return false; } }
  async close() { if (this.database) await (await this.database).end(); }
}

export function createMysqlFactory(databaseUrl: string, connectTimeout: number): MysqlFactory {
  return async () => {
    const { createPool } = await import("mysql2/promise");
    return createPool({ uri: databaseUrl, connectTimeout, waitForConnections: true, connectionLimit: 5, enableKeepAlive: true }) as unknown as ReadOnlyMysql;
  };
}
