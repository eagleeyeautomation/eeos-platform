import type { Express } from "express";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { PRN_BUSINESS_ID, loadBusinessMemorySnapshot, type BusinessMemorySnapshot } from "./business-memory";
import { withDatabase, withTransaction } from "./db/postgres";
import {
  buildB2BIntelligence,
  buildC2BIntelligence,
  buildExecutiveRecommendations,
  buildPrnIntelligenceEngine,
  loadPrnLiveData,
  type ExecutiveRecommendation,
  type PrnIntelligenceEngineRecommendation,
  type PrnLiveData,
} from "./prn-private-ghl";

type AthenaDataFreshnessStatus = "fresh" | "stale" | "incomplete";
type AthenaHealthStatus = "excellent" | "healthy" | "watch" | "critical";
type AthenaConfidenceLevel = "high" | "medium" | "low";
type AthenaPriorityCategory = "sales" | "revenue" | "operations" | "customer_experience" | "b2b" | "c2b" | "risk" | "growth";
type AthenaPriorityLevel = "critical" | "high" | "medium" | "low";
type AthenaUrgency = "immediate" | "this_week" | "this_month" | "monitor";

export type AthenaSnapshot = {
  businessId: string;
  generatedAt: string;
  metrics: PrnLiveData["metrics"];
  healthScore: number;
  recommendationIds: string[];
  activeGoalIds: string[];
  strategicPriorityIds: string[];
  riskIds: string[];
  milestoneIds: string[];
};

export type AthenaPriority = {
  id: string;
  rank: number;
  title: string;
  category: AthenaPriorityCategory;
  priority: AthenaPriorityLevel;
  observation: string;
  evidence: Array<{ metric: string; value: string; source: string }>;
  recommendedAction: string;
  whyNow: string;
  businessImpact: {
    score: number;
    description: string;
  };
  urgency: AthenaUrgency;
  confidence: number;
  confidenceReason: string;
  measurement: string;
  memoryInfluence: string[];
  dataTimestamp: string;
};

export type AthenaExecutiveBrief = {
  businessId: string;
  generatedAt: string;
  dataFreshness: {
    status: AthenaDataFreshnessStatus;
    lastSync: string;
    ageMinutes: number;
  };
  executiveGreeting: string;
  businessHealth: {
    score: number;
    status: AthenaHealthStatus;
    reason: string;
    components: Record<string, number>;
  };
  executiveSummary: string;
  whatChanged: string[];
  topPriorities: AthenaPriority[];
  topOpportunity: AthenaPriority | null;
  topRisk: AthenaPriority | null;
  decisionOfTheDay: {
    id: string;
    title: string;
    decision: string;
    evidence: Array<{ metric: string; value: string; source: string }>;
    recommendedAction: string;
    whyToday: string;
    expectedMeasurableResult: string;
    confidence: number;
    strategicAlignment: string[];
    memoryInfluence: string[];
  } | null;
  watchList: string[];
  memoryInfluence: string[];
  confidence: {
    score: number;
    level: AthenaConfidenceLevel;
    reason: string;
  };
  sources: string[];
};

export function registerAthenaRoutes(app: Express) {
  app.get("/api/prn/athena/executive-brief", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const memory = await loadBusinessMemorySnapshot(PRN_BUSINESS_ID);
      const previousSnapshot = await loadLatestAthenaSnapshot(PRN_BUSINESS_ID);
      const executiveRecommendations = buildExecutiveRecommendations(liveData);
      const intelligence = buildPrnIntelligenceEngine(liveData, memory);
      const b2b = buildB2BIntelligence(liveData);
      const c2b = buildC2BIntelligence(liveData);
      const brief = buildAthenaExecutiveBrief({
        liveData,
        memory,
        previousSnapshot,
        executiveRecommendations,
        intelligenceRecommendations: intelligence.recommendations,
        b2bActions: b2b.recommendedActions,
        c2bActions: c2b.recommendedActions,
      });

      await persistAthenaRun(brief, liveData, memory, previousSnapshot);
      res.status(200).json(brief);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "athena",
        event: "executive_brief.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        businessId: PRN_BUSINESS_ID,
        generatedAt: new Date().toISOString(),
        error: "Unable to generate Athena Executive Brief from verified production data.",
      });
    }
  });
}

