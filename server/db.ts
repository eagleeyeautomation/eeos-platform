/**
 * EEOS Database Query Helpers
 * Covers all 8 pipeline layers: Users, GHL Tokens, Signals, Business Memory,
 * Knowledge Graph, Timeline, Audit Log, Recommendations, Feedback, IE Metrics
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every query here feeds the Intelligence Engine with precise, trustworthy data.
 */

import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  ghlTokens, GhlToken,
  ghlSignals, GhlSignal,
  businessMemory, BusinessMemory,
  kgNodes, kgEdges,
  timelineEvents, TimelineEvent,
  auditLog,
  authSessions,
  passwordResetTokens,
  authInvitations,
  authAuditEvents,
  recommendations, Recommendation,
  recommendationHistory,
  recommendationFeedback,
  ieMetrics,
  c2bConnectors,
  c2bOpportunities,
  c2bOpportunityAudit,
  intelligenceLearningEvents,
  intelligenceOutcomes,
  intelligenceLearningProfiles,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { resolveMysqlUserSubaccounts } from "./db/mysqlIdentityAuthorization";
import { calculateLearningProfile, type LearningSourceType } from "./intelligence-evolution/core";

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

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
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
  if (user.isActive !== undefined) {
    values.isActive = user.isActive;
    updateSet.isActive = user.isActive;
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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const result = await db.select().from(users).where(sql`lower(${users.email}) = ${normalized}`).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function countPlatformAdmins(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return Number(result[0]?.count ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// EEOS First-Party Auth Persistence
// ─────────────────────────────────────────────────────────────────────────────

export type InsertAuthSession = typeof authSessions.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;

export async function createAuthSession(session: InsertAuthSession): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(authSessions).values({
    ...session,
    createdAt: session.createdAt ?? new Date(),
    lastSeenAt: session.lastSeenAt ?? new Date(),
  });
}

export async function getAuthSessionByTokenHash(tokenHash: string): Promise<AuthSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(authSessions).where(eq(authSessions.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function touchAuthSession(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, id));
}

export async function revokeAuthSession(tokenHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, tokenHash));
}

export async function revokeUserAuthSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.userId, userId));
}

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export async function createPasswordResetToken(token: InsertPasswordResetToken): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(passwordResetTokens).values({ ...token, createdAt: token.createdAt ?? new Date() });
}

export async function getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function markPasswordResetTokenUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}

export type InsertAuthInvitation = typeof authInvitations.$inferInsert;
export type AuthInvitation = typeof authInvitations.$inferSelect;

export async function createAuthInvitation(invitation: InsertAuthInvitation): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(authInvitations).values({ ...invitation, createdAt: invitation.createdAt ?? new Date() });
}

export async function getAuthInvitationByTokenHash(tokenHash: string): Promise<AuthInvitation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(authInvitations).where(eq(authInvitations.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function markAuthInvitationAccepted(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authInvitations).set({ acceptedAt: new Date() }).where(eq(authInvitations.id, id));
}

export type InsertAuthAuditEvent = typeof authAuditEvents.$inferInsert;

export async function insertAuthAuditEvent(event: InsertAuthAuditEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(authAuditEvents).values({ ...event, createdAt: new Date() });
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

export async function getAllGhlTokens(): Promise<GhlToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ghlTokens);
}

