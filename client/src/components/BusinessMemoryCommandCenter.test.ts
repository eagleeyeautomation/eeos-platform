import { describe, expect, it } from "vitest";
import { buildMilestoneTimeline, hasMemoryInfluence, sortPriorities } from "./BusinessMemoryCommandCenter";

const baseRecord = {
  id: "record-1",
  businessId: "test-business",
  category: "growth",
  title: "Record",
  description: "User-entered fact.",
  status: "active",
  source: "user" as const,
  metadata: {},
  createdAt: "2026-07-13T12:00:00.000Z",
  updatedAt: "2026-07-13T12:00:00.000Z",
};

describe("Business Memory Command Center helpers", () => {
  it("orders strategic priorities by stored sort order", () => {
    const ordered = sortPriorities([
      { ...baseRecord, id: "priority-2", title: "Second", metadata: { sortOrder: 2 } },
      { ...baseRecord, id: "priority-1", title: "First", metadata: { sortOrder: 1 } },
    ]);

    expect(ordered.map((item) => item.title)).toEqual(["First", "Second"]);
  });

  it("builds a chronological milestone timeline from completed goals, decisions, and milestones", () => {
    const timeline = buildMilestoneTimeline({
      ok: true,
      businessId: "test-business",
      businessGoals: [{ ...baseRecord, id: "goal-1", title: "Goal completed", status: "completed", updatedAt: "2026-07-12T12:00:00.000Z" }],
      strategicPriorities: [],
      executiveDecisions: [{ ...baseRecord, id: "decision-1", title: "Major decision", metadata: { decisionDate: "2026-07-13T12:00:00.000Z" } }],
      recommendationOutcomes: [],
      businessMilestones: [{ ...baseRecord, id: "milestone-1", title: "Revenue milestone", category: "revenue", createdAt: "2026-07-11T12:00:00.000Z", metadata: { lessonLearned: "Follow-up cadence matters" } }],
      auditTrail: [],
    });

    expect(timeline.map((item) => item.title)).toEqual(["Major decision", "Goal completed", "Revenue milestone"]);
    expect(timeline[2]?.lesson).toBe("Follow-up cadence matters");
  });

  it("identifies memory-influenced recommendations", () => {
    expect(hasMemoryInfluence({
      id: "rec-1",
      category: "Sales",
      observation: "Observation",
      recommendation: "Recommendation",
      memoryInfluence: {
        influenced: true,
        activeGoalsReferenced: ["Growth goal"],
        strategicPrioritiesReferenced: [],
        pastDecisionsReferenced: [],
        outcomeComparisons: [],
      },
    })).toBe(true);
  });

  it("handles missing Business Memory data without fabricating timeline entries", () => {
    expect(buildMilestoneTimeline(null)).toEqual([]);
  });
});
