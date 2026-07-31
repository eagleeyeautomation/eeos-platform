import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { withDatabase, withTransaction } from "../db/postgres";
import { insertRecommendation } from "../db";
import { buildGroundedCopilotAnswer, calculateExecutivePriority, priorityLabel, validateIntelligenceEvent, type IntelligenceEntity, type IntelligenceEvent } from "./core";

const DEFAULT_CONSUMERS = ["executive_dashboard", "business_health", "financial", "marketing", "operations", "staffing", "notifications", "executive_timeline"];

export async function publishIntelligenceEvent(event: IntelligenceEvent) {
  const validation = validateIntelligenceEvent(event);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const result = await withTransaction(async (client) => {
    const inserted = await client.query(`insert into intelligence_events (id, organization_id, location_id, producer, event_type, category, occurred_at, subject_type, subject_key, payload, evidence, correlation_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12) on conflict (organization_id, producer, id) do nothing returning id`,
      [event.id, event.organizationId, event.locationId ?? null, event.producer, event.type, event.category, event.occurredAt, event.subject?.type ?? null, event.subject?.key ?? null, JSON.stringify(event.payload), JSON.stringify(event.evidence), event.correlationId ?? null]);
    if (!inserted.rowCount) {
      const existing = await client.query<{ id: string; legacyRecommendationId: number | null }>(`select id, legacy_recommendation_id as "legacyRecommendationId" from executive_priority_queue where organization_id=$1 and source_event_id=$2 limit 1`, [event.organizationId, event.id]);
      return { accepted: true, duplicate: true, eventId: event.id, recommendationId: existing.rows[0]?.id ?? null, legacyRecommendationId: existing.rows[0]?.legacyRecommendationId ?? null };
    }
    const organization: IntelligenceEntity = { type: "organization", key: event.organizationId, name: String(event.payload.organizationName ?? "Organization") };
    const entities = [organization, ...(event.locationId ? [{ type: "location" as const, key: event.locationId, name: String(event.payload.locationName ?? event.locationId) }] : []), ...(event.subject ? [event.subject] : []), ...(event.entities ?? [])];
    const ids = new Map<string, string>();
    for (const entity of entities) ids.set(`${entity.type}:${entity.key}`, await upsertEntity(client, event.organizationId, entity, event.occurredAt));
    if (event.locationId) await upsertEdge(client, event.organizationId, ids.get(`organization:${event.organizationId}`)!, ids.get(`location:${event.locationId}`)!, "has_location", {}, event.occurredAt);
    for (const relation of event.relationships ?? []) {
      const from = ids.get(`${relation.from.type}:${relation.from.key}`); const to = ids.get(`${relation.to.type}:${relation.to.key}`);
      if (from && to) await upsertEdge(client, event.organizationId, from, to, relation.type, relation.attributes ?? {}, event.occurredAt);
    }
    await client.query(`insert into unified_business_memory (id, organization_id, memory_key, memory_type, value, source_event_id, confidence, observed_at)
      values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) on conflict (organization_id, memory_key) do update set value=excluded.value, source_event_id=excluded.source_event_id, confidence=excluded.confidence, observed_at=excluded.observed_at, updated_at=now()`,
      [randomUUID(), event.organizationId, `${event.producer}:${event.type}:${event.subject?.key ?? event.locationId ?? "organization"}`, event.category, JSON.stringify(event.payload), event.id, event.recommendation?.factors.confidence ?? 100, event.occurredAt]);
    let recommendationId: string | null = null;
    if (event.recommendation) {
      const priority = calculateExecutivePriority(event.recommendation.factors); recommendationId = randomUUID();
      const result = await client.query<{ id: string }>(`insert into executive_priority_queue (id, organization_id, recommendation_key, source_event_id, title, summary, recommended_action, category, priority_score, confidence, score_components, evidence, location_ids)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb) on conflict (organization_id, recommendation_key) do update set source_event_id=excluded.source_event_id,title=excluded.title,summary=excluded.summary,recommended_action=excluded.recommended_action,category=excluded.category,status='active',priority_score=excluded.priority_score,confidence=excluded.confidence,score_components=excluded.score_components,evidence=excluded.evidence,location_ids=excluded.location_ids,updated_at=now() returning id`,
        [recommendationId, event.organizationId, event.recommendation.key, event.id, event.recommendation.title, event.recommendation.summary, event.recommendation.action, event.category, priority.score, priority.components.confidence, JSON.stringify(priority.components), JSON.stringify(event.evidence), JSON.stringify(event.locationId ? [event.locationId] : [])]);
      recommendationId = result.rows[0].id;
      for (const consumer of event.recommendation.consumers ?? DEFAULT_CONSUMERS) await client.query(`insert into intelligence_distributions (id, organization_id, recommendation_id, consumer) values ($1,$2,$3,$4) on conflict (organization_id, recommendation_id, consumer) do nothing`, [randomUUID(), event.organizationId, recommendationId, consumer]);
    }
    return { accepted: true, duplicate: false, eventId: event.id, recommendationId, legacyRecommendationId: null as number | null };
  });
  if (event.recommendation && event.locationId && result.recommendationId && !result.legacyRecommendationId) {
    const priority = calculateExecutivePriority(event.recommendation.factors);
    const legacyRecommendationId = await insertRecommendation({
      tenantId: event.locationId, title: event.recommendation.title, why: event.recommendation.summary,
      whyNow: `Priority ${priority.score}/100 based on the unified executive scoring contract.`, evidence: event.evidence,
      businessImpact: `Business impact score ${priority.components.businessImpact}/100.`,
      riskLevel: priorityLabel(priority.components.risk), recommendedAction: event.recommendation.action,
      measurementPlan: "Measure the supporting KPI after an executive decision is recorded.",
      confidenceScore: priority.components.confidence, confidenceFactors: priority.components,
      signalCount: event.evidence.length, signalWindowDays: 7,
      category: mapLegacyCategory(event.category), priority: priorityLabel(priority.score),
      ieModelVersion: "4.0", status: "active",
    }, {
      source: event.producer, evidence: event.evidence, strategicPriorityScore: priority.components.strategicValue,
      expectedImpact: event.recommendation.summary, supportingMetrics: [], assumptions: ["Recommendation remains advisory until executive action."],
      predictive: false, confidenceAnatomy: priority.components,
    });
    await withDatabase((client) => client.query(`update executive_priority_queue set legacy_recommendation_id=$3,updated_at=now() where organization_id=$1 and id=$2 and legacy_recommendation_id is null`, [event.organizationId, result.recommendationId, legacyRecommendationId]));
    result.legacyRecommendationId = legacyRecommendationId;
  }
  return result;
}

