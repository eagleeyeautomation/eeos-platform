import { randomUUID } from "crypto";
import { withDatabase, withTransaction } from "../db/postgres";
import { publishIntelligenceEvent } from "../intelligence-orchestration/service";
import { approvalTransition, evaluateRiskGates, initialWorkflowState, type AutomationActionType } from "./core";

type PrepareInput = {
  organizationId: string; locationId?: string; recommendationId?: string; templateKey: string; playbookKey?: string;
  title: string; payload: Record<string, unknown>; evidence: string[]; confidence: number; riskScore: number; requestedBy: string;
  bulk?: boolean; financial?: boolean; customerCommunication?: boolean; externalIntegration?: boolean;
};

export async function getAutomationDashboard(organizationId: string, authorizedLocationIds: string[]) {
  return withDatabase(async (client) => {
    const [workflows, queue, goals, templates, playbooks, policies] = await Promise.all([
      client.query(`select id,location_id as "locationId",recommendation_id as "recommendationId",template_key as "templateKey",playbook_key as "playbookKey",title,action_type as "actionType",status,protected_action as "protectedAction",confidence,risk_score as "riskScore",risk_gates as "riskGates",prepared_payload as payload,evidence,created_at as "createdAt",updated_at as "updatedAt" from decision_workflows where organization_id=$1 and (location_id is null or location_id=any($2::text[])) order by created_at desc limit 100`, [organizationId, authorizedLocationIds]),
      client.query(`select q.id,q.workflow_id as "workflowId",q.action_type as "actionType",q.status,q.payload,q.execution_blocked as "executionBlocked",q.blocked_reason as "blockedReason",q.created_at as "createdAt" from business_automation_queue q join decision_workflows w on w.id=q.workflow_id and w.organization_id=q.organization_id where q.organization_id=$1 and (w.location_id is null or w.location_id=any($2::text[])) order by q.created_at desc limit 100`, [organizationId, authorizedLocationIds]),
      client.query(`select id,location_id as "locationId",goal_type as "goalType",title,baseline,target,current_value as "currentValue",unit,status,due_at as "dueAt",updated_at as "updatedAt" from business_goals_v2 where organization_id=$1 and (location_id is null or location_id=any($2::text[])) order by updated_at desc`, [organizationId, authorizedLocationIds]),
      client.query(`select template_key as "templateKey",name,action_type as "actionType",protected_action as "protectedAction",steps from workflow_templates where organization_id is null or organization_id=$1 order by name`, [organizationId]),
      client.query(`select playbook_key as "playbookKey",name,trigger_category as "triggerCategory",workflow_template_keys as "workflowTemplateKeys" from executive_playbooks where organization_id is null or organization_id=$1 order by name`, [organizationId]),
      client.query(`select action_type as "actionType",requires_approval as "requiresApproval",minimum_role as "minimumRole",risk_threshold as "riskThreshold" from approval_policies where organization_id is null or organization_id=$1 order by action_type`, [organizationId]),
    ]);
    return { workflows: workflows.rows, queue: queue.rows, goals: goals.rows, templates: templates.rows, playbooks: playbooks.rows, policies: policies.rows };
  });
}

