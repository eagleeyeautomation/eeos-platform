import { describe, expect, it } from "vitest";
import { athenaLearningInternals, type AthenaLearningContext, type RecommendationMeasurementRecord } from "./athena-learning";

function measurement(overrides: Partial<RecommendationMeasurementRecord> = {}): RecommendationMeasurementRecord {
  return {
    id: "measurement-1",
    businessId: "business-a",
    recommendationId: "sales-high-open-opportunity-volume",
    metricName: "Open opportunities reviewed",
    baselineValue: 0,
    targetValue: 10,
    actualValue: 10,
    unit: "count",
    measurementSource: "user-entered evidence",
    measuredAt: "2026-07-14T12:00:00.000Z",
    verified: false,
    verificationEvidence: "",
    createdAt: "2026-07-14T12:00:00.000Z",
    updatedAt: "2026-07-14T12:00:00.000Z",
    ...overrides,
  };
}

function learningContext(overrides: Partial<AthenaLearningContext> = {}): AthenaLearningContext {
  return {
    businessId: "business-a",
    feedback: [],
    measurements: [],
    lessons: [],
    profiles: [{
      id: "profile-1",
      businessId: "business-a",
      category: "sales",
      evidenceCount: 0,
      successfulOutcomeCount: 0,
      unsuccessfulOutcomeCount: 0,
      inconclusiveOutcomeCount: 0,
      reliabilityScore: 0,
      lastUpdatedAt: "2026-07-14T12:00:00.000Z",
    }],
    adaptiveLearningReady: false,
    adaptiveLearningReason: "Insufficient verified outcome history for adaptive learning.",
    ...overrides,
  };
}

describe("Athena Learning Loop gates", () => {
  it("defaults weak or unverified evidence to inconclusive", () => {
    expect(athenaLearningInternals.classifyOutcome([measurement()])).toBe("inconclusive");
  });

  it("classifies successful outcomes only with verified evidence", () => {
    expect(athenaLearningInternals.classifyOutcome([
      measurement({ verified: true, verificationEvidence: "Executive confirmed CRM review completed.", actualValue: 12, targetValue: 10 }),
    ])).toBe("successful");
  });

  it("enforces learning profile thresholds", () => {
    expect(athenaLearningInternals.calculateReliabilityScore({
      evidenceCount: 4,
      successfulOutcomeCount: 2,
      unsuccessfulOutcomeCount: 0,
      inconclusiveOutcomeCount: 0,
      verifiedCount: 4,
    })).toBe(0);

    expect(athenaLearningInternals.calculateReliabilityScore({
      evidenceCount: 5,
      successfulOutcomeCount: 3,
      unsuccessfulOutcomeCount: 2,
      inconclusiveOutcomeCount: 0,
      verifiedCount: 5,
    })).toBeGreaterThan(0);
  });

  it("caps confidence and ranking adjustments", () => {
    const context = learningContext({
      profiles: [{
        id: "profile-1",
        businessId: "business-a",
        category: "sales",
        evidenceCount: 10,
        successfulOutcomeCount: 5,
        unsuccessfulOutcomeCount: 0,
        inconclusiveOutcomeCount: 0,
        reliabilityScore: 90,
        lastUpdatedAt: "2026-07-14T12:00:00.000Z",
      }],
      lessons: Array.from({ length: 3 }, (_, index) => ({
        id: `lesson-${index}`,
        businessId: "business-a",
        recommendationId: "sales-high-open-opportunity-volume",
        lessonType: "successful" as const,
        summary: "Executive-approved verified success.",
        evidence: ["Verified measurement"],
        confidenceAdjustment: 10,
        rankingAdjustment: 15,
        reusablePattern: "sales:successful",
        approvedForReuse: true,
        createdAt: "2026-07-14T12:00:00.000Z",
        updatedAt: "2026-07-14T12:00:00.000Z",
      })),
    });
    const influence = athenaLearningInternals.buildLearningInfluenceForRecommendation({ id: "sales-high-open-opportunity-volume", category: "sales" }, context);

    expect(influence.applied).toBe(true);
    expect(influence.confidenceAdjustment).toBe(10);
    expect(influence.rankingAdjustment).toBe(15);
  });

  it("suppresses dismissed recommendations unless new evidence exists", () => {
    const context = learningContext({
      feedback: [{
        id: "feedback-1",
        businessId: "business-a",
        recommendationId: "sales-high-open-opportunity-volume",
        briefingId: null,
        executiveDecision: "dismissed",
        status: "cancelled",
        feedback: "Dismissed by executive.",
        owner: "CEO",
        createdAt: "2026-07-14T12:10:00.000Z",
        updatedAt: "2026-07-14T12:10:00.000Z",
      }],
    });

    expect(athenaLearningInternals.isDismissedByLearningWithoutNewEvidence("sales-high-open-opportunity-volume", "2026-07-14T12:00:00.000Z", context)).toBe(true);
    expect(athenaLearningInternals.isDismissedByLearningWithoutNewEvidence("sales-high-open-opportunity-volume", "2026-07-14T12:20:00.000Z", context)).toBe(false);
  });

  it("does not apply cross-business learning context", () => {
    const context = learningContext({ businessId: "business-b" });
    const influence = athenaLearningInternals.buildLearningInfluenceForRecommendation({ id: "sales-high-open-opportunity-volume", category: "sales" }, context);

    expect(influence.applied).toBe(false);
    expect(influence.explanation).toContain("Insufficient verified outcome history");
  });
});
