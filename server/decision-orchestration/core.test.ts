import { describe, expect, it } from "vitest";
import { approvalTransition, evaluateRiskGates, initialWorkflowState } from "./core";

describe("executive decision orchestration", () => {
  it("requires approval for protected external work", () => {
    const result = evaluateRiskGates({ actionType: "prepare_ghl_contact", confidence: 82, riskScore: 20, evidence: ["verified referral"], payload: { name: "Prepared contact" } });
    expect(result).toMatchObject({ passed: true, protectedAction: true, requiresApproval: true });
    expect(initialWorkflowState(result)).toBe("awaiting_approval");
  });

  it("blocks weak or unsupported work", () => {
    const result = evaluateRiskGates({ actionType: "create_task", confidence: 40, riskScore: 90, evidence: [], payload: {} });
    expect(result.passed).toBe(false);
    expect(result.gates.filter((gate) => !gate.passed)).toHaveLength(4);
    expect(initialWorkflowState(result)).toBe("risk_blocked");
  });

  it("allows safe internal work to remain prepared", () => {
    const result = evaluateRiskGates({ actionType: "create_reminder", confidence: 90, riskScore: 10, evidence: ["goal deadline"], payload: { dueAt: "2027-01-01" } });
    expect(initialWorkflowState(result)).toBe("prepared");
  });

  it("only decides workflows awaiting approval", () => {
    expect(approvalTransition("awaiting_approval", "approved")).toBe("approved");
    expect(() => approvalTransition("prepared", "approved")).toThrow(/awaiting approval/);
  });
});