export function buildAthenaExecutiveBrief(input: {
  liveData: Pick<PrnLiveData, "ok" | "source" | "division" | "metrics" | "endpointHealth" | "lastSync" | "records">;
  memory: BusinessMemorySnapshot;
  previousSnapshot: AthenaSnapshot | null;
  executiveRecommendations: ExecutiveRecommendation[];
  intelligenceRecommendations: PrnIntelligenceEngineRecommendation[];
  b2bActions?: Array<{ id: string; label: string; observation: string; evidence: Array<{ metric: string; value: string; source: string }> }>;
  c2bActions?: Array<{ id: string; label: string; observation: string; evidence: Array<{ metric: string; value: string; source: string }> }>;
  now?: Date;
}): AthenaExecutiveBrief {
  const now = input.now ?? new Date();
  const dataFreshness = calculateDataFreshness(input.liveData, now);
  const businessHealth = calculateBusinessHealthV2(input.liveData, input.memory, dataFreshness);
  const priorities = buildTopPriorities(input, dataFreshness).slice(0, 5).map((priority, index) => ({ ...priority, rank: index + 1 }));
  const topOpportunity = priorities.find((priority) => ["sales", "revenue", "growth", "b2b", "c2b"].includes(priority.category)) ?? null;
  const topRisk = priorities.find((priority) => priority.category === "risk") ?? null;
  const memoryInfluence = buildMemoryInfluence(input.memory, input.intelligenceRecommendations);
  const confidence = calculateAthenaConfidence(dataFreshness, businessHealth, priorities);
  const whatChanged = buildWhatChanged(input.previousSnapshot, createAthenaSnapshot(input.liveData, input.memory, now.toISOString()));
  const decisionOfTheDay = buildDecisionOfTheDay(priorities, dataFreshness, input.memory);
  const watchList = buildWatchList(input.liveData, input.memory, priorities);

  return {
    businessId: input.memory.businessId,
    generatedAt: now.toISOString(),
    dataFreshness,
    executiveGreeting: buildGreeting(now),
    businessHealth,
    executiveSummary: buildAthenaSummary(input.liveData, priorities, dataFreshness, confidence),
    whatChanged,
    topPriorities: priorities,
    topOpportunity,
    topRisk,
    decisionOfTheDay,
    watchList,
    memoryInfluence,
    confidence,
    sources: [
      "Live PRN Staffers GoHighLevel",
      "EEOS Intelligence Engine",
      "Executive Recommendations",
      "B2B Intelligence",
      "C2B Intelligence",
      "EEOS Business Memory",
    ],
  };
}

export function calculateDataFreshness(
  liveData: Pick<PrnLiveData, "ok" | "endpointHealth" | "lastSync">,
  now = new Date(),
): AthenaExecutiveBrief["dataFreshness"] {
  const parsed = new Date(liveData.lastSync);
  const ageMinutes = Number.isNaN(parsed.getTime()) ? 999 : Math.max(0, Math.round((now.getTime() - parsed.getTime()) / 60_000));
  const complete = Boolean(liveData.ok && Object.values(liveData.endpointHealth).every((health) => health.ok));

  return {
    status: !complete ? "incomplete" : ageMinutes > 15 ? "stale" : "fresh",
    lastSync: liveData.lastSync,
    ageMinutes,
  };
}

