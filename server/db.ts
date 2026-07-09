/**
 * EEOS Database Query Helpers
 * Covers all 8 pipeline layers: Users, GHL Tokens, Signals, Business Memory,
 * Knowledge Graph, Timeline, Audit Log, Recommendations, Feedback, IE Metrics
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every query here feeds the Intelligence Engine with precise, trustworthy data.
 */

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  ghlTokens, GhlToken,
  ghlSignals, GhlSignal,
  businessMemory, BusinessMemory,
  kgNodes, kgEdges,
  timelineEvents, TimelineEvent,
  auditLog,
  recommendations, Recommendation,
  recommendationFeedback,
  ieMetrics,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection
// ─────────────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 0: Users
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: GHL Tokens
// ─────────────────────────────────────────────────────────────────────────────

export type UpsertGhlTokenInput = Partial<Omit<GhlToken, "id">> & {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export async function upsertGhlToken(input: UpsertGhlTokenInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values = {
    tenantId: input.tenantId,
    locationId: input.locationId ?? null,
    companyId: input.companyId ?? null,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    tokenType: input.tokenType ?? "Bearer",
    scope: input.scope ?? null,
    expiresAt: input.expiresAt,
    lastRefreshedAt: input.lastRefreshedAt ?? new Date(),
    refreshFailCount: input.refreshFailCount ?? 0,
    isActive: input.isActive ?? true,
    webhookRegistered: input.webhookRegistered ?? false,
    webhookId: input.webhookId ?? null,
    connectedAt: input.connectedAt ?? new Date(),
  };

  await db.insert(ghlTokens).values(values).onDuplicateKeyUpdate({
    set: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      lastRefreshedAt: input.lastRefreshedAt ?? new Date(),
      refreshFailCount: input.refreshFailCount ?? 0,
      isActive: input.isActive ?? true,
      ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
      ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
      ...(input.webhookRegistered !== undefined ? { webhookRegistered: input.webhookRegistered } : {}),
      ...(input.webhookId !== undefined ? { webhookId: input.webhookId } : {}),
    },
  });
}

export async function getGhlToken(tenantId: string): Promise<GhlToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ghlTokens).where(eq(ghlTokens.tenantId, tenantId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveGhlTokens(): Promise<GhlToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ghlTokens).where(eq(ghlTokens.isActive, true));
}

export async function getTokensNeedingRefresh(): Promise<GhlToken[]> {
  const db = await getDb();
  if (!db) return [];
  // Tokens expiring in the next 10 minutes
  const threshold = new Date(Date.now() + 10 * 60 * 1000);
  return db.select().from(ghlTokens).where(
    and(eq(ghlTokens.isActive, true), lt(ghlTokens.expiresAt, threshold))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: GHL Signals
// ─────────────────────────────────────────────────────────────────────────────

export type InsertSignal = typeof ghlSignals.$inferInsert;

export async function insertSignal(signal: InsertSignal): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ghlSignals).values(signal);
  return Number(result[0].insertId);
}

export async function getRecentSignals(tenantId: string, hours = 24): Promise<GhlSignal[]> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.select().from(ghlSignals).where(
    and(eq(ghlSignals.tenantId, tenantId), gte(ghlSignals.receivedAt, since))
  ).orderBy(desc(ghlSignals.receivedAt)).limit(500);
}

export async function markSignalProcessed(signalId: number, error?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(ghlSignals).set({
    processed: true,
    processedAt: new Date(),
    processingError: error ?? null,
  }).where(eq(ghlSignals.id, signalId));
}

export async function getUnprocessedSignals(tenantId: string, limit = 100): Promise<GhlSignal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ghlSignals).where(
    and(eq(ghlSignals.tenantId, tenantId), eq(ghlSignals.processed, false))
  ).orderBy(ghlSignals.receivedAt).limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3: Business Memory
// ─────────────────────────────────────────────────────────────────────────────

export type BusinessMemoryUpdate = Partial<Omit<BusinessMemory, "id" | "tenantId" | "createdAt">>;

