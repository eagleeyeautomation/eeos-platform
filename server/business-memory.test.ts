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
        action: params[4],
        source: params[5],
        snapshot: JSON.parse(String(params[6])),
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
          metadata: JSON.parse(String(params[7])),
          created_at: now,
          updated_at: now,
        };
        rows[table].push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith(`update ${table}`)) {
        const existing = rows[table].find((row) => row.id === params[0] && row.business_id === params[7]);
        if (!existing) return { rows: [] };
        Object.assign(existing, {
          category: params[1],
          title: params[2],
          description: params[3],
          status: params[4],
          source: params[5],
          metadata: JSON.parse(String(params[6])),
          updated_at: new Date("2026-07-13T12:05:00.000Z"),
        });
        return { rows: [existing] };
      }

      if (normalized.includes(`from ${table}`) && normalized.includes("where id = $1")) {
        return { rows: rows[table].filter((row) => row.id === params[0]) };
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
        metadata: JSON.parse(String(params[14])),
        created_at: now,
        updated_at: now,
      };
      rows.recommendation_outcomes.push(row);
      return { rows: [row] };
    }

    if (normalized.startsWith("update recommendation_outcomes")) {
      const existing = rows.recommendation_outcomes.find((row) => row.id === params[0] && row.business_id === params[14]);
      if (!existing) return { rows: [] };
      Object.assign(existing, {
        category: params[1],
        title: params[2],
        description: params[3],
        status: params[4],
        source: params[5],
        recommendation_id: params[6],
        action_taken: params[7],
        expected_outcome: params[8],
        actual_outcome: params[9],
        success_metric: params[10],
        result: params[11],
        reviewed_at: params[12],
        metadata: JSON.parse(String(params[13])),
        updated_at: new Date("2026-07-13T12:05:00.000Z"),
      });
      return { rows: [existing] };
    }

    if (normalized.includes("from recommendation_outcomes") && normalized.includes("where id = $1")) {
      return { rows: rows.recommendation_outcomes.filter((row) => row.id === params[0]) };
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
      target: "$1M annual revenue",
      dueDate: "2026-12-31",
    });
    const snapshot = await loadBusinessMemorySnapshot("test-business");

    expect(goal.id).toBeTruthy();
    expect(snapshot.businessGoals).toHaveLength(1);
    expect(snapshot.businessGoals[0]).toMatchObject({
      businessId: "test-business",
      source: "user",
      title: "Reach $1M annual revenue",
      metadata: {
        target: "$1M annual revenue",
        dueDate: "2026-12-31",
      },
    });
    expect(snapshot.auditTrail[0]).toMatchObject({
      recordType: "business_goal",
      source: "user",
      recordId: goal.id,
    });
  });

  it("updates goals and preserves an audit event with before and after snapshots", async () => {
    const { createBaseMemoryRecord, updateBaseMemoryRecord, loadBusinessMemorySnapshot } = await import("./business-memory");

    const goal = await createBaseMemoryRecord("business_goal", {
      businessId: "test-business",
      category: "revenue",
      title: "Increase recurring revenue",
      description: "Original user-entered goal.",
      status: "planned",
      source: "user",
      priority: "high",
    });
    const updated = await updateBaseMemoryRecord("business_goal", goal.id, {
      status: "active",
      target: "$250k monthly recurring revenue",
    });
    const snapshot = await loadBusinessMemorySnapshot("test-business");

    expect(updated.status).toBe("active");
    expect(updated.metadata).toMatchObject({
      priority: "high",
      target: "$250k monthly recurring revenue",
    });
    expect(snapshot.auditTrail).toHaveLength(2);
    const auditEntry = snapshot.auditTrail.find((entry) => entry.action === "updated");
    expect(auditEntry).toMatchObject({ action: "updated", recordId: goal.id });
    expect(auditEntry?.snapshot).toHaveProperty("before");
    expect(auditEntry?.snapshot).toHaveProperty("after");
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

  it("updates recommendation outcomes without marking success automatically", async () => {
    const { createRecommendationOutcome, updateRecommendationOutcome } = await import("./business-memory");

    const outcome = await createRecommendationOutcome({
      businessId: "test-business",
      category: "sales",
      title: "Track recommendation",
      description: "Outcome requires user confirmation.",
      status: "reviewed",
      source: "user",
      recommendationId: "sales-contact-to-opportunity-coverage",
      actionTaken: "Deferred pending review",
      expectedOutcome: "Cleaner conversion tracking",
      actualOutcome: "Result unknown",
      successMetric: "Matched contacts to opportunities",
      result: "result_unknown",
      reviewedAt: "2026-07-13T12:01:00.000Z",
    });
    const updated = await updateRecommendationOutcome(outcome.id, {
      result: "completed",
      actualOutcome: "User confirmed matching process was completed",
    });

    expect(updated.result).toBe("completed");
    expect(updated.actualOutcome).toBe("User confirmed matching process was completed");
  });
});