export function calculateBusinessHealthV2(
  liveData: Pick<PrnLiveData, "ok" | "metrics" | "endpointHealth">,
  memory: BusinessMemorySnapshot,
  freshness: AthenaExecutiveBrief["dataFreshness"],
) {
  const endpointScore = Math.round((Object.values(liveData.endpointHealth).filter((health) => health.ok).length / Object.values(liveData.endpointHealth).length) * 100);
  const freshnessScore = freshness.status === "fresh" ? 100 : freshness.status === "stale" ? 65 : 45;
  const pipelineActivityScore = liveData.metrics.opportunities > 0 ? 85 : 35;
  const opportunityVolumeScore = liveData.metrics.openOpportunities > 50 ? 70 : liveData.metrics.openOpportunities > 0 ? 85 : 40;
  const goalProgressScore = scoreMemoryStatuses(memory.businessGoals, { completed: 100, active: 80, planned: 65, at_risk: 45, cancelled: 30 });
  const priorityScore = scoreMemoryStatuses(memory.strategicPriorities, { active: 85, archived: 55, completed: 95 });
  const outcomeScore = scoreOutcomes(memory.recommendationOutcomes);
  const riskScore = liveData.metrics.healthScore < 70 || freshness.status === "incomplete" ? 45 : 80;
  const components = {
    endpointHealth: endpointScore,
    dataFreshness: freshnessScore,
    pipelineActivity: pipelineActivityScore,
    opportunityVolume: opportunityVolumeScore,
    goalProgress: goalProgressScore,
    strategicPriorityStatus: priorityScore,
    recommendationOutcomes: outcomeScore,
    knownRisks: riskScore,
  };
  const score = clampScore(Math.round(
    components.endpointHealth * 0.2
    + components.dataFreshness * 0.15
    + components.pipelineActivity * 0.15
    + components.opportunityVolume * 0.1
    + components.goalProgress * 0.1
    + components.strategicPriorityStatus * 0.1
    + components.recommendationOutcomes * 0.1
    + components.knownRisks * 0.1,
  ));

  return {
    score,
    status: score >= 90 ? "excellent" as const : score >= 75 ? "healthy" as const : score >= 55 ? "watch" as const : "critical" as const,
    reason: `Business Health V2 is ${score}/100 based on endpoint health, freshness, pipeline activity, memory status, outcomes, and known risks.`,
    components,
  };
}

export function createAthenaSnapshot(
  liveData: Pick<PrnLiveData, "metrics">,
  memory: BusinessMemorySnapshot,
  generatedAt: string,
): AthenaSnapshot {
  return {
    businessId: memory.businessId,
    generatedAt,
    metrics: liveData.metrics,
    healthScore: liveData.metrics.healthScore,
    recommendationIds: [],
    activeGoalIds: memory.businessGoals.filter(isActiveMemoryRecord).map((goal) => goal.id),
    strategicPriorityIds: memory.strategicPriorities.filter(isActiveMemoryRecord).map((priority) => priority.id),
    riskIds: memory.recommendationOutcomes.filter((outcome) => ["dismissed", "deferred", "result_unknown"].includes(outcome.result)).map((outcome) => outcome.id),
    milestoneIds: memory.businessMilestones.map((milestone) => milestone.id),
  };
}

export function buildWhatChanged(previous: AthenaSnapshot | null, current: AthenaSnapshot) {
  if (!previous) {
    return ["Trend history is not yet available. Athena will compare future briefs against this stored snapshot."];
  }

  const changes = [
    metricChange("Contacts", previous.metrics.totalContacts, current.metrics.totalContacts),
    metricChange("Opportunities", previous.metrics.opportunities, current.metrics.opportunities),
    metricChange("Open opportunities", previous.metrics.openOpportunities, current.metrics.openOpportunities),
    metricChange("Pipeline value", previous.metrics.pipelineValue, current.metrics.pipelineValue),
    metricChange("Business health", previous.healthScore, current.healthScore),
    countChange("Goals", previous.activeGoalIds.length, current.activeGoalIds.length),
    countChange("Strategic priorities", previous.strategicPriorityIds.length, current.strategicPriorityIds.length),
    countChange("Risks", previous.riskIds.length, current.riskIds.length),
    countChange("Milestones", previous.milestoneIds.length, current.milestoneIds.length),
  ].filter(Boolean);

  return changes.length > 0 ? changes : ["No material metric or memory changes since the last Athena snapshot."];
}

export async function loadLatestAthenaSnapshot(businessId: string) {
  await ensureAthenaSchema();
  return withDatabase(async (client) => {
    const result = await client.query<{ snapshot: AthenaSnapshot }>(
      `
        select snapshot
        from athena_snapshots
        where business_id = $1
        order by generated_at desc
        limit 1
      `,
      [businessId],
    );
    return result.rows[0]?.snapshot ?? null;
  });
}