export async function inspectLegacyGhlBinding(locationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [tokens, linkedSubaccounts] = await Promise.all([
    db.select().from(ghlTokens).where(eq(ghlTokens.tenantId, locationId)).limit(1),
    db.select().from(subaccounts).where(eq(subaccounts.ghlLocationId, locationId)).limit(1),
  ]);
  const token = tokens[0];
  const subaccount = linkedSubaccounts[0];
  return {
    connection: token ? {
      id: token.id,
      providerLocationId: token.locationId ?? token.tenantId,
      tenantId: token.tenantId,
      tokenType: token.scope === "private_integration" ? "private_integration" : (token.tokenType ?? "unknown"),
      active: Boolean(token.isActive),
      expiresAt: toIso(token.expiresAt),
      lastRefreshedAt: toIso(token.lastRefreshedAt),
      refreshFailCount: token.refreshFailCount ?? 0,
      connectedAt: toIso(token.connectedAt),
      updatedAt: toIso(token.updatedAt),
    } : null,
    subaccount: subaccount ? {
      id: subaccount.id,
      membershipId: subaccount.membershipId,
      name: subaccount.name,
      city: subaccount.city,
      state: subaccount.state,
      active: Boolean(subaccount.isActive),
    } : null,
  };
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

export async function deleteDemoTimelineEvents(tenantIds: string[], entityId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const tenantId of tenantIds) await db.delete(timelineEvents).where(and(eq(timelineEvents.tenantId, tenantId), eq(timelineEvents.entityId, entityId)));
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

export type RecommendationIntelligenceContract = {
  source: string;
  evidence: unknown[];
  strategicPriorityScore: number;
  expectedImpact: string;
  supportingMetrics: unknown[];
  assumptions: string[];
  predictive: boolean;
  confidenceAnatomy: Record<string, number>;
};

let recommendationHistorySchemaReady = false;
async function ensureRecommendationHistorySchema() {
  if (recommendationHistorySchemaReady) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS recommendation_history (
      id bigint AUTO_INCREMENT PRIMARY KEY, recommendationId int NOT NULL, tenantId varchar(128) NOT NULL,
      eventType enum('generated','accepted','rejected','outcome','calibrated','expired','superseded') NOT NULL,
      source varchar(128) NOT NULL, evidence json NOT NULL, confidence int NOT NULL, priority varchar(32) NOT NULL,
      strategicPriorityScore int NOT NULL, expectedImpact text NOT NULL, businessReason text NOT NULL,
      supportingMetrics json NOT NULL, assumptions json NOT NULL, predictive boolean NOT NULL DEFAULT false,
      metadata json, occurredAt timestamp NOT NULL, createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_recommendation_history_tenant (tenantId,occurredAt),
      KEY idx_recommendation_history_rec (recommendationId,occurredAt)
    )
  `));
  recommendationHistorySchemaReady = true;
}

export async function insertRecommendation(
  rec: InsertRecommendation,
  contract: RecommendationIntelligenceContract,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureRecommendationHistorySchema();
  return db.transaction(async (tx) => {
    const now = new Date();
    const result = await tx.insert(recommendations).values({ ...rec, createdAt: now, updatedAt: now });
    const recommendationId = Number(result[0].insertId);
    await tx.insert(recommendationHistory).values({
      recommendationId, tenantId: rec.tenantId, eventType: "generated",
      source: contract.source, evidence: contract.evidence, confidence: rec.confidenceScore,
      priority: rec.priority, strategicPriorityScore: contract.strategicPriorityScore,
      expectedImpact: contract.expectedImpact, businessReason: rec.why,
      supportingMetrics: contract.supportingMetrics, assumptions: contract.assumptions,
      predictive: contract.predictive, metadata: { confidenceAnatomy: contract.confidenceAnatomy },
      occurredAt: now,
    });
    await tx.insert(timelineEvents).values({
      tenantId: rec.tenantId, eventType: "intelligence.recommendation_generated",
      title: rec.title, description: rec.why, entityType: "recommendation",
      entityId: String(recommendationId), significance: rec.priority,
      businessImpact: contract.expectedImpact,
      metadata: {
        source: contract.source, confidence: rec.confidenceScore,
        strategicPriorityScore: contract.strategicPriorityScore,
        predictive: contract.predictive,
      },
      occurredAt: now, createdAt: now,
    });
    return recommendationId;
  });
}

export async function getRecommendationHistory(tenantIds: string[]) {
  const db = await getDb();
  if (!db || !tenantIds.length) return [];
  await ensureRecommendationHistorySchema();
  return db.select().from(recommendationHistory)
    .where(inArray(recommendationHistory.tenantId, tenantIds))
    .orderBy(desc(recommendationHistory.occurredAt)).limit(100);
}

export async function getLearningProfilesForTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  await ensureIntelligenceEvolutionSchema();
  return db.select().from(intelligenceLearningProfiles)
    .where(eq(intelligenceLearningProfiles.tenantId, tenantId));
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
  await ensureRecommendationHistorySchema();
  const recommendation = (await db.select().from(recommendations).where(eq(recommendations.id, id)).limit(1))[0];
  await db.update(recommendations).set({ status, updatedAt: new Date() }).where(eq(recommendations.id, id));
  const latest = (await db.select().from(recommendationHistory)
    .where(eq(recommendationHistory.recommendationId, id))
    .orderBy(desc(recommendationHistory.occurredAt)).limit(1))[0];
  if (recommendation && latest && ["accepted", "rejected", "expired", "superseded"].includes(status)) {
    await db.insert(recommendationHistory).values({
      ...latest, id: undefined, eventType: status as "accepted" | "rejected" | "expired" | "superseded",
      occurredAt: new Date(), createdAt: new Date(),
    });
  }
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

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
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

export async function getAllSubaccountsByMembership(membershipId: number): Promise<Subaccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subaccounts)
    .where(eq(subaccounts.membershipId, membershipId));
}

export async function getAllSubaccounts(): Promise<Subaccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subaccounts);
}

export async function getSubaccountByGhlLocationId(ghlLocationId: string): Promise<Subaccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subaccounts)
    .where(eq(subaccounts.ghlLocationId, ghlLocationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type InsertSubaccount = typeof subaccounts.$inferInsert;

export type MetadataOnlySubaccountInput = {
  membershipId: number;
  providerLocationId: string;
  name: string;
  city: string;
  state: string;
};

export type MetadataOnlySubaccountResult =
  | { created: true; id: number }
  | { created: false; reason: "provider_binding_exists" | "location_exists" };

export async function createMetadataOnlySubaccount(
  input: MetadataOnlySubaccountInput,
): Promise<MetadataOnlySubaccountResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingBinding = await db.select({ id: subaccounts.id }).from(subaccounts)
    .where(eq(subaccounts.ghlLocationId, input.providerLocationId))
    .limit(1);
  if (existingBinding.length > 0) {
    return { created: false, reason: "provider_binding_exists" };
  }

  const existingLocation = await db.select({ id: subaccounts.id }).from(subaccounts)
    .where(and(
      eq(subaccounts.membershipId, input.membershipId),
      eq(subaccounts.name, input.name),
      eq(subaccounts.city, input.city),
      eq(subaccounts.state, input.state),
    ))
    .limit(1);
  if (existingLocation.length > 0) {
    return { created: false, reason: "location_exists" };
  }

  try {
    const result = await db.insert(subaccounts).values({
      membershipId: input.membershipId,
      ghlLocationId: input.providerLocationId,
      name: input.name,
      city: input.city,
      state: input.state,
      timezone: "America/New_York",
      isActive: true,
      ieEnabled: true,
    });
    return { created: true, id: Number(result[0].insertId) };
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "ER_DUP_ENTRY"
    ) {
      return { created: false, reason: "provider_binding_exists" };
    }
    throw error;
  }
}

export async function createVerifiedGhlSubaccount(input: {
  membershipId: number;
  providerLocationId: string;
  name: string;
  city: string;
  state: string;
}): Promise<MetadataOnlySubaccountResult> {
  return createMetadataOnlySubaccount(input);
}

export async function deleteVerifiedGhlSubaccount(id: number, providerLocationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subaccounts).where(and(
    eq(subaccounts.id, id),
    eq(subaccounts.ghlLocationId, providerLocationId),
  ));
}

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
  return resolveMysqlUserSubaccounts(userId, {
    getActiveMembershipLinks: async (requestedUserId) => db.select().from(membershipUsers)
      .where(and(eq(membershipUsers.userId, requestedUserId), eq(membershipUsers.isActive, true))),
    getMembershipById,
    getOrganizationById,
    getActiveSubaccountsByMembershipId: getSubaccountsByMembership,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ADMINISTRATION: Safe read-only operational views
// ─────────────────────────────────────────────────────────────────────────────

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function latestIso(values: Array<Date | string | null | undefined>): string | null {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export async function getPlatformAdminData() {
  const db = await getDb();
  if (!db) {
    return {
      database: { connected: false as const, checkedAt: new Date().toISOString() },
      organizations: [],
      memberships: [],
      subaccounts: [],
      ghlConnections: [],
      users: [],
      sessions: [],
      invitations: [],
      passwordResets: [],
      authAuditEvents: [],
      signals: [],
      timelineEvents: [],
      recommendations: [],
      feedback: [],
      ieMetrics: [],
      knowledgeNodes: [],
      knowledgeEdges: [],
      businessMemory: [],
    };
  }

  const [
    organizationRows,
    membershipRows,
    subaccountRows,
    ghlTokenRows,
    userRows,
    sessionRows,
    invitationRows,
    passwordResetRows,
    authAuditRows,
    signalRows,
    timelineRows,
    recommendationRows,
    feedbackRows,
    ieMetricRows,
    nodeRows,
    edgeRows,
    memoryRows,
  ] = await Promise.all([
    db.select().from(organizations),
    db.select().from(memberships),
    db.select().from(subaccounts),
    db.select().from(ghlTokens),
    db.select().from(users),
    db.select().from(authSessions).orderBy(desc(authSessions.createdAt)).limit(50),
    db.select().from(authInvitations).orderBy(desc(authInvitations.createdAt)).limit(50),
    db.select().from(passwordResetTokens).orderBy(desc(passwordResetTokens.createdAt)).limit(50),
    db.select().from(authAuditEvents).orderBy(desc(authAuditEvents.createdAt)).limit(100),
    db.select().from(ghlSignals).orderBy(desc(ghlSignals.receivedAt)).limit(500),
    db.select().from(timelineEvents).orderBy(desc(timelineEvents.occurredAt)).limit(100),
    db.select().from(recommendations).orderBy(desc(recommendations.createdAt)).limit(100),
    db.select().from(recommendationFeedback).orderBy(desc(recommendationFeedback.createdAt)).limit(100),
    db.select().from(ieMetrics).orderBy(desc(ieMetrics.computedAt)).limit(100),
    db.select().from(kgNodes).limit(500),
    db.select().from(kgEdges).limit(500),
    db.select().from(businessMemory),
  ]);

  return {
    database: { connected: true as const, checkedAt: new Date().toISOString() },
    organizations: organizationRows,
    memberships: membershipRows,
    subaccounts: subaccountRows,
    ghlConnections: ghlTokenRows.map((token) => ({
      id: token.id,
      tenantId: token.tenantId,
      locationId: token.locationId,
      companyId: token.companyId,
      tokenType: token.scope === "private_integration" ? "private_integration" : (token.tokenType ?? "unknown"),
      scope: token.scope,
      isActive: Boolean(token.isActive),
      webhookRegistered: Boolean(token.webhookRegistered),
      connectedAt: toIso(token.connectedAt),
      updatedAt: toIso(token.updatedAt),
      expiresAt: toIso(token.expiresAt),
      refreshFailCount: token.refreshFailCount ?? 0,
    })),
    users: userRows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: toIso(user.createdAt),
      lastSignedIn: toIso(user.lastSignedIn),
    })),
    sessions: sessionRows.map((session) => ({
      id: session.id,
      userId: session.userId,
      createdAt: toIso(session.createdAt),
      lastSeenAt: toIso(session.lastSeenAt),
      expiresAt: toIso(session.expiresAt),
      revokedAt: toIso(session.revokedAt),
    })),
    invitations: invitationRows.map((invite) => ({
      id: invite.id,
      email: invite.email,
      organizationId: invite.organizationId,
      membershipId: invite.membershipId,
      role: invite.role,
      createdAt: toIso(invite.createdAt),
      expiresAt: toIso(invite.expiresAt),
      acceptedAt: toIso(invite.acceptedAt),
    })),
    passwordResets: passwordResetRows.map((reset) => ({
      id: reset.id,
      userId: reset.userId,
      createdAt: toIso(reset.createdAt),
      expiresAt: toIso(reset.expiresAt),
      usedAt: toIso(reset.usedAt),
    })),
    authAuditEvents: authAuditRows.map((event) => ({
      id: event.id,
      actorUserId: event.actorUserId,
      organizationId: event.organizationId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      createdAt: toIso(event.createdAt),
    })),
    signals: signalRows.map((signal) => ({
      id: signal.id,
      tenantId: signal.tenantId,
      signalType: signal.signalType,
      processed: signal.processed,
      processingError: signal.processingError ? "present" : null,
      receivedAt: toIso(signal.receivedAt),
    })),
    timelineEvents: timelineRows.map((event) => ({
      id: event.id,
      tenantId: event.tenantId,
      eventType: event.eventType,
      title: event.title,
      significance: event.significance,
      occurredAt: toIso(event.occurredAt),
    })),
    recommendations: recommendationRows.map((recommendation) => ({
      id: recommendation.id,
      tenantId: recommendation.tenantId,
      title: recommendation.title,
      category: recommendation.category,
      priority: recommendation.priority,
      status: recommendation.status,
      confidenceScore: recommendation.confidenceScore,
      createdAt: toIso(recommendation.createdAt),
    })),
    feedback: feedbackRows.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      recommendationId: item.recommendationId,
      decision: item.decision,
      outcomeRecorded: item.outcomeRecorded,
      decidedAt: toIso(item.decidedAt),
    })),
    ieMetrics: ieMetricRows.map((metrics) => ({
      id: metrics.id,
      tenantId: metrics.tenantId,
      totalRecommendations: metrics.totalRecommendations ?? 0,
      accepted: metrics.accepted ?? 0,
      rejected: metrics.rejected ?? 0,
      deferred: metrics.deferred ?? 0,
      acceptanceRate: metrics.acceptanceRate ?? 0,
      precision: metrics.precision ?? 0,
      recall: metrics.recall ?? 0,
      f1Score: metrics.f1Score ?? 0,
      computedAt: toIso(metrics.computedAt),
    })),
    knowledgeNodes: nodeRows.map((node) => ({
      id: node.id,
      tenantId: node.tenantId,
      nodeType: node.nodeType,
      signalCount: node.signalCount ?? 0,
      lastSeenAt: toIso(node.lastSeenAt),
    })),
    knowledgeEdges: edgeRows.map((edge) => ({
      id: edge.id,
      tenantId: edge.tenantId,
      relationshipType: edge.relationshipType,
      createdAt: toIso(edge.createdAt),
    })),
    businessMemory: memoryRows.map((memory) => ({
      tenantId: memory.tenantId,
      healthScore: memory.healthScore ?? null,
      totalPipelineValue: memory.totalPipelineValue ?? null,
      activeOpportunities: memory.activeOpportunities ?? null,
      totalContacts: memory.totalContacts ?? null,
      lastSignalAt: toIso(memory.lastSignalAt),
      lastUpdatedAt: toIso(memory.lastUpdatedAt),
    })),
  };
}

export async function getPlatformAdminOverview() {
  const data = await getPlatformAdminData();
  const activeOrganizations = data.organizations.filter((org) => org.isActive).length;
  const activeSubaccounts = data.subaccounts.filter((subaccount) => subaccount.isActive).length;
  const connectedLocations = data.ghlConnections.filter((connection) => connection.isActive).length;
  const activeUsers = data.users.filter((user) => user.isActive).length;
  const activeSessions = data.sessions.filter((session) => !session.revokedAt && (!session.expiresAt || new Date(session.expiresAt) > new Date())).length;

  return {
    database: data.database,
    counts: {
      organizations: data.organizations.length,
      activeOrganizations,
      memberships: data.memberships.length,
      subaccounts: data.subaccounts.length,
      activeSubaccounts,
      connectedLocations,
      users: data.users.length,
      activeUsers,
      activeSessions,
      pendingInvitations: data.invitations.filter((invite) => !invite.acceptedAt && new Date(invite.expiresAt ?? 0) > new Date()).length,
      auditEvents: data.authAuditEvents.length,
      signals: data.signals.length,
      recommendations: data.recommendations.length,
      ieMetrics: data.ieMetrics.length,
    },
    latest: {
      organizationCreatedAt: latestIso(data.organizations.map((org) => org.createdAt)),
      subaccountConnectedAt: latestIso(data.subaccounts.map((subaccount) => subaccount.connectedAt)),
      ghlConnectedAt: latestIso(data.ghlConnections.map((connection) => connection.connectedAt)),
      auditEventAt: latestIso(data.authAuditEvents.map((event) => event.createdAt)),
      signalAt: latestIso(data.signals.map((signal) => signal.receivedAt)),
      ieMetricAt: latestIso(data.ieMetrics.map((metrics) => metrics.computedAt)),
    },
  };
}

export async function getPlatformOrganizationDetails() {
  const data = await getPlatformAdminData();
  return data.organizations.map((org) => {
    const orgMemberships = data.memberships.filter((membership) => membership.organizationId === org.id);
    const membershipIds = new Set(orgMemberships.map((membership) => membership.id));
    const orgSubaccounts = data.subaccounts.filter((subaccount) => membershipIds.has(subaccount.membershipId));
    const subaccountIds = new Set(orgSubaccounts.map((subaccount) => subaccount.ghlLocationId));
    const connectedLocations = data.ghlConnections.filter((connection) => connection.isActive && subaccountIds.has(connection.tenantId));
    const ownerInvites = data.invitations.filter((invite) => invite.organizationId === org.id);

    return {
      id: org.id,
      slug: org.slug,
      name: org.name,
      type: org.type,
      industry: org.industry,
      website: org.website,
      isActive: org.isActive,
      createdAt: toIso(org.createdAt),
      memberships: orgMemberships.map((membership) => ({
        id: membership.id,
        plan: membership.plan,
        status: membership.status,
        ieEnabled: membership.ieEnabled,
        maxSubaccounts: membership.maxSubaccounts,
        createdAt: toIso(membership.createdAt),
      })),
      subaccountCount: orgSubaccounts.length,
      activeSubaccountCount: orgSubaccounts.filter((subaccount) => subaccount.isActive).length,
      connectedLocationCount: connectedLocations.length,
      pendingInvitationCount: ownerInvites.filter((invite) => !invite.acceptedAt).length,
    };
  });
}

export async function getPlatformOnboardingSummary() {
  const organizationsWithDetails = await getPlatformOrganizationDetails();

  return organizationsWithDetails
    .filter((organization) => organization.type === "customer")
    .map((organization) => {
      const activeMembership = organization.memberships.find((membership) => membership.status === "active" || membership.status === "trial");
      let status = "No active membership";
      if (activeMembership && organization.connectedLocationCount > 0) {
        status = "Connected";
      } else if (activeMembership && organization.subaccountCount > 0) {
        status = "Awaiting GoHighLevel connection";
      } else if (activeMembership) {
        status = "Awaiting business system setup";
      }

      return {
        organizationId: organization.id,
        organizationName: organization.name,
        plan: activeMembership?.plan ?? null,
        membershipStatus: activeMembership?.status ?? null,
        subaccounts: organization.subaccountCount,
        connectedLocations: organization.connectedLocationCount,
        pendingInvitations: organization.pendingInvitationCount,
        status,
      };
    });
}

export async function getPlatformIntegrationSummary() {
  const data = await getPlatformAdminData();
  return {
    providers: [
      {
        provider: "GoHighLevel",
        activeConnections: data.ghlConnections.filter((connection) => connection.isActive).length,
        totalConnections: data.ghlConnections.length,
        latestConnectedAt: latestIso(data.ghlConnections.map((connection) => connection.connectedAt)),
      },
    ],
    connections: data.ghlConnections.map((connection) => {
      const subaccount = data.subaccounts.find((item) => item.ghlLocationId === connection.tenantId || item.ghlLocationId === connection.locationId);
      const membership = subaccount ? data.memberships.find((item) => item.id === subaccount.membershipId) : undefined;
      const organization = membership ? data.organizations.find((item) => item.id === membership.organizationId) : undefined;
      return {
        provider: "GoHighLevel",
        subaccountName: subaccount?.name ?? "Unknown location",
        organizationName: organization?.name ?? null,
        tenantId: connection.tenantId,
        locationId: connection.locationId,
        companyId: connection.companyId,
        connected: connection.isActive,
        tokenType: connection.tokenType,
        connectedAt: connection.connectedAt,
        updatedAt: connection.updatedAt,
        webhookRegistered: connection.webhookRegistered,
        refreshFailCount: connection.refreshFailCount,
      };
    }),
  };
}

export async function getPlatformHealthSummary() {
  const data = await getPlatformAdminData();
  const now = new Date().toISOString();
  return {
    checkedAt: now,
    database: data.database,
    services: [
      { name: "First-party authentication", status: data.database.connected ? "online" : "unavailable", detail: `${data.users.length} user record(s)` },
      { name: "Tenant registry", status: data.database.connected ? "online" : "unavailable", detail: `${data.organizations.length} organization record(s)` },
      { name: "GoHighLevel PIT storage", status: data.database.connected ? "online" : "unavailable", detail: `${data.ghlConnections.filter((connection) => connection.isActive).length} active connection(s)` },
      { name: "Intelligence Engine records", status: data.database.connected ? "online" : "unavailable", detail: `${data.ieMetrics.length} metric record(s)` },
    ],
    latestActivityAt: latestIso([
      ...data.authAuditEvents.map((event) => event.createdAt),
      ...data.signals.map((signal) => signal.receivedAt),
      ...data.timelineEvents.map((event) => event.occurredAt),
    ]),
  };
}

export async function getPlatformAuditActivity() {
  const data = await getPlatformAdminData();
  return {
    events: data.authAuditEvents,
    totalReturned: data.authAuditEvents.length,
  };
}

export async function getPlatformSupportSummary() {
  const data = await getPlatformAdminData();
  const activeSessionUserIds = new Set(
    data.sessions
      .filter((session) => !session.revokedAt && (!session.expiresAt || new Date(session.expiresAt) > new Date()))
      .map((session) => session.userId)
  );

  return {
    pendingInvitations: data.invitations.filter((invite) => !invite.acceptedAt),
    recentPasswordResets: data.passwordResets,
    activeSessionCount: activeSessionUserIds.size,
    supportRequests: [] as Array<never>,
    emptyState: "No dedicated support requests have been recorded yet.",
  };
}

export async function getPlatformAiOperationsSummary() {
  const data = await getPlatformAdminData();
  return {
    counts: {
      businessMemoryRecords: data.businessMemory.length,
      knowledgeNodes: data.knowledgeNodes.length,
      knowledgeEdges: data.knowledgeEdges.length,
      timelineEvents: data.timelineEvents.length,
      recommendations: data.recommendations.length,
      feedback: data.feedback.length,
      ieMetrics: data.ieMetrics.length,
      signals: data.signals.length,
    },
    latestMetricAt: latestIso(data.ieMetrics.map((metric) => metric.computedAt)),
    latestSignalAt: latestIso(data.signals.map((signal) => signal.receivedAt)),
    recentRecommendations: data.recommendations.slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// C2B Intelligence Engine
// ─────────────────────────────────────────────────────────────────────────────

let c2bSchemaReady = false;

async function ensureC2bSchema() {
  if (c2bSchemaReady) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS c2b_connectors (
      id int AUTO_INCREMENT PRIMARY KEY,
      organizationId int NOT NULL,
      connectorKey varchar(64) NOT NULL,
      displayName varchar(128) NOT NULL,
      connectorType enum('search','crm','csv','website','directory','referral','government') NOT NULL,
      enabled boolean NOT NULL DEFAULT false,
      approvalStatus enum('draft','approved','suspended') NOT NULL DEFAULT 'draft',
      configuration json,
      lastRunAt timestamp NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY c2b_connector_org_key_unique (organizationId, connectorKey),
      KEY idx_c2b_connector_org (organizationId)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS c2b_opportunities (
      id int AUTO_INCREMENT PRIMARY KEY,
      opportunityId varchar(64) NOT NULL UNIQUE,
      organizationId int NOT NULL,
      tenantId varchar(128) NOT NULL,
      type varchar(64) NOT NULL,
      name varchar(256) NOT NULL,
      businessName varchar(256),
      city varchar(128),
      state varchar(64),
      zip varchar(20),
      source varchar(128) NOT NULL,
      sourceUrl text,
      discoveredAt timestamp NOT NULL,
      summary text NOT NULL,
      reasonRelevant text NOT NULL,
      scoring json NOT NULL,
      recommendedNextAction text NOT NULL,
      status enum('new','qualified','high_priority','pending_review','approved','rejected','research','assigned','pending_ghl','converted') NOT NULL DEFAULT 'new',
      assignedUserId int,
      duplicateStatus enum('unchecked','unique','possible','duplicate') NOT NULL DEFAULT 'unchecked',
      consentStatus enum('unknown','not_required','confirmed','declined') NOT NULL DEFAULT 'unknown',
      ghlStatus enum('not_requested','pending_approval','approved','queued','converted','failed') NOT NULL DEFAULT 'not_requested',
      estimatedPipelineValue int NOT NULL DEFAULT 0,
      referralPartner boolean NOT NULL DEFAULT false,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_c2b_opportunity_org_status (organizationId, status),
      KEY idx_c2b_opportunity_tenant (tenantId),
      KEY idx_c2b_opportunity_source (organizationId, source),
      KEY idx_c2b_opportunity_state (organizationId, state)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS c2b_opportunity_audit (
      id bigint AUTO_INCREMENT PRIMARY KEY,
      opportunityId int NOT NULL,
      organizationId int NOT NULL,
      actorUserId int,
      action varchar(64) NOT NULL,
      previousStatus varchar(32),
      nextStatus varchar(32),
      details json,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_c2b_audit_opportunity (opportunityId, createdAt),
      KEY idx_c2b_audit_org (organizationId, createdAt)
    )
  `));
  const connectorColumns = await db.execute(sql.raw(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'c2b_connectors' AND COLUMN_NAME = 'intelligenceDomain'
  `));
  if (!(connectorColumns as any)[0]?.length) {
    try {
      await db.execute(sql.raw(`ALTER TABLE c2b_connectors ADD COLUMN intelligenceDomain enum('c2c','c2b','b2b') NOT NULL DEFAULT 'c2b' AFTER organizationId`));
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string }; message?: string };
      if (databaseError.code !== "ER_DUP_FIELDNAME"
        && databaseError.cause?.code !== "ER_DUP_FIELDNAME"
        && !databaseError.message?.includes("Duplicate column")) throw error;
    }
  }
  const opportunityColumns = await db.execute(sql.raw(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'c2b_opportunities' AND COLUMN_NAME = 'intelligenceDomain'
  `));
  if (!(opportunityColumns as any)[0]?.length) {
    try {
      await db.execute(sql.raw(`ALTER TABLE c2b_opportunities ADD COLUMN intelligenceDomain enum('c2c','c2b','b2b') NOT NULL DEFAULT 'c2b' AFTER tenantId`));
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string }; message?: string };
      if (databaseError.code !== "ER_DUP_FIELDNAME"
        && databaseError.cause?.code !== "ER_DUP_FIELDNAME"
        && !databaseError.message?.includes("Duplicate column")) throw error;
    }
  }
  c2bSchemaReady = true;
}

