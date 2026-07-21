import type { QueryResultRow } from "pg";
import type {
  AuthorizedSubaccount,
  CanonicalMembership,
  CanonicalMembershipUser,
  CanonicalOrganization,
  CanonicalSubaccount,
  CanonicalUser,
  IdentityRepository,
  MembershipPlan,
  MembershipStatus,
  MembershipUserRole,
  OrganizationType,
  UserRole,
  LegacySubaccountUpsert,
  LegacyUserUpsert,
} from "./identityRepository";

export type IdentityQueryable = {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: R[] }>;
};

export function parseSafeNumericId(value: string | number, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== String(value)) {
    throw new RangeError(`${field} is outside JavaScript's safe positive integer range.`);
  }
  return parsed;
}

type UserRow = QueryResultRow & {
  id: string; open_id: string; name: string | null; email: string | null;
  login_method: string | null; role: UserRole; password_hash: string | null;
  is_active: boolean; created_at: Date; updated_at: Date; last_signed_in: Date;
};

type OrganizationRow = QueryResultRow & {
  id: string; slug: string; name: string; type: OrganizationType; industry: string | null;
  website: string | null; logo_url: string | null; is_active: boolean;
  created_at: Date; updated_at: Date;
};

type MembershipRow = QueryResultRow & {
  id: string; organization_id: string; plan: MembershipPlan; status: MembershipStatus;
  ie_enabled: boolean; ie_model_version: string | null; max_subaccounts: number | null;
  billing_email: string | null; trial_ends_at: Date | null; renews_at: Date | null;
  created_at: Date; updated_at: Date;
};

type MembershipUserRow = QueryResultRow & {
  id: string; membership_id: string; user_id: string; role: MembershipUserRole;
  is_active: boolean; invited_at: Date; accepted_at: Date | null;
};

type SubaccountRow = QueryResultRow & {
  id: string; membership_id: string; ghl_location_id: string; ghl_company_id: string | null;
  name: string; timezone: string | null; is_active: boolean; ie_enabled: boolean;
  connected_at: Date; created_at: Date; updated_at: Date; org_name?: string;
};

const USER_COLUMNS = "id, open_id, name, email, login_method, role, password_hash, is_active, created_at, updated_at, last_signed_in";
const ORGANIZATION_COLUMNS = "id, slug, name, type, industry, website, logo_url, is_active, created_at, updated_at";
const MEMBERSHIP_COLUMNS = "id, organization_id, plan, status, ie_enabled, ie_model_version, max_subaccounts, billing_email, trial_ends_at, renews_at, created_at, updated_at";
const MEMBERSHIP_USER_COLUMNS = "id, membership_id, user_id, role, is_active, invited_at, accepted_at";
const SUBACCOUNT_COLUMNS = "id, membership_id, ghl_location_id, ghl_company_id, name, timezone, is_active, ie_enabled, connected_at, created_at, updated_at";

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(
    private readonly database: IdentityQueryable,
    private readonly ownerOpenId?: string,
  ) {}

  async getUserById(id: number) {
    const result = await this.database.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1 limit 1`, [id]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async getUserByOpenId(openId: string) {
    const result = await this.database.query<UserRow>(`select ${USER_COLUMNS} from users where open_id = $1 limit 1`, [openId]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async getOrganizationById(id: number) {
    const result = await this.database.query<OrganizationRow>(`select ${ORGANIZATION_COLUMNS} from organizations where id = $1 limit 1`, [id]);
    return result.rows[0] ? mapOrganization(result.rows[0]) : undefined;
  }

  async getMembershipById(id: number) {
    const result = await this.database.query<MembershipRow>(`select ${MEMBERSHIP_COLUMNS} from memberships where id = $1 limit 1`, [id]);
    return result.rows[0] ? mapMembership(result.rows[0]) : undefined;
  }

  async getActiveMembershipUsersByUserId(userId: number) {
    const result = await this.database.query<MembershipUserRow>(
      `select ${MEMBERSHIP_USER_COLUMNS} from membership_users where user_id = $1 and is_active = true`,
      [userId],
    );
    return result.rows.map(mapMembershipUser);
  }

  async getSubaccountByGhlLocationId(ghlLocationId: string) {
    const result = await this.database.query<SubaccountRow>(
      `select ${SUBACCOUNT_COLUMNS} from subaccounts where ghl_location_id = $1 limit 1`,
      [ghlLocationId],
    );
    return result.rows[0] ? mapSubaccount(result.rows[0]) : undefined;
  }

  async getActiveSubaccountsByMembershipId(membershipId: number) {
    const result = await this.database.query<SubaccountRow>(
      `select ${SUBACCOUNT_COLUMNS} from subaccounts where membership_id = $1 and is_active = true`,
      [membershipId],
    );
    return result.rows.map(mapSubaccount);
  }

  async getUserSubaccounts(userId: number) {
    const result = await this.database.query<SubaccountRow>(
      `
        select
          s.id, s.membership_id, s.ghl_location_id, s.ghl_company_id, s.name, s.timezone,
          s.is_active, s.ie_enabled, s.connected_at, s.created_at, s.updated_at,
          o.name as org_name
        from membership_users mu
        join memberships m on m.id = mu.membership_id
        left join organizations o on o.id = m.organization_id
        join subaccounts s on s.membership_id = m.id
        where mu.user_id = $1
          and mu.is_active = true
          and s.is_active = true
        order by s.id
      `,
      [userId],
    );
    return result.rows.map((row): AuthorizedSubaccount => ({ ...mapSubaccount(row), orgName: row.org_name ?? "Unknown" }));
  }

  async upsertUser(user: LegacyUserUpsert) {
    if (!user.openId) throw new Error("User openId is required for upsert");

    const insertColumns = ["open_id"];
    const insertValues: unknown[] = [user.openId];
    const updates: string[] = [];
    const addValue = (column: string, value: unknown, update = true) => {
      insertColumns.push(column);
      insertValues.push(value);
      if (update) updates.push(`${column} = excluded.${column}`);
    };

    if (user.name !== undefined) addValue("name", user.name);
    if (user.email !== undefined) addValue("email", user.email);
    if (user.loginMethod !== undefined) addValue("login_method", user.loginMethod);
    if (user.lastSignedIn !== undefined) addValue("last_signed_in", user.lastSignedIn);

    const role = user.role ?? (user.openId === this.ownerOpenId ? "admin" : undefined);
    if (role !== undefined) addValue("role", role);

    if (user.lastSignedIn === undefined) addValue("last_signed_in", new Date(), updates.length === 0);
    if (updates.length === 0) updates.push("last_signed_in = now()");

    const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");
    await this.database.query(
      `insert into users (${insertColumns.join(", ")}) values (${placeholders}) ` +
        `on conflict (open_id) do update set ${updates.join(", ")}`,
      insertValues,
    );
  }

  async upsertSubaccount(subaccount: LegacySubaccountUpsert) {
    const existing = await this.getSubaccountByGhlLocationId(subaccount.ghlLocationId);
    if (existing) {
      await this.database.query(
        `update subaccounts set name = $1, ghl_company_id = $2, is_active = $3, updated_at = now() where id = $4`,
        [
          subaccount.name ?? existing.name,
          subaccount.ghlCompanyId ?? existing.ghlCompanyId,
          subaccount.isActive ?? true,
          existing.id,
        ],
      );
      return existing.id;
    }

    const result = await this.database.query<{ id: string }>(
      `insert into subaccounts
        (membership_id, ghl_location_id, ghl_company_id, name, timezone, is_active, ie_enabled, connected_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        subaccount.membershipId,
        subaccount.ghlLocationId,
        subaccount.ghlCompanyId ?? null,
        subaccount.name,
        subaccount.timezone ?? "America/New_York",
        subaccount.isActive ?? true,
        subaccount.ieEnabled ?? true,
        subaccount.connectedAt ?? new Date(),
      ],
    );
    return parseSafeNumericId(result.rows[0].id, "subaccounts.id");
  }
}

