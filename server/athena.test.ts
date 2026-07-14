import { describe, expect, it } from "vitest";
import { athenaInternals, type AthenaSnapshot } from "./athena";
import type { BusinessMemorySnapshot } from "./business-memory";
import type { PrnIntelligenceEngineRecommendation, PrnLiveData } from "./prn-private-ghl";
import type { AthenaLearningContext } from "./athena-learning";

const now = new Date("2026-07-14T14:00:00.000Z");

function liveData(overrides: Partial<PrnLiveData> = {}): PrnLiveData {
  return {
    ok: true,
    mode: "private_token",
    source: "Live PRN Staffers GoHighLevel",
    division: "PRN Staffers South Carolina",
    locationId: "loc-1",
    lastSync: "2026-07-14T13:55:00.000Z",
    location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    metrics: {
      totalContacts: 69,
      users: 3,
      opportunities: 54,
      openOpportunities: 54,
      pipelineValue: 13400,
      healthScore: 88,
    },
    endpointHealth: {
      location: { ok: true, status: 200, path: "/locations/loc-1", responseTimeMs: 10 },
      users: { ok: true, status: 200, path: "/users", responseTimeMs: 10 },
      contacts: { ok: true, status: 200, path: "/contacts", responseTimeMs: 10 },
      opportunities: { ok: true, status: 200, path: "/opportunities", responseTimeMs: 10 },
    },
    records: {
      contacts: Array.from({ length: 69 }, (_, index) => ({ id: `contact-${index}` })),
      users: Array.from({ length: 3 }, (_, index) => ({ id: `user-${index}` })),
      opportunities: Array.from({ length: 54 }, (_, index) => ({ id: `opp-${index}` })),
    },
    ...overrides,
  };
}

function memory(overrides: Partial<BusinessMemorySnapshot> = {}): BusinessMemorySnapshot {
  return {
    businessId: "prn-staffers-south-carolina",
    businessGoals: [{
      id: "goal-1",
      businessId: "prn-staffers-south-carolina",
      category: "sales",
      title: "Improve opportunity follow-up",
      description: "User-entered goal.",
      status: "active",
      source: "user",
      metadata: {},
      createdAt: "2026-07-14T12:00:00.000Z",
      updatedAt: "2026-07-14T12:00:00.000Z",
    }],
    strategicPriorities: [{
      id: "priority-1",
      businessId: "prn-staffers-south-carolina",
      category: "revenue",
      title: "Improve pipeline conversion",
      description: "User-entered priority.",
      status: "active",
      source: "user",
      metadata: {},
      createdAt: "2026-07-14T12:00:00.000Z",
      updatedAt: "2026-07-14T12:00:00.000Z",
    }],
    executiveDecisions: [{
      id: "decision-1",
      businessId: "prn-staffers-south-carolina",
      category: "sales",
      title: "Keep weekly opportunity review",
      description: "User-entered decision.",
      status: "active",
      source: "user",
      metadata: {},
      createdAt: "2026-07-14T12:00:00.000Z",
      updatedAt: "2026-07-14T12:00:00.000Z",
    }],
    recommendationOutcomes: [],
    businessMilestones: [],
    auditTrail: [],
    ...overrides,
  };
}

function intelligence(overrides: Partial<PrnIntelligenceEngineRecommendation> = {}): PrnIntelligenceEngineRecommendation {
  return {
    id: "sales-high-open-opportunity-volume",
    category: "Sales",
    observation: "Fact: open opportunities are above the V1 review threshold.",
    evidence: [{ metric: "Open opportunities", value: "54", source: "GoHighLevel" }],
    businessImpact: "Insufficient data: historical conversion data is not available, so EEOS cannot project revenue impact.",
    recommendation: "Review stalled opportunities and assign follow-up tasks to named owners.",
    priority: "High",
    confidence: 91,
    confidenceReason: "91/100 based on healthy endpoints and available live metrics.",
    measurement: "Success is measured by fewer open opportunities without next steps.",
    dataTimestamp: "2026-07-14T13:55:00.000Z",
    businessImpactScore: 84,
    urgency: "This Week",
    memoryInfluence: {
      influenced: true,
      activeGoalsReferenced: ["Improve opportunity follow-up"],
      strategicPrioritiesReferenced: ["Improve pipeline conversion"],
      pastDecisionsReferenced: ["Keep weekly opportunity review"],
      outcomeComparisons: [],
      duplicateSuppressed: false,
    },
    ...overrides,
  };
}

function learningContext(): AthenaLearningContext {
  return {
    businessId: "prn-staffers-south-carolina",
    feedback: [],
    measurements: [{
      id: "measurement-1",
      businessId: "prn-staffers-south-carolina",
      recommendationId: "sales-high-open-opportunity-volume",
      metricName: "Open opportunities reviewed",
      baselineValue: 0,
      targetValue: 10,
      actualValue: 12,
      unit: "count",
      measurementSource: "user-entered evidence",
      measuredAt: "2026-07-14T13:00:00.000Z",
      verified: true,
      verificationEvidence: "Executive confirmed review completion.",
      createdAt: "2026-07-14T13:00:00.000Z",
      updatedAt: "2026-07-14T13:00:00.000Z",
    }],
    lessons: [{
      id: "lesson-1",
      businessId: "prn-staffers-south-carolina",
      recommendationId: "sales-high-open-opportunity-volume",
      lessonType: "successful",
      summary: "Verified reviews improved follow-up discipline.",
      evidence: ["Executive confirmed review completion."],
      confidenceAdjustment: 6,
      rankingAdjustment: 8,
      reusablePattern: "sales:successful",
      approvedForReuse: true,
      createdAt: "2026-07-14T13:00:00.000Z",
      updatedAt: "2026-07-14T13:00:00.000Z",
    }],
    profiles: [{
      id: "profile-1",
      businessId: "prn-staffers-south-carolina",
      category: "sales",
      evidenceCount: 5,
      successfulOutcomeCount: 3,
      unsuccessfulOutcomeCount: 1,
      inconclusiveOutcomeCount: 1,
      reliabilityScore: 72,
      lastUpdatedAt: "2026-07-14T13:00:00.000Z",
    }],
    adaptiveLearningReady: true,
    adaptiveLearningReason: "Verified outcome thresholds met for at least one category.",
  };
}