async function persistAthenaRun(
  brief: AthenaExecutiveBrief,
  liveData: Pick<PrnLiveData, "metrics" | "lastSync" | "endpointHealth">,
  memory: BusinessMemorySnapshot,
  previousSnapshot: AthenaSnapshot | null,
) {
  await ensureAthenaSchema();
  const snapshot = createAthenaSnapshot(liveData, memory, brief.generatedAt);
  snapshot.recommendationIds = brief.topPriorities.map((priority) => priority.id);

  await withTransaction(async (client) => {
    await client.query(
      `
        insert into athena_snapshots (id, business_id, snapshot, generated_at)
        values ($1, $2, $3::jsonb, $4)
      `,
      [randomUUID(), brief.businessId, JSON.stringify(snapshot), brief.generatedAt],
    );
    await client.query(
      `
        insert into athena_audit_events (
          id,
          business_id,
          input_data_timestamps,
          data_sources_used,
          recommendations_selected,
          recommendations_excluded,
          confidence_calculation,
          memory_records_used,
          final_briefing,
          generated_at
        )
        values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10)
      `,
      [
        randomUUID(),
        brief.businessId,
        JSON.stringify({ liveDataLastSync: liveData.lastSync, generatedAt: brief.generatedAt }),
        JSON.stringify(brief.sources),
        JSON.stringify(brief.topPriorities.map((priority) => priority.id)),
        JSON.stringify(buildExcludedRecommendationAudit(brief, previousSnapshot)),
        JSON.stringify(brief.confidence),
        JSON.stringify({
          goals: memory.businessGoals.filter(isActiveMemoryRecord).map((goal) => goal.id),
          priorities: memory.strategicPriorities.filter(isActiveMemoryRecord).map((priority) => priority.id),
          decisions: memory.executiveDecisions.slice(0, 5).map((decision) => decision.id),
          outcomes: memory.recommendationOutcomes.slice(0, 10).map((outcome) => outcome.id),
        }),
        JSON.stringify(brief),
        brief.generatedAt,
      ],
    );
  });
}

export async function ensureAthenaSchema() {
  await withDatabase(async (client) => {
    await client.query(athenaSchemaSql);
  });
}

function buildTopPriorities(input: Parameters<typeof buildAthenaExecutiveBrief>[0], freshness: AthenaExecutiveBrief["dataFreshness"]) {
  const priorities = input.intelligenceRecommendations
    .filter((recommendation) => !isDismissedWithoutNewEvidence(recommendation, input.memory, input.liveData.lastSync))
    .map((recommendation) => mapIntelligencePriority(recommendation, input.memory, freshness));

  for (const action of input.b2bActions || []) {
    if (action.observation.startsWith("Insufficient data")) continue;
    priorities.push(mapInsightPriority(action, "b2b", input.liveData.lastSync, 68));
  }

  for (const action of input.c2bActions || []) {
    if (action.observation.startsWith("Insufficient data")) continue;
    priorities.push(mapInsightPriority(action, "customer_experience", input.liveData.lastSync, 62));
  }

  return priorities
    .filter((priority) => freshness.status === "fresh" || priority.confidence < 90)
    .sort((a, b) => {
      const impactDelta = b.businessImpact.score - a.businessImpact.score;
      return impactDelta !== 0 ? impactDelta : b.confidence - a.confidence;
    });
}