export async function prepareDecisionWorkflow(input: PrepareInput) {
  const record = await withTransaction(async (client) => {
    const template = await client.query<{ actionType: AutomationActionType; protectedAction: boolean }>(`select action_type as "actionType",protected_action as "protectedAction" from workflow_templates where template_key=$1 and (organization_id=$2 or organization_id is null) order by organization_id nulls last limit 1`, [input.templateKey, input.organizationId]);
    if (!template.rows[0]) throw new Error("Workflow template is not available for this organization.");
    const policy = await client.query<{ requiresApproval: boolean; riskThreshold: number }>(`select requires_approval as "requiresApproval",risk_threshold as "riskThreshold" from approval_policies where action_type=$1 and (organization_id=$2 or organization_id is null) order by organization_id nulls last limit 1`, [template.rows[0].actionType, input.organizationId]);
    if (input.recommendationId) {
      const recommendation = await client.query(`select id from executive_priority_queue where id=$1 and organization_id=$2 and status='active' and (location_ids='[]'::jsonb or location_ids ?| $3::text[])`, [input.recommendationId, input.organizationId, input.locationId ? [input.locationId] : []]);
      if (!recommendation.rowCount) throw new Error("Recommendation is not available in the authorized organization context.");
    }
    const gateInput = { actionType: template.rows[0].actionType, confidence: input.confidence, riskScore: input.riskScore, evidence: input.evidence, payload: input.payload, bulk: input.bulk, financial: input.financial, customerCommunication: input.customerCommunication, externalIntegration: input.externalIntegration };
    const risk = evaluateRiskGates(gateInput);
    if (template.rows[0].protectedAction) { risk.protectedAction = true; risk.requiresApproval = true; }
    if (policy.rows[0]?.requiresApproval) { risk.protectedAction = true; risk.requiresApproval = true; }
    if (policy.rows[0] && input.riskScore >= policy.rows[0].riskThreshold) {
      const riskGate = risk.gates.find((gate) => gate.key === "risk");
      if (riskGate) { riskGate.passed = false; riskGate.reason = `Risk score exceeds the approval policy threshold of ${policy.rows[0].riskThreshold}.`; }
      risk.passed = false;
    }
    const id = randomUUID(); const status = initialWorkflowState(risk); const queueId = randomUUID();
    await client.query(`insert into decision_workflows (id,organization_id,location_id,recommendation_id,template_key,playbook_key,title,action_type,status,protected_action,confidence,risk_score,risk_gates,prepared_payload,evidence,requested_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16)`, [id,input.organizationId,input.locationId??null,input.recommendationId??null,input.templateKey,input.playbookKey??null,input.title,gateInput.actionType,status,risk.protectedAction,input.confidence,input.riskScore,JSON.stringify(risk.gates),JSON.stringify(input.payload),JSON.stringify(input.evidence),input.requestedBy]);
    await client.query(`insert into business_automation_queue (id,organization_id,workflow_id,action_type,status,payload,execution_blocked,blocked_reason) values ($1,$2,$3,$4,$5,$6::jsonb,true,$7)`, [queueId,input.organizationId,id,gateInput.actionType,status,JSON.stringify(input.payload),status === "risk_blocked" ? "Risk gates did not pass." : risk.requiresApproval ? "Human executive approval is required." : "Prepared only; Phase 5 has no autonomous executor."]);
    return { id, queueId, status, actionType: gateInput.actionType, protectedAction: risk.protectedAction, riskGates: risk.gates };
  });
  await publishIntelligenceEvent({ id: `decision-workflow:${record.id}`, organizationId: input.organizationId, locationId: input.locationId, producer: "decision_orchestration", type: "workflow_prepared", category: "operations", occurredAt: new Date().toISOString(), subject: { type: "business_event", key: record.id, name: input.title }, payload: { workflowId: record.id, status: record.status, actionType: record.actionType }, evidence: input.evidence, correlationId: input.recommendationId });
  return record;
}