describe("Athena Executive Brain", () => {
  it("generates an accurate concise briefing from verified data", () => {
    const brief = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: memory(),
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      now,
    });

    expect(brief.businessId).toBe("prn-staffers-south-carolina");
    expect(brief.executiveSummary.split(".").filter(Boolean).length).toBeLessThanOrEqual(3);
    expect(brief.topPriorities).toHaveLength(1);
    expect(brief.decisionOfTheDay?.title).toBe("High Open Opportunity Volume");
    expect(brief.sources).toContain("Live PRN Staffers GoHighLevel");
  });

  it("handles missing, stale, and unhealthy endpoint data by reducing confidence", () => {
    const stale = athenaInternals.calculateDataFreshness(liveData({ lastSync: "2026-07-14T13:30:00.000Z" }), now);
    const incomplete = athenaInternals.calculateDataFreshness(liveData({
      ok: false,
      endpointHealth: {
        location: { ok: true, status: 200, path: "/locations/loc-1", responseTimeMs: 10 },
        users: { ok: false, status: 401, path: "/users", responseTimeMs: 10 },
        contacts: { ok: true, status: 200, path: "/contacts", responseTimeMs: 10 },
        opportunities: { ok: true, status: 200, path: "/opportunities", responseTimeMs: 10 },
      },
    }), now);

    expect(stale.status).toBe("stale");
    expect(incomplete.status).toBe("incomplete");
  });

  it("does not fabricate financial projections or change history", () => {
    const brief = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: memory(),
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      now,
    });

    expect(brief.topPriorities[0]?.businessImpact.description).toContain("Insufficient data");
    expect(brief.whatChanged[0]).toContain("Trend history is not yet available");
  });

  it("uses goals, priorities, and previous decisions as memory influence", () => {
    const brief = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: memory(),
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      now,
    });

    expect(brief.memoryInfluence.join(" ")).toContain("Active goal");
    expect(brief.topPriorities[0]?.memoryInfluence.join(" ")).toContain("Previous decision");
  });

  it("suppresses dismissed recommendations unless newer evidence exists", () => {
    const dismissedMemory = memory({
      recommendationOutcomes: [{
        id: "outcome-1",
        businessId: "prn-staffers-south-carolina",
        category: "sales",
        title: "Dismissed",
        description: "Dismissed recommendation.",
        status: "reviewed",
        source: "user",
        metadata: {},
        recommendationId: "sales-high-open-opportunity-volume",
        actionTaken: "No action",
        expectedOutcome: "Reduce open opportunities",
        actualOutcome: "Dismissed",
        successMetric: "Open opportunities",
        result: "dismissed",
        reviewedAt: "2026-07-14T13:56:00.000Z",
        createdAt: "2026-07-14T13:56:00.000Z",
        updatedAt: "2026-07-14T13:56:00.000Z",
      }],
    });
    const suppressed = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: dismissedMemory,
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      now,
    });
    const newerEvidence = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData({ lastSync: "2026-07-14T13:58:00.000Z" }),
      memory: dismissedMemory,
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence({ dataTimestamp: "2026-07-14T13:58:00.000Z" })],
      now,
    });

    expect(suppressed.topPriorities).toHaveLength(0);
    expect(newerEvidence.topPriorities).toHaveLength(1);
  });

  it("calculates Business Health V2 and briefing confidence", () => {
    const freshness = athenaInternals.calculateDataFreshness(liveData(), now);
    const health = athenaInternals.calculateBusinessHealthV2(liveData(), memory(), freshness);
    const brief = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: memory(),
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      now,
    });

    expect(health.score).toBeGreaterThan(0);
    expect(health.components.endpointHealth).toBe(100);
    expect(brief.confidence.score).toBeGreaterThan(0);
  });

  it("compares snapshots without inventing values", () => {
    const previous: AthenaSnapshot = {
      businessId: "prn-staffers-south-carolina",
      generatedAt: "2026-07-14T13:00:00.000Z",
      metrics: { totalContacts: 60, users: 3, opportunities: 50, openOpportunities: 50, pipelineValue: 12000, healthScore: 80 },
      healthScore: 80,
      recommendationIds: [],
      activeGoalIds: [],
      strategicPriorityIds: [],
      riskIds: [],
      milestoneIds: [],
    };
    const current = athenaInternals.createAthenaSnapshot(liveData(), memory(), now.toISOString());

    expect(athenaInternals.buildWhatChanged(previous, current).join(" ")).toContain("Contacts increased by 9");
  });

  it("includes Athena learning influence when approved threshold evidence exists", () => {
    const brief = athenaInternals.buildAthenaExecutiveBrief({
      liveData: liveData(),
      memory: memory(),
      previousSnapshot: null,
      executiveRecommendations: [],
      intelligenceRecommendations: [intelligence()],
      learningContext: learningContext(),
      now,
    });

    expect(brief.topPriorities[0]?.learningInfluence.applied).toBe(true);
    expect(brief.topPriorities[0]?.learningInfluence.approvedLessonsUsed).toContain("lesson-1");
  });
});
