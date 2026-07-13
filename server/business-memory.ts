import type { Express, Request, Response } from "express";
import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { withDatabase, withTransaction } from "./db/postgres";

export const PRN_BUSINESS_ID = "prn-staffers-south-carolina";

export type BusinessMemoryRecordType =
  | "business_goal"
  | "strategic_priority"
  | "executive_decision"
  | "recommendation_outcome"
  | "business_milestone";

export type BusinessMemorySource = "user" | "system";

export type BusinessMemoryBaseRecord = {
  id: string;
  businessId: string;
  category: string;
  title: string;
  description: string;
  status: string;
  source: BusinessMemorySource;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationOutcomeRecord = BusinessMemoryBaseRecord & {
  recommendationId: string;
  actionTaken: string;
  expectedOutcome: string;
  actualOutcome: string;
  successMetric: string;
  result: string;
  reviewedAt: string | null;
};

export type BusinessMemoryAuditEntry = {
  id: string;
  businessId: string;
  recordType: BusinessMemoryRecordType;
  recordId: string;
  action: "created" | "updated";
  source: BusinessMemorySource;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type BusinessMemorySnapshot = {
  businessId: string;
  businessGoals: BusinessMemoryBaseRecord[];
  strategicPriorities: BusinessMemoryBaseRecord[];
  executiveDecisions: BusinessMemoryBaseRecord[];
  recommendationOutcomes: RecommendationOutcomeRecord[];
  businessMilestones: BusinessMemoryBaseRecord[];
  auditTrail: BusinessMemoryAuditEntry[];
};

export type BusinessMemoryCreateInput = {
  businessId?: string;
  category?: string;
  title?: string;
  description?: string;
  status?: string;
  source?: BusinessMemorySource;
};

export type RecommendationOutcomeCreateInput = BusinessMemoryCreateInput & {
  recommendationId?: string;
  actionTaken?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  successMetric?: string;
  result?: string;
  reviewedAt?: string | null;
};

const memoryTables = {
  business_goal: "business_goals",
  strategic_priority: "strategic_priorities",
  executive_decision: "executive_decisions",
  recommendation_outcome: "recommendation_outcomes",
  business_milestone: "business_milestones",
} as const satisfies Record<BusinessMemoryRecordType, string>;

let schemaReady = false;

export function registerBusinessMemoryRoutes(app: Express) {
  app.get("/api/prn/business-memory", async (_req, res) => {
    try {
      const snapshot = await loadBusinessMemorySnapshot(PRN_BUSINESS_ID);
      res.status(200).json({ ok: true, source: "EEOS Business Memory", ...snapshot });
    } catch (error) {
      handleBusinessMemoryError(res, error, "Unable to load Business Memory.");
    }
  });

  app.post("/api/prn/business-memory/goals", async (req, res) => {
    await createBaseMemoryResponse(req, res, "business_goal");
  });

  app.post("/api/prn/business-memory/priorities", async (req, res) => {
    await createBaseMemoryResponse(req, res, "strategic_priority");
  });

  app.post("/api/prn/business-memory/decisions", async (req, res) => {
    await createBaseMemoryResponse(req, res, "executive_decision");
  });

  app.post("/api/prn/business-memory/outcomes", async (req, res) => {
    try {
      const record = await createRecommendationOutcome(req.body);
      res.status(201).json({ ok: true, record });
    } catch (error) {
      handleBusinessMemoryError(res, error, "Unable to create recommendation outcome.");
    }
  });

  app.post("/api/prn/business-memory/milestones", async (req, res) => {
    await createBaseMemoryResponse(req, res, "business_milestone");
  });
}

export async function loadBusinessMemorySnapshot(businessId = PRN_BUSINESS_ID): Promise<BusinessMemorySnapshot> {
  await ensureBusinessMemorySchema();

  return withDatabase(async (client) => ({
    businessId,
    businessGoals: await selectBaseRecords(client, "business_goal", businessId),
    strategicPriorities: await selectBaseRecords(client, "strategic_priority", businessId),
    executiveDecisions: await selectBaseRecords(client, "executive_decision", businessId),
    recommendationOutcomes: await selectRecommendationOutcomes(client, businessId),
    businessMilestones: await selectBaseRecords(client, "business_milestone", businessId),
    auditTrail: await selectAuditTrail(client, businessId),
  }));
}

export async function createBaseMemoryRecord(
  recordType: Exclude<BusinessMemoryRecordType, "recommendation_outcome">,
  input: BusinessMemoryCreateInput,
) {
  const normalized = normalizeBaseInput(input);
  await ensureBusinessMemorySchema();

  return withTransaction(async (client) => {
    const result = await client.query<DbBaseRecord>(
      `
        insert into ${memoryTables[recordType]} (
          id, business_id, category, title, description, status, source, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, now(), now())
        returning id, business_id, category, title, description, status, source, created_at, updated_at
      `,
      [
        randomUUID(),
        normalized.businessId,
        normalized.category,
        normalized.title,
        normalized.description,
        normalized.status,
        normalized.source,
      ],
    );
    const record = mapBaseRecord(result.rows[0]);
    await insertAuditEntry(client, recordType, record.id, record.businessId, record.source, record);
    return record;
  });
}

export async function createRecommendationOutcome(input: RecommendationOutcomeCreateInput) {
  const normalized = normalizeOutcomeInput(input);
  await ensureBusinessMemorySchema();

  return withTransaction(async (client) => {
    const result = await client.query<DbRecommendationOutcomeRecord>(
      `
        insert into recommendation_outcomes (
          id,
          business_id,
          category,
          title,
          description,
          status,
          source,
          recommendation_id,
          action_taken,
          expected_outcome,
          actual_outcome,
          success_metric,
          result,
          reviewed_at,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
        returning
          id,
          business_id,
          category,
          title,
          description,
          status,
          source,
          recommendation_id,
          action_taken,
          expected_outcome,
          actual_outcome,
          success_metric,
          result,
          reviewed_at,
          created_at,
          updated_at
      `,
      [
        randomUUID(),
        normalized.businessId,
        normalized.category,
        normalized.title,
        normalized.description,
        normalized.status,
        normalized.source,
        normalized.recommendationId,
        normalized.actionTaken,
        normalized.expectedOutcome,
        normalized.actualOutcome,
        normalized.successMetric,
        normalized.result,
        normalized.reviewedAt,
      ],
    );
    const record = mapRecommendationOutcome(result.rows[0]);
    await insertAuditEntry(client, "recommendation_outcome", record.id, record.businessId, record.source, record);
    return record;
  });
}

export async function ensureBusinessMemorySchema() {
  if (schemaReady) {
    return;
  }

  await withDatabase(async (client) => {
    await client.query(businessMemorySchemaSql);
  });
  schemaReady = true;
}

async function createBaseMemoryResponse(
  req: Request,
  res: Response,
  recordType: Exclude<BusinessMemoryRecordType, "recommendation_outcome">,
) {
  try {
    const record = await createBaseMemoryRecord(recordType, req.body);
    res.status(201).json({ ok: true, record });
  } catch (error) {
    handleBusinessMemoryError(res, error, "Unable to create Business Memory record.");
  }
}

async function selectBaseRecords(client: PoolClient, recordType: Exclude<BusinessMemoryRecordType, "recommendation_outcome">, businessId: string) {
  const result = await client.query<DbBaseRecord>(
    `
      select id, business_id, category, title, description, status, source, created_at, updated_at
      from ${memoryTables[recordType]}
      where business_id = $1
      order by created_at desc
    `,
    [businessId],
  );

  return result.rows.map(mapBaseRecord);
}

async function selectRecommendationOutcomes(client: PoolClient, businessId: string) {
  const result = await client.query<DbRecommendationOutcomeRecord>(
    `
      select
        id,
        business_id,
        category,
        title,
        description,
        status,
        source,
        recommendation_id,
        action_taken,
        expected_outcome,
        actual_outcome,
        success_metric,
        result,
        reviewed_at,
        created_at,
        updated_at
      from recommendation_outcomes
      where business_id = $1
      order by created_at desc
    `,
    [businessId],
  );

  return result.rows.map(mapRecommendationOutcome);
}

async function selectAuditTrail(client: PoolClient, businessId: string) {
  const result = await client.query<DbAuditEntry>(
    `
      select id, business_id, record_type, record_id, action, source, snapshot, created_at
      from business_memory_audit_entries
      where business_id = $1
      order by created_at desc
      limit 250
    `,
    [businessId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    recordType: row.record_type,
    recordId: row.record_id,
    action: row.action,
    source: row.source,
    snapshot: row.snapshot,
    createdAt: toIso(row.created_at),
  }));
}

async function insertAuditEntry(
  client: PoolClient,
  recordType: BusinessMemoryRecordType,
  recordId: string,
  businessId: string,
  source: BusinessMemorySource,
  snapshot: Record<string, unknown>,
) {
  await client.query(
    `
      insert into business_memory_audit_entries (
        id, business_id, record_type, record_id, action, source, snapshot, created_at
      )
      values ($1, $2, $3, $4, 'created', $5, $6::jsonb, now())
    `,
    [randomUUID(), businessId, recordType, recordId, source, JSON.stringify(snapshot)],
  );
}

function normalizeBaseInput(input: BusinessMemoryCreateInput) {
  const title = requireText(input.title, "title");
  const description = requireText(input.description, "description");

  return {
    businessId: normalizeText(input.businessId) || PRN_BUSINESS_ID,
    category: normalizeText(input.category) || "general",
    title,
    description,
    status: normalizeText(input.status) || "active",
    source: normalizeSource(input.source),
  };
}

function normalizeOutcomeInput(input: RecommendationOutcomeCreateInput) {
  const base = normalizeBaseInput(input);
  const result = normalizeText(input.result) || "recorded";
  const actualOutcome = normalizeText(input.actualOutcome) || "Not reviewed";

  return {
    ...base,
    recommendationId: requireText(input.recommendationId, "recommendationId"),
    actionTaken: requireText(input.actionTaken, "actionTaken"),
    expectedOutcome: requireText(input.expectedOutcome, "expectedOutcome"),
    actualOutcome,
    successMetric: requireText(input.successMetric, "successMetric"),
    result,
    reviewedAt: input.reviewedAt === null ? null : normalizeText(input.reviewedAt) || null,
  };
}

function normalizeSource(source: unknown): BusinessMemorySource {
  return source === "system" ? "system" : "user";
}

function requireText(value: unknown, field: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mapBaseRecord(row: DbBaseRecord): BusinessMemoryBaseRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    category: row.category,
    title: row.title,
    description: row.description,
    status: row.status,
    source: row.source,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapRecommendationOutcome(row: DbRecommendationOutcomeRecord): RecommendationOutcomeRecord {
  return {
    ...mapBaseRecord(row),
    recommendationId: row.recommendation_id,
    actionTaken: row.action_taken,
    expectedOutcome: row.expected_outcome,
    actualOutcome: row.actual_outcome,
    successMetric: row.success_metric,
    result: row.result,
    reviewedAt: row.reviewed_at ? toIso(row.reviewed_at) : null,
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function handleBusinessMemoryError(res: Response, error: unknown, message: string) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const status = errorMessage.includes("required") ? 400 : 500;

  console.error(JSON.stringify({
    level: "error",
    component: "business_memory",
    event: "business_memory.failed",
    error: errorMessage,
  }));

  res.status(status).json({ ok: false, error: message, detail: status === 400 ? errorMessage : undefined });
}

type DbBaseRecord = {
  id: string;
  business_id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  source: BusinessMemorySource;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbRecommendationOutcomeRecord = DbBaseRecord & {
  recommendation_id: string;
  action_taken: string;
  expected_outcome: string;
  actual_outcome: string;
  success_metric: string;
  result: string;
  reviewed_at: Date | string | null;
};

type DbAuditEntry = {
  id: string;
  business_id: string;
  record_type: BusinessMemoryRecordType;
  record_id: string;
  action: "created" | "updated";
  source: BusinessMemorySource;
  snapshot: Record<string, unknown>;
  created_at: Date | string;
};

const baseTableColumns = `
  id text primary key,
  business_id text not null,
  category text not null,
  title text not null,
  description text not null,
  status text not null,
  source text not null check (source in ('user', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
`;

const businessMemorySchemaSql = `
  create table if not exists business_goals (${baseTableColumns});
  create index if not exists business_goals_business_status_idx
    on business_goals (business_id, status, created_at desc);

  create table if not exists strategic_priorities (${baseTableColumns});
  create index if not exists strategic_priorities_business_status_idx
    on strategic_priorities (business_id, status, created_at desc);

  create table if not exists executive_decisions (${baseTableColumns});
  create index if not exists executive_decisions_business_status_idx
    on executive_decisions (business_id, status, created_at desc);

  create table if not exists recommendation_outcomes (
    ${baseTableColumns},
    recommendation_id text not null,
    action_taken text not null,
    expected_outcome text not null,
    actual_outcome text not null,
    success_metric text not null,
    result text not null,
    reviewed_at timestamptz
  );
  create index if not exists recommendation_outcomes_business_recommendation_idx
    on recommendation_outcomes (business_id, recommendation_id, result, reviewed_at desc);

  create table if not exists business_milestones (${baseTableColumns});
  create index if not exists business_milestones_business_status_idx
    on business_milestones (business_id, status, created_at desc);

  create table if not exists business_memory_audit_entries (
    id text primary key,
    business_id text not null,
    record_type text not null,
    record_id text not null,
    action text not null,
    source text not null check (source in ('user', 'system')),
    snapshot jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create index if not exists business_memory_audit_business_created_idx
    on business_memory_audit_entries (business_id, created_at desc);
`;