export async function decideWorkflow(input: { organizationId: string; workflowId: string; decision: "approved" | "rejected"; comment?: string; decidedBy: string }) {
  const record = await withTransaction(async (client) => {
    const workflow = await client.query<any>(`select id,location_id as "locationId",title,status,action_type as "actionType",protected_action as "protectedAction",evidence from decision_workflows where id=$1 and organization_id=$2 for update`, [input.workflowId,input.organizationId]);
    if (!workflow.rows[0]) throw new Error("Workflow was not found in this organization.");
    const status = approvalTransition(workflow.rows[0].status, input.decision);
    const policy = { minimumRole: "ORGANIZATION_OWNER", protectedAction: workflow.rows[0].protectedAction, autonomousExecution: false };
    await client.query(`insert into workflow_approvals (id,organization_id,workflow_id,decision,decided_by,comment,policy_snapshot) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`, [randomUUID(),input.organizationId,input.workflowId,input.decision,input.decidedBy,input.comment??null,JSON.stringify(policy)]);
    await client.query(`update decision_workflows set status=$3,decided_at=now(),updated_at=now() where id=$1 and organization_id=$2`, [input.workflowId,input.organizationId,status]);
    await client.query(`update business_automation_queue set status=$3,execution_blocked=true,blocked_reason=$4,updated_at=now() where workflow_id=$1 and organization_id=$2`, [input.workflowId,input.organizationId,status,status === "approved" ? "Executive approved; downstream execution is not enabled in Phase 5." : "Executive rejected this prepared action."]);
    return { workflowId: input.workflowId, status, locationId: workflow.rows[0].locationId as string | undefined, title: workflow.rows[0].title as string, actionType: workflow.rows[0].actionType as string, evidence: workflow.rows[0].evidence as string[] };
  });
  await publishIntelligenceEvent({ id: `decision-workflow:${record.workflowId}:${record.status}`, organizationId: input.organizationId, locationId: record.locationId, producer: "decision_orchestration", type: `workflow_${record.status}`, category: "audit", occurredAt: new Date().toISOString(), subject: { type: "business_event", key: record.workflowId, name: record.title }, payload: { workflowId: record.workflowId, decision: record.status, actionType: record.actionType, autonomousExecution: false }, evidence: record.evidence });
  return record;
}

export async function createBusinessGoal(input: { organizationId: string; locationId?: string; goalType: string; title: string; baseline?: number; target: number; currentValue?: number; unit: string; dueAt?: string; createdBy: string }) {
  const id = randomUUID();
  await withDatabase((client) => client.query(`insert into business_goals_v2 (id,organization_id,location_id,goal_type,title,baseline,target,current_value,unit,due_at,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id,input.organizationId,input.locationId??null,input.goalType,input.title,input.baseline??null,input.target,input.currentValue??input.baseline??null,input.unit,input.dueAt??null,input.createdBy]));
  await publishIntelligenceEvent({ id: `business-goal:${id}`, organizationId: input.organizationId, locationId: input.locationId, producer: "decision_orchestration", type: "business_goal_created", category: "growth", occurredAt: new Date().toISOString(), subject: { type: "goal", key: id, name: input.title }, payload: { goalType: input.goalType, baseline: input.baseline, target: input.target, unit: input.unit }, evidence: [`Executive created goal ${input.title}.`] });
  return { id, status: "active" as const };
}

export async function updateBusinessGoal(input: { organizationId: string; goalId: string; currentValue: number; status?: "active" | "achieved" | "paused"; updatedBy: string }) {
  const goal = await withDatabase(async (client) => {
    const result = await client.query<any>(`update business_goals_v2 set current_value=$3,status=coalesce($4,status),updated_at=now() where id=$1 and organization_id=$2 returning id,location_id as "locationId",goal_type as "goalType",title,target,current_value as "currentValue",unit,status`, [input.goalId,input.organizationId,input.currentValue,input.status??null]);
    if (!result.rows[0]) throw new Error("Goal was not found in this organization.");
    return result.rows[0];
  });
  await publishIntelligenceEvent({ id: `business-goal:${goal.id}:${Date.now()}`, organizationId: input.organizationId, locationId: goal.locationId, producer: "decision_orchestration", type: "business_goal_progress_updated", category: "growth", occurredAt: new Date().toISOString(), subject: { type: "goal", key: goal.id, name: goal.title }, payload: { goalType: goal.goalType, target: Number(goal.target), currentValue: Number(goal.currentValue), unit: goal.unit, status: goal.status, updatedBy: input.updatedBy }, evidence: [`Executive recorded verified progress for ${goal.title}.`] });
  return goal;
}
