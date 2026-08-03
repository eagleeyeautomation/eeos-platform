import {
  assertCommercialAddonGrantAllowed,
  BASE_PLAN_VERSION,
  calculateCommercialMonthlyTotal,
  classifyOrganizationForBilling,
  COMMERCIAL_ADDONS,
  COMMERCIAL_BASE_PLANS,
  isCommercialAddonKey,
  mapLegacyPlanToBasePlan,
  resolveCommercialAddonAccess,
  type CommercialAddonKey,
  type CommercialEntitlementRecord,
} from "./commercial-addons";
import { withDatabase, withTransaction } from "./db/postgres";
import type { PoolClient } from "pg";

type CommercialOrganizationRow = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  organization_type: string;
  membership_id: string | null;
  membership_plan: string | null;
  billing_classification: CommercialEntitlementRecord["billingClassification"] | null;
  base_plan_code: CommercialEntitlementRecord["basePlanCode"] | null;
  base_plan_monthly_price: number | null;
};

type CommercialAddonRow = {
  organization_id: string;
  addon_key: CommercialAddonKey;
  status: "active" | "removed" | "expired";
  monthly_price: number;
  source: "individual" | "suite";
  starts_at: Date;
  ends_at: Date | null;
};

export async function listCommercialLicensing() {
  return withDatabase(async (client) => {
    const [organizations, addons] = await Promise.all([
      client.query<CommercialOrganizationRow>(`
        select
          o.id::text as organization_id,
          o.slug as organization_slug,
          o.name as organization_name,
          o.type::text as organization_type,
          m.id::text as membership_id,
          m.plan::text as membership_plan,
          p.billing_classification::text as billing_classification,
          p.base_plan_code::text as base_plan_code,
          p.base_plan_monthly_price
        from organizations o
        left join memberships m on m.organization_id = o.id and m.status in ('active', 'trial')
        left join commercial_organization_billing_profiles p on p.organization_id = o.id
        order by o.name asc, m.id asc
      `),
      client.query<CommercialAddonRow>(`
        select
          organization_id::text,
          addon_key::text as addon_key,
          status::text as status,
          monthly_price,
          source,
          starts_at,
          ends_at
        from commercial_membership_addons
        order by starts_at desc
      `),
    ]);

    const records = organizations.rows.map((row) => {
      const fallbackClassification = classifyOrganizationForBilling({
        slug: row.organization_slug,
        name: row.organization_name,
        organizationType: row.organization_type,
      });
      const basePlan = row.base_plan_code
        ? COMMERCIAL_BASE_PLAN_BY_CODE[row.base_plan_code]
        : mapLegacyPlanToBasePlan(row.membership_plan);
      const organizationAddons = addons.rows.filter((addon) => addon.organization_id === row.organization_id);
      const activeAddonKeys = organizationAddons
        .filter((addon) => addon.status === "active")
        .map((addon) => addon.addon_key);
      const resolvedAddonKeys = resolveCommercialAddonAccess(activeAddonKeys);
      const resolvedAddons = resolvedAddonKeys.map((key) => {
        const explicit = organizationAddons.find((addon) => addon.addon_key === key && addon.status === "active");
        const catalog = COMMERCIAL_ADDONS.find((addon) => addon.key === key)!;
        return {
          key,
          name: catalog.name,
          monthlyPrice: explicit?.monthly_price ?? catalog.monthlyPrice,
          status: "active" as const,
          source: explicit?.source ?? ("suite" as const),
          startsAt: (explicit?.starts_at ?? new Date(0)).toISOString(),
          endsAt: explicit?.ends_at?.toISOString() ?? null,
        };
      });

      return {
        organizationId: Number(row.organization_id),
        membershipId: row.membership_id ? Number(row.membership_id) : null,
        organizationSlug: row.organization_slug,
        organizationName: row.organization_name,
        billingClassification: row.billing_classification ?? fallbackClassification,
        basePlanCode: row.base_plan_code ?? basePlan?.code ?? null,
        basePlanMonthlyPrice: row.base_plan_monthly_price ?? basePlan?.monthlyPrice ?? 0,
        addons: resolvedAddons,
        totalMonthlyPrice: calculateCommercialMonthlyTotal(row.base_plan_code ?? basePlan?.code ?? null, activeAddonKeys),
        paymentProviderIntegrated: false as const,
        organizationCharged: false as const,
        externalExecutionStatus: "blocked" as const,
      } satisfies CommercialEntitlementRecord;
    });

    return {
      basePlanVersion: BASE_PLAN_VERSION,
      basePlans: COMMERCIAL_BASE_PLANS,
      addons: COMMERCIAL_ADDONS,
      organizations: records,
      controls: {
        paymentProviderIntegrated: false,
        organizationCharged: false,
        externalExecutionStatus: "blocked" as const,
      },
    };
  });
}