export async function getBusinessMemory(tenantId: string): Promise<BusinessMemory | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businessMemory).where(eq(businessMemory.tenantId, tenantId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertBusinessMemory(tenantId: string, update: BusinessMemoryUpdate): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getBusinessMemory(tenantId);
  if (existing) {
    await db.update(businessMemory).set({ ...update, lastUpdatedAt: new Date() })
      .where(eq(businessMemory.tenantId, tenantId));
  } else {
    await db.insert(businessMemory).values({
      tenantId,
      ...update,
      lastUpdatedAt: new Date(),
      createdAt: new Date(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4: Knowledge Graph
// ─────────────────────────────────────────────────────────────────────────────

export type InsertKgNode = typeof kgNodes.$inferInsert;
export type InsertKgEdge = typeof kgEdges.$inferInsert;

export async function upsertKgNode(node: InsertKgNode): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if node exists
  const existing = await db.select().from(kgNodes).where(
    and(eq(kgNodes.tenantId, node.tenantId), eq(kgNodes.externalId, node.externalId))
  ).limit(1);

  if (existing.length > 0) {
    await db.update(kgNodes).set({
      label: node.label ?? existing[0].label,
      properties: node.properties ?? existing[0].properties,
      signalCount: sql`${kgNodes.signalCount} + 1`,
      lastSeenAt: new Date(),
    }).where(eq(kgNodes.id, existing[0].id));
    return Number(existing[0].id);
  }

  const result = await db.insert(kgNodes).values({
    ...node,
    signalCount: 1,
    lastSeenAt: new Date(),
    createdAt: new Date(),
  });
  return Number(result[0].insertId);
}

export async function insertKgEdge(edge: InsertKgEdge): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(kgEdges).values({ ...edge, createdAt: new Date() });
}

export async function getKnowledgeGraph(tenantId: string) {
  const db = await getDb();
  if (!db) return { nodes: [], edges: [] };
  const [nodes, edges] = await Promise.all([
    db.select().from(kgNodes).where(eq(kgNodes.tenantId, tenantId)).limit(200),
    db.select().from(kgEdges).where(eq(kgEdges.tenantId, tenantId)).limit(500),
  ]);
  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5: Timeline Events
// ─────────────────────────────────────────────────────────────────────────────

export type InsertTimelineEvent = typeof timelineEvents.$inferInsert;

export async function insertTimelineEvent(event: InsertTimelineEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(timelineEvents).values({ ...event, createdAt: new Date() });
}

export async function getTimeline(tenantId: string, limit = 50): Promise<TimelineEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timelineEvents).where(eq(timelineEvents.tenantId, tenantId))
    .orderBy(desc(timelineEvents.occurredAt)).limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6: Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export type InsertAuditEntry = typeof auditLog.$inferInsert;

export async function insertAuditEntry(entry: InsertAuditEntry): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({ ...entry, createdAt: new Date() });
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 7: Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export type InsertRecommendation = typeof recommendations.$inferInsert;

export async function insertRecommendation(rec: InsertRecommendation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recommendations).values({ ...rec, createdAt: new Date(), updatedAt: new Date() });
  return Number(result[0].insertId);
}

export async function getActiveRecommendations(tenantId: string): Promise<Recommendation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recommendations).where(
    and(eq(recommendations.tenantId, tenantId), eq(recommendations.status, "active"))
  ).orderBy(desc(recommendations.createdAt)).limit(20);
}

export async function updateRecommendationStatus(
  id: number,
  status: "active" | "accepted" | "rejected" | "expired" | "superseded"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(recommendations).set({ status, updatedAt: new Date() }).where(eq(recommendations.id, id));
}

export async function expireOldRecommendations(tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(recommendations).set({ status: "expired", updatedAt: now }).where(
    and(
      eq(recommendations.tenantId, tenantId),
      eq(recommendations.status, "active"),
      lt(recommendations.expiresAt, now)
    )
  );
}

export async function getRecommendationById(id: number): Promise<Recommendation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(recommendations).where(eq(recommendations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 8: Recommendation Feedback
// ─────────────────────────────────────────────────────────────────────────────

export type InsertFeedback = typeof recommendationFeedback.$inferInsert;

export async function insertFeedback(feedback: InsertFeedback): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(recommendationFeedback).values({ ...feedback, createdAt: new Date() });
}

export async function getFeedbackForTenant(tenantId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recommendationFeedback).where(eq(recommendationFeedback.tenantId, tenantId))
    .orderBy(desc(recommendationFeedback.decidedAt)).limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// IE Accuracy Metrics
// ─────────────────────────────────────────────────────────────────────────────

export type InsertIeMetrics = typeof ieMetrics.$inferInsert;

export async function upsertIeMetrics(metrics: InsertIeMetrics): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(ieMetrics).values({ ...metrics, computedAt: new Date() });
}

export async function getLatestIeMetrics(tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ieMetrics).where(eq(ieMetrics.tenantId, tenantId))
    .orderBy(desc(ieMetrics.computedAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function computeAndStoreIeMetrics(tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date();

  // Get all feedback in the period
  const feedback = await db.select().from(recommendationFeedback).where(
    and(
      eq(recommendationFeedback.tenantId, tenantId),
      gte(recommendationFeedback.decidedAt, periodStart)
    )
  );

  if (feedback.length === 0) return;

  const total = feedback.length;
  const accepted = feedback.filter(f => f.decision === "accepted").length;
  const rejected = feedback.filter(f => f.decision === "rejected").length;
  const deferred = feedback.filter(f => f.decision === "deferred").length;
  const acceptanceRate = total > 0 ? accepted / total : 0;

  // Get recommendations for confidence calibration
  const recIds = feedback.map(f => f.recommendationId);
  const recs = recIds.length > 0
    ? await db.select().from(recommendations).where(
        and(eq(recommendations.tenantId, tenantId))
      ).limit(100)
    : [];

  const avgPredictedConfidence = recs.length > 0
    ? recs.reduce((sum, r) => sum + r.confidenceScore, 0) / recs.length / 100
    : 0;

  // Outcome-based accuracy (where outcomes are recorded)
  const withOutcomes = feedback.filter(f => f.outcomeRecorded && f.wasAccurate !== null);
  const avgActualAccuracy = withOutcomes.length > 0
    ? withOutcomes.filter(f => f.wasAccurate).length / withOutcomes.length
    : acceptanceRate; // fallback to acceptance rate

  const calibrationError = Math.abs(avgPredictedConfidence - avgActualAccuracy);

  // True/false positive/negative (accepted+positive = TP, accepted+negative = FP, etc.)
  const tp = feedback.filter(f => f.decision === "accepted" && f.outcomeType === "positive").length;
  const fp = feedback.filter(f => f.decision === "accepted" && f.outcomeType === "negative").length;
  const fn = feedback.filter(f => f.decision === "rejected" && f.outcomeType === "positive").length;

  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1Score = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

  await upsertIeMetrics({
    tenantId,
    periodStart,
    periodEnd,
    totalRecommendations: total,
    accepted,
    rejected,
    deferred,
    acceptanceRate,
    avgPredictedConfidence,
    avgActualAccuracy,
    calibrationError,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    f1Score,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TENANT HIERARCHY: Organizations, Memberships, Subaccounts
// ─────────────────────────────────────────────────────────────────────────────

import {
  organizations, Organization,
  memberships, Membership,
  subaccounts, Subaccount,
  membershipUsers,
} from "../drizzle/schema";

// Organizations

export async function getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).where(eq(organizations.isActive, true));
}

export type InsertOrganization = typeof organizations.$inferInsert;

export async function createOrganization(org: InsertOrganization): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizations).values(org);
  return Number(result[0].insertId);
}

// Memberships

export async function getMembershipByOrg(organizationId: number): Promise<Membership | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMembershipById(id: number): Promise<Membership | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberships).where(eq(memberships.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type InsertMembership = typeof memberships.$inferInsert;

export async function createMembership(m: InsertMembership): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(memberships).values(m);
  return Number(result[0].insertId);
}

// Subaccounts

export async function getSubaccountsByMembership(membershipId: number): Promise<Subaccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subaccounts)
    .where(and(eq(subaccounts.membershipId, membershipId), eq(subaccounts.isActive, true)));
}

