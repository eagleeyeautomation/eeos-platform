export const BASE_PLAN_VERSION = 2 as const;

export const COMMERCIAL_BASE_PLANS = [
  {
    marketingName: "Starter",
    code: "FOUNDATION",
    legacyPlan: "starter",
    monthlyPrice: 99,
    description: "Single-location executive visibility foundation.",
  },
  {
    marketingName: "Growth",
    code: "INTELLIGENCE",
    legacyPlan: "professional",
    monthlyPrice: 199,
    description: "Multi-location operating intelligence for growing teams.",
  },
  {
    marketingName: "Scale",
    code: "ENTERPRISE",
    legacyPlan: "enterprise",
    monthlyPrice: 299,
    description: "Expanded executive intelligence for multi-location operators.",
  },
] as const;

export const COMMERCIAL_ADDONS = [
  {
    key: "ADDON_C2C_INTELLIGENCE",
    name: "C2C Intelligence",
    monthlyPrice: 99,
    includedInSuite: true,
    description: "Customer-to-customer relationship intelligence and referral patterns.",
  },
  {
    key: "ADDON_C2B_INTELLIGENCE",
    name: "C2B Intelligence",
    monthlyPrice: 149,
    includedInSuite: true,
    description: "Customer-to-business opportunity scoring and intake intelligence.",
  },
  {
    key: "ADDON_B2B_INTELLIGENCE",
    name: "B2B Intelligence",
    monthlyPrice: 149,
    includedInSuite: true,
    description: "Business-to-business referral, partner, and revenue-source intelligence.",
  },
  {
    key: "ADDON_GROWTH_INTELLIGENCE_SUITE",
    name: "Growth Intelligence Suite",
    monthlyPrice: 299,
    includedInSuite: false,
    description: "Bundled C2C, C2B, and B2B intelligence at one governed commercial price.",
  },
] as const;

export type CommercialAddonKey = (typeof COMMERCIAL_ADDONS)[number]["key"];
export type BasePlanCode = (typeof COMMERCIAL_BASE_PLANS)[number]["code"];
export type BillingClassification = "INTERNAL_FOUNDER" | "INTERNAL_DEMO" | "COMMERCIAL";
export type CommercialAddonStatus = "active" | "removed" | "expired";
export type ExternalExecutionStatus = "blocked";

export type CommercialOrganizationInput = {
  slug: string;
  name: string;
  organizationType: "platform_owner" | "customer" | string;
};

export type CommercialEntitlementRecord = {
  organizationId: number;
  membershipId: number | null;
  organizationSlug: string;
  organizationName: string;
  subtitle?: string | null;
  isSynthetic?: boolean;
  isTestOrganization?: boolean;
  billingExempt?: boolean;
  doNotBill?: boolean;
  licenseStatus?: "ACTIVE" | "SUSPENDED";
  connectorStatus?: "none";
  warningBanner?: {
    title: string;
    body: string;
  } | null;
  auditEvents?: Array<{
    action: string;
    addonKey: CommercialAddonKey | null;
    status: string | null;
    reason: string | null;
    source: string | null;
    effectiveEntitlements: CommercialAddonKey[];
    createdAt: string;
  }>;
  billingClassification: BillingClassification;
  basePlanCode: BasePlanCode | null;
  basePlanMonthlyPrice: number;
  addons: Array<{
    key: CommercialAddonKey;
    name: string;
    monthlyPrice: number;
    status: CommercialAddonStatus;
    source: "individual" | "suite";
    startsAt: string;
    endsAt: string | null;
  }>;
  totalMonthlyPrice: number;
  paymentProviderIntegrated: false;
  organizationCharged: false;
  externalExecutionStatus: ExternalExecutionStatus;
};

export const COMMERCIAL_LICENSING_LAB_SLUG = "eeos-commercial-licensing-lab";
export const COMMERCIAL_LICENSING_LAB_NAME = "EEOS Commercial Licensing Lab";

export function isCommercialLicensingLab(organization: Pick<CommercialOrganizationInput, "slug" | "name">) {
  const slug = organization.slug.toLowerCase();
  const name = organization.name.toLowerCase();
  return slug === COMMERCIAL_LICENSING_LAB_SLUG || name.includes("eeos commercial licensing lab");
}

const INTERNAL_ORGANIZATION_SLUGS = new Set(["eea", "eagle-eye-automation", "prn-staffers", "summit-demo"]);

export function classifyOrganizationForBilling(organization: CommercialOrganizationInput): BillingClassification {
  const slug = organization.slug.toLowerCase();
  const name = organization.name.toLowerCase();

  if (isCommercialLicensingLab(organization)) return "COMMERCIAL";
  if (slug === "summit-demo" || name.includes("summit demo")) return "INTERNAL_DEMO";
  if (organization.organizationType === "platform_owner") return "INTERNAL_FOUNDER";
  if (INTERNAL_ORGANIZATION_SLUGS.has(slug) || name.includes("prn staffers")) return "INTERNAL_FOUNDER";

  return "COMMERCIAL";
}

export function mapLegacyPlanToBasePlan(plan: string | null | undefined) {
  if (plan === "starter" || plan === "trial") return COMMERCIAL_BASE_PLANS[0];
  if (plan === "professional") return COMMERCIAL_BASE_PLANS[1];
  if (plan === "enterprise") return COMMERCIAL_BASE_PLANS[2];
  return null;
}

export function isCommercialAddonKey(value: string): value is CommercialAddonKey {
  return COMMERCIAL_ADDONS.some((addon) => addon.key === value);
}

export function resolveCommercialAddonAccess(keys: CommercialAddonKey[]) {
  const active = new Set(keys);
  if (active.has("ADDON_GROWTH_INTELLIGENCE_SUITE")) {
    for (const addon of COMMERCIAL_ADDONS) {
      if (addon.includedInSuite) active.add(addon.key);
    }
  }
  return Array.from(active);
}

export function calculateCommercialMonthlyTotal(basePlanCode: BasePlanCode | null, addonKeys: CommercialAddonKey[]) {
  const basePlan = COMMERCIAL_BASE_PLANS.find((plan) => plan.code === basePlanCode);
  const resolved = resolveCommercialAddonAccess(addonKeys);
  const suiteActive = resolved.includes("ADDON_GROWTH_INTELLIGENCE_SUITE");
  const addonTotal = resolved.reduce((total, key) => {
    const addon = COMMERCIAL_ADDONS.find((candidate) => candidate.key === key);
    if (!addon) return total;
    if (suiteActive && addon.includedInSuite) return total;
    return total + addon.monthlyPrice;
  }, 0);
  return (basePlan?.monthlyPrice ?? 0) + addonTotal;
}

export function assertCommercialAddonGrantAllowed(classification: BillingClassification) {
  if (classification !== "COMMERCIAL") {
    throw new Error("Commercial add-ons can only be granted to new external commercial organizations.");
  }
}

export function assertExternalExecutionBlocked() {
  return {
    allowed: false,
    status: "blocked" as const,
    reason: "External execution remains blocked. No payment provider is integrated and no organization is charged.",
  };
}
