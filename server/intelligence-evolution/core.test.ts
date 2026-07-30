import { describe, expect, it } from "vitest";
import {
  anonymizePlatformLearning,
  calculateLearningProfile,
  diagnoseIntelligenceHealth,
  validateExplainableRecommendation,
  validateLearningEvent,
} from "./core";

describe("continuous intelligence evolution", () => {
  it("rejects unauthorized or unattributed learning", () => {
    expect(validateLearningEvent({ sourceType: "private_other_customer", sourceReference: "", approved: false, evidence: [] }).valid).toBe(false);
  });

  it("requires every explanation field", () => {
    expect(validateExplainableRecommendation({
      why: "", evidence: [], confidence: 110, priority: 50,
      businessImpact: "", expectedOutcome: "", recommendedAction: "",
      noActionConsequence: "", assumptions: [],
      confidenceAnatomy: { overall: 110, evidenceStrength: 0, dataFreshness: 0, predictionReliability: 0, historicalAccuracy: 0, recommendationAgeDays: -1 },
    }).valid).toBe(false);
  });

  it("blocks recommendations when evidence, completeness, or connectors fail", () => {
    expect(diagnoseIntelligenceHealth({
      evidenceCount: 0, dataCompleteness: 40, connectorHealthy: false,
      recommendationAgeDays: 45, historicalAccuracy: 30, learningOutcomeCount: 6,
    })).toMatchObject({
      status: "attention",
      mayRecommend: false,
      diagnostics: expect.arrayContaining(["missing_evidence", "broken_connector", "stale_recommendation", "prediction_drift"]),
    });
  });

  it("does not adjust models before verified evidence thresholds", () => {
    expect(calculateLearningProfile([{ outcomeType: "positive", evidence: ["CRM outcome"] }])).toMatchObject({ adaptive: false, adjustment: 0 });
  });

  it("derives bounded adjustment from verified outcomes", () => {
    const profile = calculateLearningProfile(Array.from({ length: 5 }, () => ({ outcomeType: "positive", evidence: ["Verified outcome"] })));
    expect(profile).toMatchObject({ adaptive: true, accuracyRate: 100, adjustment: 1 });
  });

  it("returns platform aggregates without organization identities or evidence", () => {
    const aggregate = anonymizePlatformLearning([
      { organizationId: 1, sourceType: "crm", modelArea: "scoring" },
      { organizationId: 2, sourceType: "crm", modelArea: "risk" },
    ]);
    expect(aggregate.organizationsRepresented).toBe(2);
    expect(JSON.stringify(aggregate)).not.toContain("organizationId");
  });
});