function mapIntelligencePriority(
  recommendation: PrnIntelligenceEngineRecommendation,
  memory: BusinessMemorySnapshot,
  freshness: AthenaExecutiveBrief["dataFreshness"],
): AthenaPriority {
  const memoryInfluence = flattenMemoryInfluence(recommendation.memoryInfluence);
  const confidence = freshness.status === "fresh" ? recommendation.confidence : Math.min(recommendation.confidence, freshness.status === "stale" ? 74 : 65);

  return {
    id: recommendation.id,
    rank: 0,
    title: titleFromRecommendation(recommendation),
    category: mapAthenaCategory(recommendation.category),
    priority: recommendation.priority.toLowerCase() as AthenaPriorityLevel,
    observation: recommendation.observation,
    evidence: recommendation.evidence,
    recommendedAction: confidence < 70 ? "Insufficient verified data to make a reliable recommendation." : recommendation.recommendation,
    whyNow: buildWhyNow(recommendation, memory, freshness),
    businessImpact: {
      score: recommendation.businessImpactScore,
      description: recommendation.businessImpact,
    },
    urgency: mapAthenaUrgency(recommendation.urgency),
    confidence,
    confidenceReason: freshness.status === "fresh" ? recommendation.confidenceReason : `${recommendation.confidenceReason} Confidence reduced because data freshness is ${freshness.status}.`,
    measurement: recommendation.measurement,
    memoryInfluence,
    dataTimestamp: recommendation.dataTimestamp,
  };
}

function mapInsightPriority(
  action: { id: string; label: string; observation: string; evidence: Array<{ metric: string; value: string; source: string }> },
  category: AthenaPriorityCategory,
  dataTimestamp: string,
  impactScore: number,
): AthenaPriority {
  return {
    id: action.id,
    rank: 0,
    title: action.label,
    category,
    priority: "medium",
    observation: action.observation,
    evidence: action.evidence,
    recommendedAction: action.observation,
    whyNow: "This is supported by current verified GoHighLevel records and should be monitored in the next executive review.",
    businessImpact: {
      score: impactScore,
      description: "Operational or customer-experience impact is measurable through the supporting records listed.",
    },
    urgency: "this_month",
    confidence: 75,
    confidenceReason: "Medium confidence based on verified records, with no unsupported forecast.",
    measurement: "Success is measured by follow-up completion and updated supporting records.",
    memoryInfluence: [],
    dataTimestamp,
  };
}

function buildDecisionOfTheDay(priorities: AthenaPriority[], freshness: AthenaExecutiveBrief["dataFreshness"], memory: BusinessMemorySnapshot): AthenaExecutiveBrief["decisionOfTheDay"] {
  if (freshness.status !== "fresh" || priorities.length === 0) {
    return null;
  }

  const top = priorities[0];
  if (top.confidence < 70) {
    return null;
  }

  return {
    id: top.id,
    title: top.title,
    decision: top.observation,
    evidence: top.evidence,
    recommendedAction: top.recommendedAction,
    whyToday: top.whyNow,
    expectedMeasurableResult: top.measurement,
    confidence: top.confidence,
    strategicAlignment: [
      ...memory.businessGoals.filter(isActiveMemoryRecord).slice(0, 2).map((goal) => goal.title),
      ...memory.strategicPriorities.filter(isActiveMemoryRecord).slice(0, 2).map((priority) => priority.title),
    ],
    memoryInfluence: top.memoryInfluence,
  };
}

function calculateAthenaConfidence(
  freshness: AthenaExecutiveBrief["dataFreshness"],
  health: AthenaExecutiveBrief["businessHealth"],
  priorities: AthenaPriority[],
): AthenaExecutiveBrief["confidence"] {
  const recommendationScore = priorities.length > 0 ? Math.round(priorities.reduce((sum, priority) => sum + priority.confidence, 0) / priorities.length) : 35;
  const freshnessPenalty = freshness.status === "fresh" ? 0 : freshness.status === "stale" ? 15 : 25;
  const score = clampScore(Math.round(recommendationScore * 0.55 + health.score * 0.45 - freshnessPenalty));

  return {
    score,
    level: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
    reason: `${score}/100 based on data freshness, Business Health V2, evidence quality, and recommendation confidence.`,
  };
}

