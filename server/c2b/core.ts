export const C2B_CONNECTOR_CATALOG = [
  { key: "google-business-profile", name: "Google Business Profile", type: "search" },
  { key: "bing-search", name: "Bing Search", type: "search" },
  { key: "gohighlevel", name: "GoHighLevel", type: "crm" },
  { key: "csv-import", name: "CSV Import", type: "csv" },
  { key: "website-leads", name: "Existing Website Leads", type: "website" },
  { key: "public-directory", name: "Approved Public Directories", type: "directory" },
  { key: "referral-partners", name: "Referral Partner Lists", type: "referral" },
  { key: "government-public-data", name: "Government Public Data", type: "government" },
] as const;

export const INTELLIGENCE_DOMAINS = ["c2c", "c2b", "b2b"] as const;
export type IntelligenceDomain = typeof INTELLIGENCE_DOMAINS[number];

export const INTELLIGENCE_DOMAIN_CONFIG = {
  c2c: {
    label: "C2C Intelligence",
    title: "Community Intelligence Center",
    purpose: "Consumer-to-consumer referrals, community relationships, events, support networks, and human-reviewed opportunities.",
    connectorKeys: ["referral-partners", "csv-import", "website-leads", "public-directory"],
  },
  c2b: {
    label: "C2B Intelligence",
    title: "Client Acquisition Center",
    purpose: "Attributed client acquisition, qualification, prioritization, assignment, and human-approved conversion.",
    connectorKeys: C2B_CONNECTOR_CATALOG.map((connector) => connector.key),
  },
  b2b: {
    label: "B2B Intelligence",
    title: "Partnership Intelligence Center",
    purpose: "Strategic partnerships, institutions, agencies, associations, vendors, and referral relationships.",
    connectorKeys: ["google-business-profile", "bing-search", "csv-import", "public-directory", "referral-partners", "government-public-data"],
  },
} satisfies Record<IntelligenceDomain, {
  label: string;
  title: string;
  purpose: string;
  connectorKeys: readonly string[];
}>;

export function connectorsForDomain(domain: IntelligenceDomain) {
  const keys = new Set<string>(INTELLIGENCE_DOMAIN_CONFIG[domain].connectorKeys);
  return C2B_CONNECTOR_CATALOG
    .filter((connector) => keys.has(connector.key))
    .map((connector) => ({ ...connector, key: `${domain}:${connector.key}` }));
}

export type C2bScoreName =
  | "location"
  | "service"
  | "confidence"
  | "urgency"
  | "referralPotential"
  | "businessFit";

export type C2bScore = {
  value: number;
  explanation: string;
  evidence: string[];
};

export type C2bScoring = Record<C2bScoreName, C2bScore> & {
  priority: C2bScore;
};

export function validateC2bScoring(scoring: C2bScoring) {
  const entries = Object.entries(scoring);
  const errors = entries.flatMap(([name, score]) => {
    const issues: string[] = [];
    if (!Number.isInteger(score.value) || score.value < 0 || score.value > 100) {
      issues.push(`${name} must be an integer from 0 to 100`);
    }
    if (!score.explanation.trim()) issues.push(`${name} requires an explanation`);
    if (score.evidence.length === 0 || score.evidence.some((item) => !item.trim())) {
      issues.push(`${name} requires attributed supporting evidence`);
    }
    return issues;
  });
  return { valid: errors.length === 0, errors };
}

export function summarizeC2bOpportunities(opportunities: Array<{
  status: string;
  state: string | null;
  source: string;
  estimatedPipelineValue: number;
  referralPartner: boolean;
}>) {
  const count = (statuses: string[]) => opportunities.filter((item) => statuses.includes(item.status)).length;
  const group = (key: "state" | "source") => Object.entries(
    opportunities.reduce<Record<string, number>>((result, item) => {
      const label = item[key] || "Unspecified";
      result[label] = (result[label] ?? 0) + 1;
      return result;
    }, {}),
  ).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return {
    newOpportunities: count(["new"]),
    qualifiedOpportunities: count(["qualified"]),
    highPriority: count(["high_priority"]),
    pendingReview: count(["pending_review"]),
    assigned: count(["assigned"]),
    converted: count(["converted"]),
    pipelineValue: opportunities.reduce((sum, item) => sum + item.estimatedPipelineValue, 0),
    referralPartners: opportunities.filter((item) => item.referralPartner).length,
    byState: group("state"),
    bySource: group("source"),
  };
}

export const C2B_ACTION_TRANSITIONS = {
  approve: { status: "approved", ghlStatus: "approved" },
  reject: { status: "rejected", ghlStatus: "not_requested" },
  research: { status: "research", ghlStatus: "not_requested" },
  assign: { status: "assigned", ghlStatus: "not_requested" },
  create_task: { status: "assigned", ghlStatus: "not_requested" },
  convert_to_ghl: { status: "pending_ghl", ghlStatus: "queued" },
} as const;
