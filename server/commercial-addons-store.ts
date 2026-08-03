import {
  assertCommercialAddonGrantAllowed,
  BASE_PLAN_VERSION,
  type BasePlanCode,
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
import { randomUUID } from "node:crypto";

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

const SYNTHETIC_COMMERCIAL_ORGANIZATION = {
  slug: "eeos-commercial-licensing-test",
  name: "EEOS Commercial Licensing Test",
  basePlanCode: "INTELLIGENCE" as BasePlanCode,
  basePlanLegacy: "professional",
  basePlanMonthlyPrice: 199,
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

export async function createSyntheticCommercialLicensingOrganization(input: {
  actorUserId: number;
  reason: string;
}) {
  const reason = normalizeCertificationReason(input.reason);
  return withTransaction(async (client) => {
    const organization = await client.query<{ id: string }>(
      `
        insert into organizations (slug, name, type, industry, website, logo_url, is_active)
        values ($1, $2, 'customer', 'Synthetic licensing certification', null, null, true)
        on conflict (slug) do update set
          name = excluded.name,
          type = 'customer',
          industry = excluded.industry,
          website = null,
          logo_url = null,
          is_active = true,
          updated_at = now()
        returning id::text
      `,
      [SYNTHETIC_COMMERCIAL_ORGANIZATION.slug, SYNTHETIC_COMMERCIAL_ORGANIZATION.name],
    );
    const organizationId = Number(organization.rows[0]?.id);
    if (!organizationId) throw new Error("Synthetic commercial organization could not be created.");

    const existingMembership = await client.query<{ id: string }>(
      `
        select id::text
        from memberships
        where organization_id = $1 and status in ('active', 'trial')
        order by created_at asc, id asc
        limit 1
      `,
      [organizationId],
    );
    const membership = existingMembership.rows[0] ?? (await client.query<{ id: string }>(
      `
        insert into memberships (
          organization_id, plan, status, ie_enabled, ie_model_version, max_subaccounts,
          billing_email, trial_ends_at, renews_at
        )
        values ($1, $2, 'active', true, '1.0', 0, null, null, null)
        returning id::text
      `,
      [organizationId, SYNTHETIC_COMMERCIAL_ORGANIZATION.basePlanLegacy],
    )).rows[0];
    const membershipId = Number(membership?.id);
    if (!membershipId) throw new Error("Synthetic commercial membership could not be created.");

    await client.query(
      `
        insert into commercial_organization_billing_profiles (
          organization_id, billing_classification, base_plan_code, base_plan_version,
          base_plan_monthly_price, billing_enabled, payment_provider, external_execution_enabled
        )
        values ($1, 'COMMERCIAL', $2::eeos_base_plan_code, $3, $4, false, null, false)
        on conflict (organization_id) do update set
          billing_classification = 'COMMERCIAL',
          base_plan_code = excluded.base_plan_code,
          base_plan_version = excluded.base_plan_version,
          base_plan_monthly_price = excluded.base_plan_monthly_price,
          billing_enabled = false,
          payment_provider = null,
          external_execution_enabled = false,
          updated_at = now()
      `,
      [
        organizationId,
        SYNTHETIC_COMMERCIAL_ORGANIZATION.basePlanCode,
        BASE_PLAN_VERSION,
        SYNTHETIC_COMMERCIAL_ORGANIZATION.basePlanMonthlyPrice,
      ],
    );

    await recordCommercialAddonAudit(client, {
      organizationId,
      membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_test_organization.created",
      addonKey: null,
      previousValue: {},
      nextValue: buildAuditValue({
        reason,
        status: "synthetic_created",
        synthetic: true,
        basePlanCode: SYNTHETIC_COMMERCIAL_ORGANIZATION.basePlanCode,
        billingEnabled: false,
        paymentProvider: null,
        externalExecutionEnabled: false,
        connectorStatus: "none",
        effectiveEntitlements: [],
      }),
    });

    return {
      organizationId,
      membershipId,
      organizationSlug: SYNTHETIC_COMMERCIAL_ORGANIZATION.slug,
      organizationName: SYNTHETIC_COMMERCIAL_ORGANIZATION.name,
      classification: "COMMERCIAL" as const,
      basePlanCode: SYNTHETIC_COMMERCIAL_ORGANIZATION.basePlanCode,
      charged: false,
      paymentProviderIntegrated: false,
      externalExecutionStatus: "blocked" as const,
    };
  });
}

export async function grantCommercialAddon(input: {
  organizationId: number;
  membershipId: number;
  actorUserId: number;
  addonKey: CommercialAddonKey;
  reason?: string;
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
    const beforeKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
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
    const afterKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
    await recordCommercialAddonAudit(client, {
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_addon.granted",
      addonKey: input.addonKey,
      previousValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on grant.",
        status: "before_grant",
        activeAddonKeys: beforeKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(beforeKeys),
      }),
      nextValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on grant.",
        status: "active",
        monthlyPrice: addon.monthlyPrice,
        source: input.addonKey === "ADDON_GROWTH_INTELLIGENCE_SUITE" ? "suite" : "individual",
        startsAt: (input.startsAt ?? new Date()).toISOString(),
        endsAt: input.endsAt?.toISOString() ?? null,
        charged: false,
        externalExecution: "blocked",
        activeAddonKeys: afterKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(afterKeys),
      }),
    });
    return { granted: true, charged: false, externalExecution: "blocked" as const };
  });
}

