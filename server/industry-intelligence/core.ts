export const INDUSTRY_KEYS = ["home-care","healthcare","churches","hvac","electrical","plumbing","cleaning","construction","legal","insurance","real-estate","professional-services","manufacturing","nonprofits"] as const;
export type IndustryKey = typeof INDUSTRY_KEYS[number];
export type IndustryPack = {
  key: IndustryKey; name: string; family: "home-care" | "church" | "service-business";
  terminology: { customer: string; employee: string; opportunity: string };
  kpis: string[]; recommendations: string[]; businessRules: string[]; dashboardSections: string[];
  executiveMetrics: string[]; complianceRules: string[]; opportunityTypes: string[];
  intelligence: { c2c: string[]; c2b: string[]; b2b: string[] };
};

const service = {
  family: "service-business" as const,
  terminology: { customer: "Customer", employee: "Team Member", opportunity: "Opportunity" },
  kpis: ["Lead Flow", "Job Pipeline", "Conversion Rate", "Utilization", "Customer Retention", "Marketing ROI"],
  recommendations: ["Recover aging leads", "Balance team capacity", "Protect repeat-customer revenue"],
  businessRules: ["Flag unassigned leads", "Flag overdue jobs", "Escalate retention risk"],
  dashboardSections: ["Lead Flow", "Job Pipeline", "Team Utilization", "Customer Retention"],
  executiveMetrics: ["Revenue per job", "Pipeline value", "Capacity utilization", "Repeat customer rate"],
  complianceRules: ["Honor applicable licensing, privacy, safety, and record-retention requirements"],
  opportunityTypes: ["New Customer", "Service Expansion", "Retention", "Geographic Expansion"],
  intelligence: { c2c: ["Customer retention", "Review sentiment"], c2b: ["Lead conversion", "Service expansion"], b2b: ["Vendor capacity", "Commercial partnerships"] },
};
const homeCare = {
  family: "home-care" as const,
  terminology: { customer: "Client", employee: "Caregiver", opportunity: "Referral Opportunity" },
  kpis: ["Referral Conversion", "Caregiver Coverage", "Schedule Fill Rate", "Client Retention", "Hours of Care", "Hospital Referrals"],
  recommendations: ["Follow up on unconverted referrals", "Close caregiver coverage gaps", "Develop hospital and veteran partnerships"],
  businessRules: ["Escalate uncovered shifts", "Flag referral follow-up latency", "Monitor client retention risk"],
  dashboardSections: ["Referral Intelligence", "Scheduling Intelligence", "Caregiver Recruiting", "Agency Growth"],
  executiveMetrics: ["Active clients", "Weekly care hours", "Caregiver utilization", "Referral-to-admission conversion"],
  complianceRules: ["Protect client health information", "Track caregiver credential requirements", "Retain authorization evidence"],
  opportunityTypes: ["Hospital Partnership", "Veteran Program", "New Referral", "Caregiver Recruiting", "Community Partnership"],
  intelligence: { c2c: ["Client retention", "Family experience"], c2b: ["Referral conversion", "Veteran program eligibility"], b2b: ["Hospital partnerships", "Referral-source health"] },
};
const church = {
  family: "church" as const,
  terminology: { customer: "Member", employee: "Volunteer", opportunity: "Engagement Opportunity" },
  kpis: ["Member Growth", "Visitor Follow-up", "Volunteer Engagement", "Giving Trends", "Small Group Participation", "Event Attendance"],
  recommendations: ["Follow up with recent visitors", "Strengthen volunteer engagement", "Coordinate community outreach"],
  businessRules: ["Flag visitors without follow-up", "Monitor volunteer capacity", "Surface material giving changes without individual inference"],
  dashboardSections: ["Member Growth", "Visitor Journey", "Volunteer Engagement", "Giving Trends", "Community Outreach"],
  executiveMetrics: ["Weekly attendance", "Visitor return rate", "Volunteer participation", "Small-group engagement"],
  complianceRules: ["Restrict sensitive pastoral data", "Protect donor privacy", "Apply role-based access to member records"],
  opportunityTypes: ["Visitor Follow-up", "Volunteer Need", "Small Group", "Event", "Community Outreach"],
  intelligence: { c2c: ["Member engagement", "Visitor journey"], c2b: ["Outreach conversion", "Event participation"], b2b: ["Community partnerships", "Nonprofit collaboration"] },
};

