import { describe, expect, it } from "vitest";
import { buildExecutiveBriefing, calculateExecutiveReadiness } from "./core";

describe("Executive Mission Control", () => {
  it("does not fabricate a readiness score without evidence", () => {
    expect(calculateExecutiveReadiness({ operations: null, revenue: null })).toMatchObject({
      score: null, trend: "unavailable", coverage: 0,
    });
  });

  it("normalizes the score across available evidence only", () => {
    expect(calculateExecutiveReadiness({ operations: 80, revenue: 60 }, 65)).toMatchObject({
      score: 70, trend: "up", coverage: 25,
    });
  });

  it("excludes recommendations without attributed evidence", () => {
    const briefing = buildExecutiveBriefing([
      { id: 1, title: "Unsupported", why: "No evidence", recommendedAction: "None", confidenceScore: 90, priority: "critical", category: "risk", evidence: [], businessImpact: "Unknown", createdAt: new Date() },
    ]);
    expect(briefing.topPriorities).toEqual([]);
    expect(briefing.confidence).toBeNull();
  });
});