export async function removeCommercialAddon(input: {
  organizationId: number;
  membershipId: number;
  actorUserId: number;
  addonKey: CommercialAddonKey;
  reason?: string;
}) {
  return withTransaction(async (client) => {
    const beforeKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
    await client.query(
      `
        update commercial_membership_addons
        set status = 'removed', ends_at = now(), removed_by_user_id = $4, updated_at = now()
        where organization_id = $1 and membership_id = $2 and addon_key = $3 and status = 'active'
      `,
      [input.organizationId, input.membershipId, input.addonKey, input.actorUserId],
    );
    const afterKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
    await recordCommercialAddonAudit(client, {
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_addon.removed",
      addonKey: input.addonKey,
      previousValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on removal.",
        status: "before_remove",
        activeAddonKeys: beforeKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(beforeKeys),
      }),
      nextValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on removal.",
        status: "removed",
        charged: false,
        externalExecution: "blocked",
        activeAddonKeys: afterKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(afterKeys),
      }),
    });
    return { removed: true, charged: false, externalExecution: "blocked" as const };
  });
}

export async function expireCommercialAddon(input: {
  organizationId: number;
  membershipId: number;
  actorUserId: number;
  addonKey: CommercialAddonKey;
  reason?: string;
}) {
  return withTransaction(async (client) => {
    const beforeKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
    await client.query(
      `
        update commercial_membership_addons
        set status = 'expired', ends_at = now(), removed_by_user_id = $4, updated_at = now()
        where organization_id = $1 and membership_id = $2 and addon_key = $3 and status = 'active'
      `,
      [input.organizationId, input.membershipId, input.addonKey, input.actorUserId],
    );
    const afterKeys = await selectActiveCommercialAddonKeys(client, input.organizationId);
    await recordCommercialAddonAudit(client, {
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      actorUserId: input.actorUserId,
      action: "commercial_addon.expired",
      addonKey: input.addonKey,
      previousValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on expiration verification.",
        status: "before_expire",
        activeAddonKeys: beforeKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(beforeKeys),
      }),
      nextValue: buildAuditValue({
        reason: input.reason ?? "Commercial add-on expiration verification.",
        status: "expired",
        charged: false,
        externalExecution: "blocked",
        activeAddonKeys: afterKeys,
        effectiveEntitlements: resolveCommercialAddonAccess(afterKeys),
      }),
    });
    return { expired: true, charged: false, externalExecution: "blocked" as const };
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

async function selectActiveCommercialAddonKeys(client: PoolClient, organizationId: number) {
  const result = await client.query<{ addon_key: CommercialAddonKey }>(
    `
      select addon_key::text as addon_key
      from commercial_membership_addons
      where organization_id = $1 and status = 'active'
      order by starts_at asc, id asc
    `,
    [organizationId],
  );
  return result.rows.map((row) => row.addon_key);
}

function normalizeCertificationReason(reason: string) {
  const trimmed = reason.trim();
  if (trimmed.length < 20) throw new Error("A specific certification reason is required.");
  return trimmed.slice(0, 500);
}

function buildAuditValue(value: Record<string, unknown>) {
  return {
    ...value,
    safeCorrelationId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

async function recordCommercialAddonAudit(
  client: PoolClient,
  input: {
    organizationId: number;
    membershipId: number;
    actorUserId: number;
    action: string;
    addonKey: CommercialAddonKey | null;
    previousValue: Record<string, unknown>;
    nextValue: Record<string, unknown>;
  },
) {
  await client.query(
    `
      insert into commercial_addon_audit_events (
        organization_id, membership_id, actor_user_id, action, addon_key, previous_value, next_value
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
    `,
    [
      input.organizationId,
      input.membershipId,
      input.actorUserId,
      input.action,
      input.addonKey,
      JSON.stringify(input.previousValue),
      JSON.stringify(input.nextValue),
    ],
  );
}