export async function getSubaccountByGhlLocationId(ghlLocationId: string): Promise<Subaccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subaccounts)
    .where(eq(subaccounts.ghlLocationId, ghlLocationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type InsertSubaccount = typeof subaccounts.$inferInsert;

export async function upsertSubaccount(sub: InsertSubaccount): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSubaccountByGhlLocationId(sub.ghlLocationId);
  if (existing) {
    await db.update(subaccounts).set({
      name: sub.name ?? existing.name,
      ghlCompanyId: sub.ghlCompanyId ?? existing.ghlCompanyId,
      isActive: sub.isActive ?? true,
      updatedAt: new Date(),
    }).where(eq(subaccounts.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(subaccounts).values(sub);
  return Number(result[0].insertId);
}

// Membership Users (RBAC)

export async function getMembershipUser(membershipId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(membershipUsers)
    .where(and(eq(membershipUsers.membershipId, membershipId), eq(membershipUsers.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMembershipUser(
  membershipId: number,
  userId: number,
  role: "owner" | "executive" | "analyst" | "viewer"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(membershipUsers).values({
    membershipId, userId, role, isActive: true, invitedAt: new Date(),
  }).onDuplicateKeyUpdate({ set: { role, isActive: true } });
}

// Convenience: get all subaccounts accessible to a user via their membership
export async function getUserSubaccounts(userId: number): Promise<Array<Subaccount & { membershipId: number; orgName: string }>> {
  const db = await getDb();
  if (!db) return [];

  // Get all active memberships the user belongs to
  const userMemberships = await db.select().from(membershipUsers)
    .where(and(eq(membershipUsers.userId, userId), eq(membershipUsers.isActive, true)));

  if (userMemberships.length === 0) return [];

  const results: Array<Subaccount & { membershipId: number; orgName: string }> = [];

  for (const mu of userMemberships) {
    const membership = await getMembershipById(mu.membershipId);
    if (!membership) continue;
    const org = membership ? await db.select().from(organizations)
      .where(eq(organizations.id, membership.organizationId)).limit(1) : [];
    const subs = await getSubaccountsByMembership(mu.membershipId);
    for (const sub of subs) {
      results.push({ ...sub, membershipId: mu.membershipId, orgName: org[0]?.name ?? "Unknown" });
    }
  }

  return results;
}