export async function listC2bOpportunities(organizationId: number, tenantIds: string[], intelligenceDomain: "c2c" | "c2b" | "b2b" = "c2b") {
  const db = await getDb();
  if (!db || tenantIds.length === 0) return [];
  await ensureC2bSchema();
  return db.select().from(c2bOpportunities)
    .where(and(
      eq(c2bOpportunities.organizationId, organizationId),
      inArray(c2bOpportunities.tenantId, tenantIds),
      eq(c2bOpportunities.intelligenceDomain, intelligenceDomain),
    ))
    .orderBy(desc(c2bOpportunities.createdAt));
}

export async function listC2bConnectors(organizationId: number, intelligenceDomain: "c2c" | "c2b" | "b2b" = "c2b") {
  const db = await getDb();
  if (!db) return [];
  await ensureC2bSchema();
  return db.select().from(c2bConnectors)
    .where(and(
      eq(c2bConnectors.organizationId, organizationId),
      eq(c2bConnectors.intelligenceDomain, intelligenceDomain),
    ))
    .orderBy(c2bConnectors.displayName);
}

export async function listGlobalIntelligenceOpportunities(intelligenceDomain: "c2c" | "c2b" | "b2b") {
  const db = await getDb();
  if (!db) return [];
  await ensureC2bSchema();
  return db.select().from(c2bOpportunities)
    .where(eq(c2bOpportunities.intelligenceDomain, intelligenceDomain))
    .orderBy(desc(c2bOpportunities.createdAt));
}