function mapLegacyCategory(category: IntelligenceEvent["category"]): "revenue" | "pipeline" | "retention" | "operations" | "growth" | "risk" | "team" {
  if (category === "financial") return "revenue";
  if (category === "customer") return "retention";
  if (category === "staffing") return "team";
  if (["growth", "marketing", "referral"].includes(category)) return "growth";
  if (category === "risk") return "risk";
  return "operations";
}

async function upsertEntity(client: PoolClient, organizationId: string, entity: IntelligenceEntity, occurredAt: string) {
  const result = await client.query<{ id: string }>(`insert into executive_graph_entities (id,organization_id,entity_type,external_key,display_name,attributes,first_seen_at,last_seen_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)
    on conflict (organization_id,entity_type,external_key) do update set display_name=excluded.display_name,attributes=executive_graph_entities.attributes || excluded.attributes,last_seen_at=greatest(executive_graph_entities.last_seen_at,excluded.last_seen_at) returning id`, [randomUUID(), organizationId, entity.type, entity.key, entity.name, JSON.stringify(entity.attributes ?? {}), occurredAt]);
  return result.rows[0].id;
}
async function upsertEdge(client: PoolClient, organizationId: string, from: string, to: string, type: string, attributes: Record<string, unknown>, occurredAt: string) {
  await client.query(`insert into executive_graph_edges (id,organization_id,from_entity_id,to_entity_id,relationship_type,attributes,first_seen_at,last_seen_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)
    on conflict (organization_id,from_entity_id,to_entity_id,relationship_type) do update set attributes=executive_graph_edges.attributes || excluded.attributes,last_seen_at=greatest(executive_graph_edges.last_seen_at,excluded.last_seen_at)`, [randomUUID(), organizationId, from, to, type, JSON.stringify(attributes), occurredAt]);
}

export async function getExecutiveContext(organizationId: string, authorizedLocationIds: string[], consumer = "executive_dashboard") {
  return withDatabase(async (client) => {
    const locationFilter = JSON.stringify(authorizedLocationIds);
    const priorities = await client.query(`select q.id,q.title,q.summary,q.recommended_action as "recommendedAction",q.category,q.priority_score as "priorityScore",q.confidence,q.evidence,q.location_ids as "locationIds",q.updated_at as "updatedAt" from executive_priority_queue q where q.organization_id=$1 and q.status='active' and (q.location_ids='[]'::jsonb or q.location_ids ?| $2::text[]) order by q.priority_score desc,q.updated_at desc limit 25`, [organizationId, authorizedLocationIds]);
    const events = await client.query(`select id,event_type as "type",category,producer,occurred_at as "occurredAt",evidence from intelligence_events where organization_id=$1 and (location_id is null or location_id = any($2::text[])) order by occurred_at desc limit 50`, [organizationId, authorizedLocationIds]);
    const memory = await client.query(`select memory_key as "key",memory_type as "type",value,confidence,observed_at as "observedAt" from unified_business_memory where organization_id=$1 order by updated_at desc limit 50`, [organizationId]);
    const graph = await client.query(`select entity_type as "type",count(*)::int as count from executive_graph_entities where organization_id=$1 group by entity_type order by entity_type`, [organizationId]);
    void locationFilter;
    return { organizationId, consumer, priorities: priorities.rows, risks: priorities.rows.filter((x: any) => x.category === "risk"), opportunities: priorities.rows.filter((x: any) => x.category === "growth"), recentEvents: events.rows, memory: memory.rows, graphSummary: graph.rows };
  });
}

export async function askExecutiveCopilot(organizationId: string, authorizedLocationIds: string[], question: string) {
  const context = await getExecutiveContext(organizationId, authorizedLocationIds, "executive_copilot");
  return { ...buildGroundedCopilotAnswer(question, { priorities: context.priorities as any, risks: context.risks as any, opportunities: context.opportunities as any, eventCount: context.recentEvents.length }), organizationId, generatedAt: new Date().toISOString() };
}