function mapUser(row: UserRow): CanonicalUser {
  return {
    id: parseSafeNumericId(row.id, "users.id"), openId: row.open_id, name: row.name,
    email: row.email, loginMethod: row.login_method, role: row.role,
    passwordHash: row.password_hash, isActive: row.is_active, createdAt: row.created_at,
    updatedAt: row.updated_at, lastSignedIn: row.last_signed_in,
  };
}

function mapOrganization(row: OrganizationRow): CanonicalOrganization {
  return {
    id: parseSafeNumericId(row.id, "organizations.id"), slug: row.slug, name: row.name,
    type: row.type, industry: row.industry, website: row.website, logoUrl: row.logo_url,
    isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapMembership(row: MembershipRow): CanonicalMembership {
  return {
    id: parseSafeNumericId(row.id, "memberships.id"),
    organizationId: parseSafeNumericId(row.organization_id, "memberships.organization_id"),
    plan: row.plan, status: row.status, ieEnabled: row.ie_enabled,
    ieModelVersion: row.ie_model_version, maxSubaccounts: row.max_subaccounts,
    billingEmail: row.billing_email, trialEndsAt: row.trial_ends_at, renewsAt: row.renews_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapMembershipUser(row: MembershipUserRow): CanonicalMembershipUser {
  return {
    id: parseSafeNumericId(row.id, "membership_users.id"),
    membershipId: parseSafeNumericId(row.membership_id, "membership_users.membership_id"),
    userId: parseSafeNumericId(row.user_id, "membership_users.user_id"),
    role: row.role, isActive: row.is_active, invitedAt: row.invited_at, acceptedAt: row.accepted_at,
  };
}

function mapSubaccount(row: SubaccountRow): CanonicalSubaccount {
  return {
    id: parseSafeNumericId(row.id, "subaccounts.id"),
    membershipId: parseSafeNumericId(row.membership_id, "subaccounts.membership_id"),
    ghlLocationId: row.ghl_location_id, ghlCompanyId: row.ghl_company_id, name: row.name,
    timezone: row.timezone, isActive: row.is_active, ieEnabled: row.ie_enabled,
    connectedAt: row.connected_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