function buildAthenaSummary(
  liveData: Pick<PrnLiveData, "metrics">,
  priorities: AthenaPriority[],
  freshness: AthenaExecutiveBrief["dataFreshness"],
  confidence: AthenaExecutiveBrief["confidence"],
) {
  if (priorities.length === 0) {
    return "Insufficient verified data to make a reliable recommendation. Athena needs healthy current data before selecting an executive decision.";
  }

  const top = priorities[0];
  return [
    `Athena reviewed ${liveData.metrics.totalContacts} contacts, ${liveData.metrics.opportunities} opportunities, and ${liveData.metrics.openOpportunities} open opportunities from verified production data`,
    `${top.title}: ${stripPunctuation(top.recommendedAction)}`,
    `Data freshness is ${freshness.status}, and briefing confidence is ${confidence.level} at ${confidence.score}/100`,
  ].join(". ").concat(".");
}

function buildMemoryInfluence(memory: BusinessMemorySnapshot, recommendations: PrnIntelligenceEngineRecommendation[]) {
  const influence = new Set<string>();
  for (const goal of memory.businessGoals.filter(isActiveMemoryRecord).slice(0, 5)) influence.add(`Active goal: ${goal.title}`);
  for (const priority of memory.strategicPriorities.filter(isActiveMemoryRecord).slice(0, 5)) influence.add(`Strategic priority: ${priority.title}`);
  for (const decision of memory.executiveDecisions.filter(isActiveMemoryRecord).slice(0, 5)) influence.add(`Previous decision: ${decision.title}`);
  for (const recommendation of recommendations) {
    for (const item of flattenMemoryInfluence(recommendation.memoryInfluence)) influence.add(item);
  }
  return Array.from(influence).slice(0, 8);
}

function buildWatchList(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth">, memory: BusinessMemorySnapshot, priorities: AthenaPriority[]) {
  const watchList = new Set<string>();
  if (!Object.values(liveData.endpointHealth).every((health) => health.ok)) watchList.add("One or more required GoHighLevel endpoints are unhealthy.");
  if (liveData.metrics.openOpportunities > 50) watchList.add("Open opportunities remain above the V1 executive review threshold.");
  if (memory.businessGoals.some((goal) => goal.status === "at_risk")) watchList.add("At least one user-entered business goal is marked at risk.");
  if (memory.recommendationOutcomes.some((outcome) => ["dismissed", "deferred", "result_unknown"].includes(outcome.result))) watchList.add("Recommendation history includes dismissed, deferred, or unknown outcomes.");
  for (const priority of priorities.filter((item) => item.urgency === "immediate").slice(0, 2)) watchList.add(`Immediate priority: ${priority.title}`);
  return Array.from(watchList).slice(0, 5);
}

function buildWhyNow(
  recommendation: PrnIntelligenceEngineRecommendation,
  memory: BusinessMemorySnapshot,
  freshness: AthenaExecutiveBrief["dataFreshness"],
) {
  if (freshness.status !== "fresh") {
    return `Data freshness is ${freshness.status}; verify current data before acting.`;
  }

  const alignedGoal = memory.businessGoals.filter(isActiveMemoryRecord).find((goal) => recommendation.memoryInfluence.activeGoalsReferenced.includes(goal.title));
  if (alignedGoal) {
    return `This aligns with the active user-entered goal: ${alignedGoal.title}.`;
  }

  if (recommendation.urgency === "Immediate") return "This is recommended now because the verified data indicates immediate executive risk exposure.";
  if (recommendation.urgency === "This Week") return "This is recommended this week because the verified data is above the executive review threshold.";
  return "This should be monitored during the next executive operating review.";
}

function isDismissedWithoutNewEvidence(recommendation: PrnIntelligenceEngineRecommendation, memory: BusinessMemorySnapshot, dataTimestamp: string) {
  return memory.recommendationOutcomes.some((outcome) => {
    if (outcome.recommendationId !== recommendation.id) return false;
    if (!["dismissed", "rejected", "not_pursued"].includes(outcome.result.toLowerCase())) return false;
    if (!outcome.reviewedAt) return true;
    return new Date(outcome.reviewedAt).getTime() >= new Date(dataTimestamp).getTime();
  });
}

function buildExcludedRecommendationAudit(brief: AthenaExecutiveBrief, previousSnapshot: AthenaSnapshot | null) {
  return {
    selectedCount: brief.topPriorities.length,
    previousSnapshotAvailable: Boolean(previousSnapshot),
    note: "Recommendations outside the top five were excluded for executive brevity or insufficient verified evidence.",
  };
}

