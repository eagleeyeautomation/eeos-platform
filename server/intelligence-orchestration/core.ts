export const INTELLIGENCE_CATEGORIES = ["risk", "growth", "marketing", "financial", "staffing", "customer", "referral", "connector", "operations", "identity", "audit"] as const;
export const GRAPH_ENTITY_TYPES = ["organization", "location", "user", "department", "client", "employee", "partner", "referral", "vendor", "connector", "recommendation", "business_event", "timeline_event", "kpi", "goal", "risk", "opportunity"] as const;

export type IntelligenceCategory = typeof INTELLIGENCE_CATEGORIES[number];
export type GraphEntityType = typeof GRAPH_ENTITY_TYPES[number];
export type PriorityFactors = {
  businessImpact: number; financialValue: number; operationalImpact: number;
  strategicValue: number; risk: number; urgency: number; confidence: number;
};

export type IntelligenceEntity = { type: GraphEntityType; key: string; name: string; attributes?: Record<string, unknown> };
export type IntelligenceRelationship = { from: Pick<IntelligenceEntity, "type" | "key">; to: Pick<IntelligenceEntity, "type" | "key">; type: string; attributes?: Record<string, unknown> };
export type IntelligenceEvent = {
  id: string; organizationId: string; locationId?: string; producer: string; type: string;
  category: IntelligenceCategory; occurredAt: string; subject?: IntelligenceEntity;
  entities?: IntelligenceEntity[]; relationships?: IntelligenceRelationship[];
  payload: Record<string, unknown>; evidence: string[]; correlationId?: string;
  recommendation?: { key: string; title: string; summary: string; action: string; factors: PriorityFactors; consumers?: string[] };
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function calculateExecutivePriority(factors: PriorityFactors) {
  const normalized = Object.fromEntries(Object.entries(factors).map(([key, value]) => [key, clamp(value)])) as PriorityFactors;
  const score = clamp(
    normalized.businessImpact * .2 + normalized.financialValue * .15 + normalized.operationalImpact * .15 +
    normalized.strategicValue * .15 + normalized.risk * .15 + normalized.urgency * .1 + normalized.confidence * .1,
  );
  return { score, components: normalized };
}

export function validateIntelligenceEvent(event: IntelligenceEvent) {
  const errors: string[] = [];
  if (!event.id.trim()) errors.push("Event id is required.");
  if (!event.organizationId.trim()) errors.push("Organization id is required.");
  if (!event.producer.trim()) errors.push("Producer is required.");
  if (!event.type.trim()) errors.push("Event type is required.");
  if (!INTELLIGENCE_CATEGORIES.includes(event.category)) errors.push("Unsupported intelligence category.");
  if (!Number.isFinite(Date.parse(event.occurredAt))) errors.push("occurredAt must be an ISO timestamp.");
  if (event.recommendation && event.evidence.length === 0) errors.push("Recommendations require supporting evidence.");
  if (event.recommendation?.factors.confidence === 0) errors.push("Recommendations require non-zero confidence.");
  return { valid: errors.length === 0, errors };
}

export function buildGroundedCopilotAnswer(question: string, context: {
  priorities: Array<{ title: string; summary: string; recommendedAction: string; confidence: number; evidence: string[] }>;
  risks: Array<{ title: string; summary: string; confidence: number; evidence: string[] }>;
  opportunities: Array<{ title: string; summary: string; confidence: number; evidence: string[] }>;
  eventCount: number;
}) {
  const normalized = question.toLowerCase();
  const source = normalized.includes("risk") ? context.risks : normalized.includes("growth") || normalized.includes("opportun") ? context.opportunities : context.priorities;
  if (source.length === 0) return { answer: "I don't have enough authorized, verified organizational evidence to answer that yet.", confidence: 0, evidence: [] as string[], grounded: true };
  const top = source[0];
  const action = "recommendedAction" in top ? ` Recommended action: ${top.recommendedAction}` : "";
  return {
    answer: `${top.title}: ${top.summary}${action}`,
    confidence: top.confidence,
    evidence: top.evidence,
    grounded: true,
  };
}
