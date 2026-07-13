import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

const rows: Record<string, Record<string, unknown>[]> = {
  business_goals: [],
  strategic_priorities: [],
  executive_decisions: [],
  recommendation_outcomes: [],
  business_milestones: [],
  business_memory_audit_entries: [],
};

const client = {
  async query(sql: string, params: unknown[] = []) {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    const now = new Date("2026-07-13T12:00:00.000Z");

    if (normalized.startsWith("create table")) {
      return { rows: [] };
    }

    if (normalized.startsWith("insert into business_memory_audit_entries")) {
      rows.business_memory_audit_entries.push({
        id: params[0],
        business_id: params[1],
        record_type: params[2],
        record_id: params[3],
        action: "created",
        source: params[4],
        snapshot: JSON.parse(String(params[5])),
        created_at: now,
      });
      return { rows: [] };
    }

    for (const table of ["business_goals", "strategic_priorities", "executive_decisions", "business_milestones"]) {
      if (normalized.startsWith(`insert into ${table}`)) {
        const row = {
          id: params[0],
          business_id: params[1],
          category: params[2],
          title: params[3],
          description: params[4],
          status: params[5],
          source: params[6],
          created_at: now,
          updated_at: now,
        };
        rows[table].push(row);
        return { rows: [row] };
      }

      if (normalized.includes(`from ${table}`)) {
        return { rows: rows[table].filter((row) => row.business_id === params[0]) };
      }
    }

    if (normalized.startsWith("insert into recommendation_outcomes")) {
      const row = {
        id: params[0],
        business_id: params[1],
        category: params[2],
        title: params[3],
        description: params[4],
        status: params[5],
        source: params[6],
        recommendation_id: params[7],
        action_taken: params[8],
        expected_outcome: params[9],
        actual_outcome: params[10],
        success_metric: params[11],
        result: params[12],
        reviewed_at: params[13],
        created_at: now,
        updated_at: now,
      };
      rows.recommendation_outcomes.push(row);
      return { rows: [row] };
    }

    if (normalized.includes("from recommendation_outcomes")) {
      return { rows: rows.recommendation_outcomes.filter((row) => row.business_id === params[0]) };
    }

    if (normalized.includes("from business_memory_audit_entries")) {
      return { rows: rows.business_memory_audit_entries.filter((row) => row.business_id === params[0]) };
    }

    return { rows: [] };
  },
} as unknown as PoolClient;

vi.mock("./db/postgres", () => ({
  withDatabase: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback(client)),
  withTransaction: vi.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback(client)),
}));

describe("Business Memory persistence", () => {
  beforeEach(() => {
    for (const key of Object.keys(rows)) {
      rows[key] = [];
    }
  });

  it("persists business goals and preserves the audit trail", async () => {
    const { createBaseMemoryRecord, loadBusinessMemorySnapshot } = await import("./business-memory");

    const goal = await createBaseMemoryRecord("business_goal", {
      businessId: "test-business",
      category: "revenue",
      title: "Reach $1M annual revenue",
      description: "User-entered annual revenue goal.",
      status: "active",
      source: "user",
    });
    const snapshot = await loadBusinessMemorySnapshot("test-business");

    expect(goal.id).toBeTruthy();
    expect(snapshot.businessGoals).toHaveLength(1);
    expect(snapshot.businessGoals[0]).toMatchObject({
      businessId: "test-business",
      source: "user",
      title: "Reach $1M annual revenue",
    });
    expect(snapshot.auditTrail[0]).toMatchObject({
      recordType: "business_goal",
      source: "user",
      recordId: goal.id,
    });
  });

  it("persists executive decisions and recommendation outcomes", async () => {
    const { createBaseMemoryRecord, createRecommendationOutcome, loadBusinessMemorySnapshot } = await import("./business-memory");

    await createBaseMemoryRecord("executive_decision", {
      businessId: "test-business",
      category: "operations",
      title: "Keep weekly pipeline review",
      description: "Leadership approved a weekly review cadence.",
      status: "active",
      source: "user",
    });
    await createRecommendationOutcome({
      businessId: "test-business",
      category: "sales",
      title: "Review open opportunities",
      description: "Outcome for prior opportunity review recommendation.",
      status: "reviewed",
      source: "user",
      recommendationId: "sales-high-open-opportunity-volume",
      actionTaken: "Reviewed stalled opportunities",
      expectedOutcome: "Lower stale opportunity count",
      actualOutcome: "No reduction recorded",
      successMetric: "Open opportunities without next step",
      result: "dismissed",
      reviewedAt: "2026-07-13T12:01:00.000Z",
    });
    const snapshot = await loadBusinessMemorySnapshot("test-business");

    expect(snapshot.executiveDecisions[0]?.title).toBe("Keep weekly pipeline review");
    expect(snapshot.recommendationOutcomes[0]).toMatchObject({
      recommendationId: "sales-high-open-opportunity-volume",
      actualOutcome: "No reduction recorded",
      result: "dismissed",
    });
    expect(snapshot.auditTrail).toHaveLength(2);
  });
});
