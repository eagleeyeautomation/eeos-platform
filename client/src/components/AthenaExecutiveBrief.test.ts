import { describe, expect, it } from "vitest";
import { athenaBriefHasRequiredExecutiveFields } from "./AthenaExecutiveBrief";

describe("Athena Executive Brief UI helpers", () => {
  it("requires decision, freshness, and confidence for executive rendering", () => {
    expect(athenaBriefHasRequiredExecutiveFields({
      businessId: "prn-staffers-south-carolina",
      generatedAt: "2026-07-14T14:00:00.000Z",
      dataFreshness: { status: "fresh", lastSync: "2026-07-14T13:55:00.000Z", ageMinutes: 5 },
      executiveGreeting: "Good Afternoon",
      businessHealth: { score: 82, status: "healthy", reason: "Verified data.", components: {} },
      executiveSummary: "Summary.",
      whatChanged: [],
      topPriorities: [],
      topOpportunity: null,
      topRisk: null,
      decisionOfTheDay: {
        title: "Review open opportunities",
        decision: "Open opportunities are above threshold.",
        recommendedAction: "Assign owners.",
        whyToday: "Verified data supports review.",
        expectedMeasurableResult: "Lower open opportunities without next step.",
        confidence: 88,
        strategicAlignment: [],
        memoryInfluence: [],
      },
      watchList: [],
      memoryInfluence: [],
      confidence: { score: 84, level: "high", reason: "Verified data." },
    })).toBe(true);
  });
});