export async function getC2bOpportunity(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureC2bSchema();
  return (await db.select().from(c2bOpportunities).where(eq(c2bOpportunities.id, id)).limit(1))[0];
}

export async function updateC2bOpportunity(input: {
  id: number;
  organizationId: number;
  actorUserId: number;
  action: string;
  status: typeof c2bOpportunities.$inferInsert.status;
  ghlStatus: typeof c2bOpportunities.$inferInsert.ghlStatus;
  assignedUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureC2bSchema();
  const current = await getC2bOpportunity(input.id);
  if (!current || current.organizationId !== input.organizationId) {
    throw new Error("Opportunity not found");
  }
  await db.transaction(async (tx) => {
    await tx.update(c2bOpportunities).set({
      status: input.status,
      ghlStatus: input.ghlStatus,
      assignedUserId: input.assignedUserId === undefined ? current.assignedUserId : input.assignedUserId,
      updatedAt: new Date(),
    }).where(and(
      eq(c2bOpportunities.id, input.id),
      eq(c2bOpportunities.organizationId, input.organizationId),
    ));
    await tx.insert(c2bOpportunityAudit).values({
      opportunityId: input.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      previousStatus: current.status,
      nextStatus: input.status,
      details: {
        downstreamWritePerformed: false,
        humanApproved: input.action === "approve" || current.status === "approved",
      },
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence Evolution — approved, tenant-isolated learning loop
// ─────────────────────────────────────────────────────────────────────────────

let intelligenceEvolutionSchemaReady = false;

async function ensureIntelligenceEvolutionSchema() {
  if (intelligenceEvolutionSchemaReady) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS intelligence_learning_events (
      id bigint AUTO_INCREMENT PRIMARY KEY, organizationId int NOT NULL, tenantId varchar(128) NOT NULL,
      recommendationId int, sourceType enum('operational','user_action','executive_decision','opportunity_outcome','connector','crm','financial','marketing','kpi','recommendation_history','business_rule') NOT NULL,
      sourceReference varchar(256) NOT NULL, approved boolean NOT NULL DEFAULT false, eventType varchar(64) NOT NULL,
      normalizedEvidence json NOT NULL, modelArea enum('scoring','prioritization','recommendations','forecasting','duplicates','workflow','assignment','risk','anomaly','confidence') NOT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_learning_event_org_tenant (organizationId,tenantId,createdAt), KEY idx_learning_event_recommendation (recommendationId)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS intelligence_outcomes (
      id bigint AUTO_INCREMENT PRIMARY KEY, organizationId int NOT NULL, tenantId varchar(128) NOT NULL,
      recommendationId int NOT NULL, decision enum('accepted','rejected','deferred','already_done') NOT NULL,
      outcomeType enum('positive','negative','neutral','unknown') NOT NULL, revenueImpact int, operationalImpact text,
      timeSavedMinutes int, conversionImprovement float, evidence json NOT NULL, measuredAt timestamp NOT NULL,
      recordedByUserId int NOT NULL, createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_intelligence_outcome_org_tenant (organizationId,tenantId,measuredAt), KEY idx_intelligence_outcome_recommendation (recommendationId)
    )
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS intelligence_learning_profiles (
      id bigint AUTO_INCREMENT PRIMARY KEY, organizationId int NOT NULL, tenantId varchar(128) NOT NULL,
      modelArea enum('scoring','prioritization','recommendations','forecasting','duplicates','workflow','assignment','risk','anomaly','confidence') NOT NULL,
      evidenceCount int NOT NULL DEFAULT 0, verifiedOutcomeCount int NOT NULL DEFAULT 0, successfulOutcomeCount int NOT NULL DEFAULT 0,
      accuracyRate float NOT NULL DEFAULT 0, adjustment float NOT NULL DEFAULT 0, explanation text NOT NULL,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY learning_profile_org_tenant_area (organizationId,tenantId,modelArea)
    )
  `));
  intelligenceEvolutionSchemaReady = true;
}

type ModelArea = typeof intelligenceLearningProfiles.$inferInsert.modelArea;

export async function recordIntelligenceOutcome(input: {
  organizationId: number;
  tenantId: string;
  recommendationId: number;
  decision: typeof intelligenceOutcomes.$inferInsert.decision;
  outcomeType: typeof intelligenceOutcomes.$inferInsert.outcomeType;
  modelArea: ModelArea;
  sourceType: LearningSourceType;
  sourceReference: string;
  evidence: string[];
  recordedByUserId: number;
  measuredAt: Date;
  revenueImpact?: number | null;
  operationalImpact?: string | null;
  timeSavedMinutes?: number | null;
  conversionImprovement?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureIntelligenceEvolutionSchema();
  await ensureRecommendationHistorySchema();
  await db.transaction(async (tx) => {
    await tx.insert(intelligenceOutcomes).values({
      organizationId: input.organizationId, tenantId: input.tenantId,
      recommendationId: input.recommendationId, decision: input.decision,
      outcomeType: input.outcomeType, revenueImpact: input.revenueImpact,
      operationalImpact: input.operationalImpact, timeSavedMinutes: input.timeSavedMinutes,
      conversionImprovement: input.conversionImprovement, evidence: input.evidence,
      measuredAt: input.measuredAt, recordedByUserId: input.recordedByUserId,
    });
    await tx.insert(intelligenceLearningEvents).values({
      organizationId: input.organizationId, tenantId: input.tenantId,
      recommendationId: input.recommendationId, sourceType: input.sourceType,
      sourceReference: input.sourceReference, approved: true,
      eventType: "recommendation.outcome_recorded", normalizedEvidence: input.evidence,
      modelArea: input.modelArea,
    });
    const latestHistory = (await tx.select().from(recommendationHistory)
      .where(and(
        eq(recommendationHistory.recommendationId, input.recommendationId),
        eq(recommendationHistory.tenantId, input.tenantId),
      )).orderBy(desc(recommendationHistory.occurredAt)).limit(1))[0];
    if (latestHistory) {
      await tx.insert(recommendationHistory).values({
        ...latestHistory, id: undefined, eventType: "outcome",
        metadata: {
          ...(latestHistory.metadata as Record<string, unknown> ?? {}),
          outcomeType: input.outcomeType,
          revenueImpact: input.revenueImpact ?? null,
          operationalImpact: input.operationalImpact ?? null,
          timeSavedMinutes: input.timeSavedMinutes ?? null,
          conversionImprovement: input.conversionImprovement ?? null,
        },
        occurredAt: input.measuredAt, createdAt: new Date(),
      });
    }
  });
  const outcomes = await db.select().from(intelligenceOutcomes).where(and(
    eq(intelligenceOutcomes.organizationId, input.organizationId),
    eq(intelligenceOutcomes.tenantId, input.tenantId),
  ));
  const events = await db.select().from(intelligenceLearningEvents).where(and(
    eq(intelligenceLearningEvents.organizationId, input.organizationId),
    eq(intelligenceLearningEvents.tenantId, input.tenantId),
    eq(intelligenceLearningEvents.modelArea, input.modelArea),
    eq(intelligenceLearningEvents.approved, true),
  ));
  const profile = calculateLearningProfile(outcomes);
  await db.insert(intelligenceLearningProfiles).values({
    organizationId: input.organizationId, tenantId: input.tenantId, modelArea: input.modelArea,
    evidenceCount: events.length, ...profile,
  }).onDuplicateKeyUpdate({ set: {
    evidenceCount: events.length, verifiedOutcomeCount: profile.verifiedOutcomeCount,
    successfulOutcomeCount: profile.successfulOutcomeCount, accuracyRate: profile.accuracyRate,
    adjustment: profile.adjustment, explanation: profile.explanation, updatedAt: new Date(),
  }});
  return profile;
}

export async function getIntelligenceEvolution(organizationId: number, tenantIds: string[]) {
  const db = await getDb();
  if (!db || !tenantIds.length) return { events: [], outcomes: [], profiles: [] };
  await ensureIntelligenceEvolutionSchema();
  const [events, outcomes, profiles] = await Promise.all([
    db.select().from(intelligenceLearningEvents).where(and(
      eq(intelligenceLearningEvents.organizationId, organizationId),
      inArray(intelligenceLearningEvents.tenantId, tenantIds),
      eq(intelligenceLearningEvents.approved, true),
    )).orderBy(desc(intelligenceLearningEvents.createdAt)),
    db.select().from(intelligenceOutcomes).where(and(
      eq(intelligenceOutcomes.organizationId, organizationId),
      inArray(intelligenceOutcomes.tenantId, tenantIds),
    )).orderBy(desc(intelligenceOutcomes.measuredAt)),
    db.select().from(intelligenceLearningProfiles).where(and(
      eq(intelligenceLearningProfiles.organizationId, organizationId),
      inArray(intelligenceLearningProfiles.tenantId, tenantIds),
    )),
  ]);
  return { events, outcomes, profiles };
}

export async function getAnonymousPlatformLearningEvents() {
  const db = await getDb();
  if (!db) return [];
  await ensureIntelligenceEvolutionSchema();
  return db.select({
    organizationId: intelligenceLearningEvents.organizationId,
    sourceType: intelligenceLearningEvents.sourceType,
    modelArea: intelligenceLearningEvents.modelArea,
  }).from(intelligenceLearningEvents).where(eq(intelligenceLearningEvents.approved, true));
}