export async function grantCommercialAddon(input: {
  organizationId: number;
  membershipId: number;
  actorUserId: number;
  addonKey: CommercialAddonKey;
  startsAt?: Date;
  endsAt?: Date | null;
}) {
  return withTransaction(async (client) => {
    const organization = await client.query<{
      id: string;
      slug: string;
      name: string;
      type: string;
    }>("select id::text, slug, name, type::text from organizations where id = $1 limit 1", [input.organizationId]);
    const org = organization.rows[0];
    if (!org) throw new Error("Organization not found.");

    const classification = classifyOrganizationForBilling({
      slug: org.slug,
      name: org.name,
      organizationType: org.type,
    });
    assertCommercialAddonGrantAllowed(classification);

    const addon = COMMERCIAL_ADDONS.find((candidate) => candidate.key === input.addonKey);
    if (!addon) throw new Error("Unknown commercial add-on.");

    await ensureBillingProfile(client, input.organizationId, classification);
    await client.query(
      `
        insert into commercial_membership_addons (
          organization_id, membership_id, addon_key, status, monthly_price, source,
          starts_at, ends_at, granted_by_user_id
        )
        values ($1, $2, $3, 'active', $4, $5, coalesce($6, now()), $7, $8)
        on conflict (membership_id, addon_key) where status = 'active'
        do update set
          monthly_price = excluded.monthly_price,
          source = excluded.source,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          granted_by_user_id = excluded.granted_by_user_id,
          updated_at = now()
      `,
      [
        input.organizationId,
        input.membershipId,
        input.addonKey,
        addon.monthlyPrice,
        input.addonKey === "ADDON_GROWTH_INTELLIGENCE_SUITE" ? "suite" : "individual",
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.actorUserId,
      ],
    );
    await recordCommercialAddonAudit(client, {
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_addon.granted",
      addonKey: input.addonKey,
      nextValue: { status: "active", monthlyPrice: addon.monthlyPrice, charged: false },
    });
    return { granted: true, charged: false, externalExecution: "blocked" as const };
  });
}

export async function removeCommercialAddon(input: {
  organizationId: number;
  membershipId: number;
  actorUserId: number;
  addonKey: CommercialAddonKey;
}) {
  return withTransaction(async (client) => {
    await client.query(
      `
        update commercial_membership_addons
        set status = 'removed', ends_at = now(), removed_by_user_id = $4, updated_at = now()
        where organization_id = $1 and membership_id = $2 and addon_key = $3 and status = 'active'
      `,
      [input.organizationId, input.membershipId, input.addonKey, input.actorUserId],
    );
    await recordCommercialAddonAudit(client, {
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_addon.removed",
      addonKey: input.addonKey,
      nextValue: { status: "removed", charged: false },
    });
    return { removed: true, charged: false, externalExecution: "blocked" as const };
  });
}

export function parseCommercialAddonKey(value: string) {
  if (!isCommercialAddonKey(value)) throw new Error("Unsupported commercial add-on key.");
  return value;
}

const COMMERCIAL_BASE_PLAN_BY_CODE = Object.fromEntries(
  COMMERCIAL_BASE_PLANS.map((plan) => [plan.code, plan]),
) as Record<NonNullable<CommercialEntitlementRecord["basePlanCode"]>, (typeof COMMERCIAL_BASE_PLANS)[number]>;

async function ensureBillingProfile(
  client: PoolClient,
  organizationId: number,
  classification: CommercialEntitlementRecord["billingClassification"],
) {
  await client.query(
    `
      insert into commercial_organization_billing_profiles (
        organization_id, billing_classification, base_plan_code, base_plan_version,
        base_plan_monthly_price, billing_enabled, payment_provider, external_execution_enabled
      )
      select
        o.id,
        $2::eeos_billing_classification,
        case m.plan
          when 'starter' then 'FOUNDATION'::eeos_base_plan_code
          when 'trial' then 'FOUNDATION'::eeos_base_plan_code
          when 'professional' then 'INTELLIGENCE'::eeos_base_plan_code
          when 'enterprise' then 'ENTERPRISE'::eeos_base_plan_code
          else null
        end,
        $3,
        case m.plan
          when 'starter' then 99
          when 'trial' then 99
          when 'professional' then 199
          when 'enterprise' then 299
          else 0
        end,
        false,
        null,
        false
      from organizations o
      left join memberships m on m.organization_id = o.id and m.status in ('active', 'trial')
      where o.id = $1
      on conflict (organization_id) do update set
        billing_classification = excluded.billing_classification,
        base_plan_code = coalesce(commercial_organization_billing_profiles.base_plan_code, excluded.base_plan_code),
        base_plan_version = excluded.base_plan_version,
        base_plan_monthly_price = coalesce(nullif(commercial_organization_billing_profiles.base_plan_monthly_price, 0), excluded.base_plan_monthly_price),
        billing_enabled = false,
        payment_provider = null,
        external_execution_enabled = false,
        updated_at = now()
    `,
    [organizationId, classification, BASE_PLAN_VERSION],
  );
}

async function recordCommercialAddonAudit(
  client: PoolClient,
  input: {
    organizationId: number;
    membershipId: number;
    actorUserId: number;
    action: string;
    addonKey: CommercialAddonKey;
    nextValue: Record<string, unknown>;
  },
) {
  await client.query(
    `
      insert into commercial_addon_audit_events (
        organization_id, membership_id, actor_user_id, action, addon_key, previous_value, next_value
      )
      values ($1, $2, $3, $4, $5, '{}'::jsonb, $6::jsonb)
    `,
    [input.organizationId, input.membershipId, input.actorUserId, input.action, input.addonKey, JSON.stringify(input.nextValue)],
  );
}