function metricChange(label: string, previous: number, current: number) {
  if (previous === current) return "";
  const delta = current - previous;
  return `${label} ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}.`;
}

function countChange(label: string, previous: number, current: number) {
  if (previous === current) return "";
  const delta = current - previous;
  return `${label} count ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}.`;
}

function scoreMemoryStatuses(records: Array<{ status: string }>, weights: Record<string, number>) {
  if (records.length === 0) return 60;
  return Math.round(records.reduce((sum, record) => sum + (weights[record.status] ?? 65), 0) / records.length);
}

function scoreOutcomes(records: Array<{ result: string }>) {
  if (records.length === 0) return 60;
  return Math.round(records.reduce((sum, record) => {
    const result = record.result.toLowerCase();
    if (["completed", "improved", "accepted"].includes(result)) return sum + 85;
    if (["dismissed", "rejected"].includes(result)) return sum + 45;
    if (["deferred", "result_unknown"].includes(result)) return sum + 55;
    return sum + 65;
  }, 0) / records.length);
}

function flattenMemoryInfluence(influence: PrnIntelligenceEngineRecommendation["memoryInfluence"]) {
  return [
    ...influence.activeGoalsReferenced.map((item) => `Current business goal: ${item}`),
    ...influence.strategicPrioritiesReferenced.map((item) => `Strategic priority: ${item}`),
    ...influence.pastDecisionsReferenced.map((item) => `Previous decision: ${item}`),
    ...influence.outcomeComparisons.map((item) => `Recorded recommendation outcome: ${item}`),
  ];
}

function mapAthenaCategory(category: PrnIntelligenceEngineRecommendation["category"]): AthenaPriorityCategory {
  if (category === "Sales") return "sales";
  if (category === "Revenue") return "revenue";
  if (category === "Operations") return "operations";
  if (category === "Risk") return "risk";
  if (category === "Customer Experience") return "customer_experience";
  if (category === "Growth") return "growth";
  return "growth";
}

function mapAthenaUrgency(urgency: PrnIntelligenceEngineRecommendation["urgency"]): AthenaUrgency {
  if (urgency === "Immediate") return "immediate";
  if (urgency === "This Week") return "this_week";
  if (urgency === "This Month") return "this_month";
  return "monitor";
}

function titleFromRecommendation(recommendation: PrnIntelligenceEngineRecommendation) {
  const words = recommendation.id.split("-").filter((word) => !["sales", "revenue", "risk", "operations"].includes(word));
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || recommendation.category;
}

function isActiveMemoryRecord(record: { status: string }) {
  return ["active", "in_progress", "open", "approved"].includes(record.status.toLowerCase());
}

function buildGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function stripPunctuation(value: string) {
  return value.replace(/[.!?]+$/g, "");
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

const athenaSchemaSql = `
  create table if not exists athena_snapshots (
    id text primary key,
    business_id text not null,
    snapshot jsonb not null default '{}'::jsonb,
    generated_at timestamptz not null default now()
  );
  create index if not exists athena_snapshots_business_generated_idx
    on athena_snapshots (business_id, generated_at desc);

  create table if not exists athena_audit_events (
    id text primary key,
    business_id text not null,
    input_data_timestamps jsonb not null default '{}'::jsonb,
    data_sources_used jsonb not null default '[]'::jsonb,
    recommendations_selected jsonb not null default '[]'::jsonb,
    recommendations_excluded jsonb not null default '{}'::jsonb,
    confidence_calculation jsonb not null default '{}'::jsonb,
    memory_records_used jsonb not null default '{}'::jsonb,
    final_briefing jsonb not null default '{}'::jsonb,
    generated_at timestamptz not null default now()
  );
  create index if not exists athena_audit_events_business_generated_idx
    on athena_audit_events (business_id, generated_at desc);
`;

export const athenaInternals = {
  buildAthenaExecutiveBrief,
  buildWhatChanged,
  calculateBusinessHealthV2,
  calculateDataFreshness,
  createAthenaSnapshot,
};
