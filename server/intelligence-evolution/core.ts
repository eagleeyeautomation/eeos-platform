export const APPROVED_LEARNING_SOURCE_TYPES = [
  "operational", "user_action", "executive_decision", "opportunity_outcome",
  "connector", "crm", "financial", "marketing", "kpi", "recommendation_history",
  "business_rule",
] as const;

export type LearningSourceType = typeof APPROVED_LEARNING_SOURCE_TYPES[number];

export type ExplainableRecommendation = {
  why: string;
  evidence: string[];
  confidence: number;
  priority: number;
  businessImpact: string;
  expectedOutcome: string;
  recommendedAction: string;
  noActionConsequence: string;
  assumptions: string[];
  confidenceAnatomy: {
    overall: number;
    evidenceStrength: number;
    dataFreshness: number;
    predictionReliability: number;
    historicalAccuracy: number;
    recommendationAgeDays: number;
  };
};

export function validateLearningEvent(input: {
  sourceType: string;
  sourceReference: string;
  approved: boolean;
  evidence: string[];
}) {
  const errors: string[] = [];
  if (!APPROVED_LEARNING_SOURCE_TYPES.includes(input.sourceType as LearningSourceType)) {
    errors.push("Learning source type is not approved.");
  }
  if (!input.approved) errors.push("Learning source requires explicit approval.");
  if (!input.sourceReference.trim()) errors.push("Learning source reference is required.");
  if (!input.evidence.length || input.evidence.some((item) => !item.trim())) {
    errors.push("Attributed evidence is required.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateExplainableRecommendation(input: ExplainableRecommendation) {
  const errors: string[] = [];
  if (!input.why.trim()) errors.push("Recommendation reason is required.");
  if (!input.evidence.length || input.evidence.some((item) => !item.trim())) errors.push("Supporting evidence is required.");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 100) errors.push("Confidence must be between 0 and 100.");
  if (!Number.isFinite(input.priority) || input.priority < 0 || input.priority > 100) errors.push("Priority must be between 0 and 100.");
  if (!input.businessImpact.trim()) errors.push("Business impact is required.");
  if (!input.expectedOutcome.trim()) errors.push("Expected outcome is required.");
  if (!input.recommendedAction.trim()) errors.push("Recommended action is required.");
  if (!input.noActionConsequence.trim()) errors.push("No-action consequence is required.");
  if (!input.assumptions.length || input.assumptions.some((item) => !item.trim())) errors.push("Uncertain assumptions must be explicit.");
  for (const [name, value] of Object.entries(input.confidenceAnatomy)) {
    const valid = name === "recommendationAgeDays" ? value >= 0 : value >= 0 && value <= 100;
    if (!Number.isFinite(value) || !valid) errors.push(`${name} confidence measurement is invalid.`);
  }
  return { valid: errors.length === 0, errors };
}

export function diagnoseIntelligenceHealth(input: {
  evidenceCount: number;
  dataCompleteness: number;
  connectorHealthy: boolean;
  recommendationAgeDays: number;
  historicalAccuracy: number;
  learningOutcomeCount: number;
}) {
  const diagnostics: string[] = [];
  if (input.evidenceCount === 0) diagnostics.push("missing_evidence");
  if (input.dataCompleteness < 70) diagnostics.push("incomplete_data");
  if (!input.connectorHealthy) diagnostics.push("broken_connector");
  if (input.recommendationAgeDays > 30) diagnostics.push("stale_recommendation");
  if (input.historicalAccuracy < 50 && input.learningOutcomeCount >= 5) diagnostics.push("prediction_drift");
  if (input.learningOutcomeCount < 5) diagnostics.push("insufficient_learning_history");
  return {
    status: diagnostics.length ? "attention" as const : "healthy" as const,
    diagnostics,
    mayRecommend: input.evidenceCount > 0 && input.dataCompleteness >= 70 && input.connectorHealthy,
  };
}

export function calculateLearningProfile(outcomes: Array<{ outcomeType: string; evidence: unknown }>) {
  const verified = outcomes.filter((outcome) => Array.isArray(outcome.evidence) && outcome.evidence.length > 0);
  const successful = verified.filter((outcome) => outcome.outcomeType === "positive").length;
  const accuracyRate = verified.length ? Math.round((successful / verified.length) * 10000) / 100 : 0;
  const adjustment = verified.length >= 5 ? Math.max(-10, Math.min(10, accuracyRate - 50)) / 10 : 0;
  return {
    verifiedOutcomeCount: verified.length,
    successfulOutcomeCount: successful,
    accuracyRate,
    adjustment,
    adaptive: verified.length >= 5,
    explanation: verified.length >= 5
      ? `Adjustment is derived from ${verified.length} verified outcomes; accuracy is ${accuracyRate}%.`
      : `No model adjustment: ${verified.length} of 5 required verified outcomes are available.`,
  };
}

export function anonymizePlatformLearning(input: Array<{
  organizationId: number;
  sourceType: string;
  modelArea: string;
}>) {
  return {
    organizationsRepresented: new Set(input.map((item) => item.organizationId)).size,
    totalApprovedLearningEvents: input.length,
    bySource: Object.entries(input.reduce<Record<string, number>>((result, item) => {
      result[item.sourceType] = (result[item.sourceType] ?? 0) + 1;
      return result;
    }, {})).map(([label, value]) => ({ label, value })),
    byModelArea: Object.entries(input.reduce<Record<string, number>>((result, item) => {
      result[item.modelArea] = (result[item.modelArea] ?? 0) + 1;
      return result;
    }, {})).map(([label, value]) => ({ label, value })),
  };
}
