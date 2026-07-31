export const AUTOMATION_ACTION_TYPES = [
  "create_task", "assign_user", "create_reminder", "create_follow_up", "schedule_meeting",
  "prepare_crm_record", "prepare_ghl_contact", "prepare_opportunity", "prepare_partner_review", "prepare_referral_review",
] as const;

export const PROTECTED_ACTION_TYPES = [
  "prepare_crm_record", "prepare_ghl_contact", "prepare_opportunity", "schedule_meeting",
] as const;

export const GOAL_TYPES = ["revenue", "growth", "conversion", "hiring", "retention", "referral_growth", "business_health"] as const;
export type AutomationActionType = typeof AUTOMATION_ACTION_TYPES[number];

export type RiskGateInput = {
  actionType: AutomationActionType;
  confidence: number;
  riskScore: number;
  evidence: string[];
  payload: Record<string, unknown>;
  bulk?: boolean;
  financial?: boolean;
  customerCommunication?: boolean;
  externalIntegration?: boolean;
};

export function evaluateRiskGates(input: RiskGateInput) {
  const gates = [
    { key: "evidence", passed: input.evidence.length > 0, reason: "At least one verified evidence item is required." },
    { key: "confidence", passed: input.confidence >= 60, reason: "Recommendation confidence must be at least 60%." },
    { key: "risk", passed: input.riskScore < 85, reason: "Risk scores of 85 or higher require manual remediation." },
    { key: "payload", passed: Object.keys(input.payload).length > 0, reason: "A prepared action payload is required." },
  ];
  const protectedAction = PROTECTED_ACTION_TYPES.includes(input.actionType as typeof PROTECTED_ACTION_TYPES[number]) ||
    Boolean(input.bulk || input.financial || input.customerCommunication || input.externalIntegration);
  return {
    passed: gates.every((gate) => gate.passed),
    protectedAction,
    requiresApproval: protectedAction,
    gates,
  };
}

export function initialWorkflowState(result: ReturnType<typeof evaluateRiskGates>) {
  if (!result.passed) return "risk_blocked" as const;
  return result.requiresApproval ? "awaiting_approval" as const : "prepared" as const;
}

export function approvalTransition(current: string, decision: "approved" | "rejected") {
  if (current !== "awaiting_approval") throw new Error("Only workflows awaiting approval may be decided.");
  return decision;
}
