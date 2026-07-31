import { describe, expect, it } from "vitest";
import { buildGroundedCopilotAnswer, calculateExecutivePriority, validateIntelligenceEvent } from "./core";

describe("unified intelligence orchestration", () => {
  it("calculates a bounded, explainable executive priority", () => {
    expect(calculateExecutivePriority({ businessImpact: 100, financialValue: 80, operationalImpact: 60, strategicValue: 90, risk: 70, urgency: 50, confidence: 80 })).toEqual({ score: 78, components: { businessImpact: 100, financialValue: 80, operationalImpact: 60, strategicValue: 90, risk: 70, urgency: 50, confidence: 80 } });
  });
  it("rejects recommendations without evidence", () => {
    const result = validateIntelligenceEvent({ id: "e1", organizationId: "o1", producer: "financial", type: "invoice.paid", category: "financial", occurredAt: new Date().toISOString(), payload: {}, evidence: [], recommendation: { key: "r1", title: "T", summary: "S", action: "A", factors: { businessImpact: 1, financialValue: 1, operationalImpact: 1, strategicValue: 1, risk: 1, urgency: 1, confidence: 80 } } });
    expect(result.valid).toBe(false);
  });
  it("refuses to fabricate when authorized context is empty", () => {
    expect(buildGroundedCopilotAnswer("What should I do?", { priorities: [], risks: [], opportunities: [], eventCount: 0 })).toMatchObject({ confidence: 0, evidence: [], grounded: true });
  });
});