const overlay: Record<IndustryKey, Partial<IndustryPack> & { name: string; family?: IndustryPack["family"] }> = {
  "home-care": { name: "Home Care", family: "home-care" }, "healthcare": { name: "Healthcare", family: "home-care", terminology: { customer: "Patient", employee: "Care Team Member", opportunity: "Care Opportunity" }, complianceRules: ["Protect PHI", "Apply minimum-necessary access", "Preserve clinical audit evidence"] },
  "churches": { name: "Churches", family: "church" }, "hvac": { name: "HVAC" }, "electrical": { name: "Electrical" }, "plumbing": { name: "Plumbing" }, "cleaning": { name: "Cleaning" }, "construction": { name: "Construction", kpis: ["Bid Pipeline", "Backlog", "Project Margin", "Schedule Variance", "Safety Incidents", "Change Orders"] },
  "legal": { name: "Legal", terminology: { customer: "Client", employee: "Professional", opportunity: "Matter Opportunity" }, complianceRules: ["Protect attorney-client privileged data", "Enforce ethical conflict controls", "Preserve matter audit trails"] },
  "insurance": { name: "Insurance", terminology: { customer: "Policyholder", employee: "Producer", opportunity: "Policy Opportunity" }, complianceRules: ["Protect regulated customer data", "Track licensing constraints", "Retain communication evidence"] },
  "real-estate": { name: "Real Estate", terminology: { customer: "Client", employee: "Agent", opportunity: "Transaction Opportunity" } },
  "professional-services": { name: "Professional Services", terminology: { customer: "Client", employee: "Consultant", opportunity: "Engagement Opportunity" } },
  "manufacturing": { name: "Manufacturing", terminology: { customer: "Customer", employee: "Operator", opportunity: "Production Opportunity" }, kpis: ["Throughput", "Yield", "Downtime", "On-time Delivery", "Inventory Turns", "Safety Incidents"] },
  "nonprofits": { name: "Nonprofits", family: "church", terminology: { customer: "Constituent", employee: "Team Member", opportunity: "Mission Opportunity" }, complianceRules: ["Protect donor and beneficiary privacy", "Restrict sensitive program data", "Retain grant evidence"] },
};

export const INDUSTRY_PACKS = Object.fromEntries(INDUSTRY_KEYS.map((key) => {
  const extension = overlay[key]; const base = extension.family === "home-care" ? homeCare : extension.family === "church" ? church : service;
  return [key, { ...base, ...extension, key, terminology: extension.terminology ?? base.terminology, intelligence: extension.intelligence ?? base.intelligence } as IndustryPack];
})) as Record<IndustryKey, IndustryPack>;

export function resolveIndustryContext(keys: IndustryKey[]) {
  const packs = Array.from(new Set(keys)).map((key) => INDUSTRY_PACKS[key]).filter(Boolean);
  const unique = (values: string[]) => Array.from(new Set(values));
  return {
    packs,
    kpis: unique(packs.flatMap((pack) => pack.kpis)), recommendations: unique(packs.flatMap((pack) => pack.recommendations)),
    businessRules: unique(packs.flatMap((pack) => pack.businessRules)), dashboardSections: unique(packs.flatMap((pack) => pack.dashboardSections)),
    executiveMetrics: unique(packs.flatMap((pack) => pack.executiveMetrics)), complianceRules: unique(packs.flatMap((pack) => pack.complianceRules)),
    opportunityTypes: unique(packs.flatMap((pack) => pack.opportunityTypes)),
    intelligence: { c2c: unique(packs.flatMap((pack) => pack.intelligence.c2c)), c2b: unique(packs.flatMap((pack) => pack.intelligence.c2b)), b2b: unique(packs.flatMap((pack) => pack.intelligence.b2b)) },
    terminology: packs[0]?.terminology ?? service.terminology,
  };
}

export function scoreIndustryOpportunity(input: { evidenceCount: number; strategicFit: number; conversionPotential: number; complianceRisk: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  if (input.evidenceCount < 1) return { score: 0, eligible: false, reason: "Verified evidence is required." };
  const score = Math.round(clamp(input.strategicFit) * .35 + clamp(input.conversionPotential) * .45 + (100 - clamp(input.complianceRisk)) * .2);
  return { score, eligible: input.complianceRisk < 85, reason: input.complianceRisk >= 85 ? "Compliance risk requires executive review." : "Scored from configured industry evidence." };
}
