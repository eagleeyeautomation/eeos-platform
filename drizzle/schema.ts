/**
 * EEOS Platform Database Schema
 *
 * Multi-tenant enterprise hierarchy:
 *   Organization (EEA = software company, PRN Staffers = customer, etc.)
 *   └── Membership (a customer's EEOS subscription)
 *       └── Subaccount (a GHL location within one membership)
 *
 * Terminology:
 *   EEA     = Eagle Eye Automation (software company that builds EEOS)
 *   EEOS    = The platform (Eagle Eye Operating System)
 *   IE      = Intelligence Engine (the AI core of EEOS)
 *   tenantId = always a Subaccount ID (GHL locationId) — the atomic unit of the pipeline
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import {
  int, mysqlEnum, mysqlTable, text, timestamp, varchar,
  boolean, json, float, bigint, index, uniqueIndex
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────────────────────────────────────
// TIER 0: Platform Users
// ─────────────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: text("passwordHash"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Organizations
// An Organization is any entity that uses EEOS — either as the software company
// (EEA) or as a customer (e.g., PRN Staffers, ABC Plumbing, Smith HVAC).
// EEA itself has an org record for internal development and demonstrations.
// ─────────────────────────────────────────────────────────────────────────────

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(), // e.g. "eea", "prn-staffers"
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", [
    "platform_owner", // Eagle Eye Automation — the software company
    "customer",       // Any company that purchases an EEOS membership
  ]).notNull(),
  industry: varchar("industry", { length: 128 }),
  website: varchar("website", { length: 512 }),
  logoUrl: text("logoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_orgs_slug").on(t.slug),
  index("idx_orgs_type").on(t.type),
]);

export type Organization = typeof organizations.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: Memberships
// A Membership is one EEOS subscription purchased by an Organization.
// Each customer has exactly one active Membership.
// EEA has its own Membership for internal use, demos, and development.
// ─────────────────────────────────────────────────────────────────────────────

export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  plan: mysqlEnum("plan", ["trial", "starter", "professional", "enterprise"]).default("starter").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "cancelled", "trial"]).default("active").notNull(),
  // IE configuration for this membership
  ieEnabled: boolean("ieEnabled").default(true).notNull(),
  ieModelVersion: varchar("ieModelVersion", { length: 32 }).default("1.0"),
  maxSubaccounts: int("maxSubaccounts").default(10),
  // Billing
  billingEmail: varchar("billingEmail", { length: 320 }),
  trialEndsAt: timestamp("trialEndsAt"),
  renewsAt: timestamp("renewsAt"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_memberships_org").on(t.organizationId),
  index("idx_memberships_status").on(t.status),
]);

export type Membership = typeof memberships.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: Subaccounts
// A Subaccount is one GoHighLevel location within a Membership.
// This is the atomic unit of the EEOS pipeline — every signal, recommendation,
// and IE run is scoped to a Subaccount.
//
// Example: PRN Staffers Membership has 4 Subaccounts:
//   Delaware, South Carolina, Alabama, Florida
// ─────────────────────────────────────────────────────────────────────────────

export const subaccounts = mysqlTable("subaccounts", {
  id: int("id").autoincrement().primaryKey(),
  membershipId: int("membershipId").notNull(),
  // The GHL locationId is the canonical tenantId throughout the pipeline
  ghlLocationId: varchar("ghlLocationId", { length: 128 }).notNull().unique(),
  ghlCompanyId: varchar("ghlCompanyId", { length: 128 }),
  name: varchar("name", { length: 256 }).notNull(), // e.g. "Delaware", "South Carolina"
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  isActive: boolean("isActive").default(true).notNull(),
  // IE configuration (can override membership defaults)
  ieEnabled: boolean("ieEnabled").default(true).notNull(),
  // Metadata
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_subaccounts_membership").on(t.membershipId),
  index("idx_subaccounts_ghl_location").on(t.ghlLocationId),
]);

export type Subaccount = typeof subaccounts.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4: Membership User Roles
// Maps platform users to memberships with role-based access control
// ─────────────────────────────────────────────────────────────────────────────

export const membershipUsers = mysqlTable("membership_users", {
  id: int("id").autoincrement().primaryKey(),
  membershipId: int("membershipId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", [
    "owner",     // Full control — typically the business owner
    "executive", // Read all, act on recommendations
    "analyst",   // Read all, no feedback actions
    "viewer",    // Read-only
  ]).default("viewer").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
}, (t) => [
  index("idx_membership_users_membership").on(t.membershipId),
  index("idx_membership_users_user").on(t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// EEOS First-Party Authentication
// Opaque sessions, invitations, password resets, and auth audit events.
// ─────────────────────────────────────────────────────────────────────────────

export const authSessions = mysqlTable("auth_sessions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  ipAddress: varchar("ipAddress", { length: 128 }),
  userAgent: text("userAgent"),
}, (t) => [
  uniqueIndex("auth_sessions_token_hash_unique").on(t.tokenHash),
  index("idx_auth_sessions_user").on(t.userId),
  index("idx_auth_sessions_expires").on(t.expiresAt),
]);

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("password_reset_tokens_hash_unique").on(t.tokenHash),
  index("idx_password_reset_user").on(t.userId),
  index("idx_password_reset_expires").on(t.expiresAt),
]);

export const authInvitations = mysqlTable("auth_invitations", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  organizationId: int("organizationId").notNull(),
  membershipId: int("membershipId").notNull(),
  role: mysqlEnum("role", ["owner", "executive", "analyst", "viewer"]).default("viewer").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  invitedByUserId: int("invitedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("auth_invitations_hash_unique").on(t.tokenHash),
  index("idx_auth_invitations_email").on(t.email),
  index("idx_auth_invitations_org").on(t.organizationId),
]);

export const authAuditEvents = mysqlTable("auth_audit_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  organizationId: int("organizationId"),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("targetType", { length: 64 }),
  targetId: varchar("targetId", { length: 128 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_auth_audit_actor").on(t.actorUserId),
  index("idx_auth_audit_org").on(t.organizationId),
  index("idx_auth_audit_action").on(t.action),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 1: GoHighLevel OAuth Tokens
// Scoped to a Subaccount (ghlLocationId = tenantId)
// ─────────────────────────────────────────────────────────────────────────────

export const ghlTokens = mysqlTable("ghl_tokens", {
  id: int("id").autoincrement().primaryKey(),
  // tenantId = GHL locationId — the canonical subaccount identifier
  tenantId: varchar("tenantId", { length: 128 }).notNull().unique(),
  locationId: varchar("locationId", { length: 128 }),
  companyId: varchar("companyId", { length: 128 }),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  tokenType: varchar("tokenType", { length: 32 }).default("Bearer"),
  scope: text("scope"),
  expiresAt: timestamp("expiresAt").notNull(),
  lastRefreshedAt: timestamp("lastRefreshedAt").defaultNow(),
  refreshFailCount: int("refreshFailCount").default(0),
  isActive: boolean("isActive").default(true),
  webhookRegistered: boolean("webhookRegistered").default(false),
  webhookId: varchar("webhookId", { length: 128 }),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_ghl_tokens_tenant").on(t.tenantId),
  index("idx_ghl_tokens_expires").on(t.expiresAt),
]);

export type GhlToken = typeof ghlTokens.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 2: Signal Pipeline
// Normalized events from GHL webhooks — raw input to the IE pipeline
// tenantId = GHL locationId (Subaccount)
// ─────────────────────────────────────────────────────────────────────────────

export const ghlSignals = mysqlTable("ghl_signals", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  signalType: mysqlEnum("signalType", [
    "contact.created", "contact.updated", "contact.deleted", "contact.tag_added", "contact.tag_removed",
    "opportunity.created", "opportunity.updated", "opportunity.status_changed", "opportunity.deleted",
    "pipeline.stage_changed",
    "appointment.created", "appointment.updated", "appointment.cancelled", "appointment.completed",
    "custom_field.updated",
    "note.created",
    "task.created", "task.completed",
    "conversation.message_sent", "conversation.message_received",
    "payment.received",
    "form.submitted",
    "workflow.triggered",
  ]).notNull(),
  sourceEventId: varchar("sourceEventId", { length: 256 }),
  entityType: varchar("entityType", { length: 64 }),
  entityId: varchar("entityId", { length: 256 }),
  entityName: text("entityName"),
  rawPayload: json("rawPayload"),
  normalizedPayload: json("normalizedPayload"),
  signalWeight: float("signalWeight").default(1.0),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processedAt"),
  processingError: text("processingError"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, (t) => [
  index("idx_signals_tenant_type").on(t.tenantId, t.signalType),
  index("idx_signals_tenant_received").on(t.tenantId, t.receivedAt),
  index("idx_signals_processed").on(t.processed),
]);

export type GhlSignal = typeof ghlSignals.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 3: Business Memory
// Persistent, evolving understanding of a Subaccount's business state.
// Updated by every signal — the IE reads this as its primary context.
// ─────────────────────────────────────────────────────────────────────────────

export const businessMemory = mysqlTable("business_memory", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull().unique(),
  // Revenue & Pipeline
  totalPipelineValue: float("totalPipelineValue").default(0),
  activeOpportunities: int("activeOpportunities").default(0),
  wonOpportunitiesLast30d: int("wonOpportunitiesLast30d").default(0),
  lostOpportunitiesLast30d: int("lostOpportunitiesLast30d").default(0),
  avgDealSize: float("avgDealSize").default(0),
  pipelineVelocity: float("pipelineVelocity").default(0), // deals/week
  // Contacts
  totalContacts: int("totalContacts").default(0),
  newContactsLast7d: int("newContactsLast7d").default(0),
  newContactsLast30d: int("newContactsLast30d").default(0),
  // Appointments
  appointmentsLast7d: int("appointmentsLast7d").default(0),
  appointmentsLast30d: int("appointmentsLast30d").default(0),
  appointmentCancellationRate: float("appointmentCancellationRate").default(0),
  // Tags & Segments
  topTags: json("topTags"), // { tag: string, count: number }[]
  // Business Health Score (0-100)
  healthScore: int("healthScore").default(50),
  healthScoreTrend: mysqlEnum("healthScoreTrend", ["up", "down", "neutral"]).default("neutral"),
  healthScoreComponents: json("healthScoreComponents"),
  // IE Context
  lastSignalAt: timestamp("lastSignalAt"),
  signalCount24h: int("signalCount24h").default(0),
  signalCount7d: int("signalCount7d").default(0),
  signalCount30d: int("signalCount30d").default(0),
  // Metadata
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_memory_tenant").on(t.tenantId),
]);

export type BusinessMemory = typeof businessMemory.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 4: Knowledge Graph
// Entities and relationships extracted from GHL signals per Subaccount
// ─────────────────────────────────────────────────────────────────────────────

export const kgNodes = mysqlTable("kg_nodes", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  nodeType: mysqlEnum("nodeType", [
    "contact", "opportunity", "pipeline_stage", "tag", "appointment",
    "campaign", "workflow", "custom_field", "location"
  ]).notNull(),
  externalId: varchar("externalId", { length: 256 }).notNull(),
  label: text("label"),
  properties: json("properties"),
  signalCount: int("signalCount").default(1),
  lastSeenAt: timestamp("lastSeenAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_kg_nodes_tenant_type").on(t.tenantId, t.nodeType),
  index("idx_kg_nodes_external").on(t.tenantId, t.externalId),
]);

export const kgEdges = mysqlTable("kg_edges", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  fromNodeId: bigint("fromNodeId", { mode: "number" }).notNull(),
  toNodeId: bigint("toNodeId", { mode: "number" }).notNull(),
  relationshipType: varchar("relationshipType", { length: 64 }).notNull(),
  weight: float("weight").default(1.0),
  properties: json("properties"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_kg_edges_tenant").on(t.tenantId),
  index("idx_kg_edges_from").on(t.fromNodeId),
  index("idx_kg_edges_to").on(t.toNodeId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 5: Timeline Events
// Chronological record of every significant business event per Subaccount
// ─────────────────────────────────────────────────────────────────────────────

export const timelineEvents = mysqlTable("timeline_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  signalId: bigint("signalId", { mode: "number" }),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  entityType: varchar("entityType", { length: 64 }),
  entityId: varchar("entityId", { length: 256 }),
  entityName: text("entityName"),
  significance: mysqlEnum("significance", ["low", "medium", "high", "critical"]).default("medium"),
  businessImpact: text("businessImpact"),
  metadata: json("metadata"),
  occurredAt: timestamp("occurredAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_timeline_tenant_occurred").on(t.tenantId, t.occurredAt),
  index("idx_timeline_significance").on(t.tenantId, t.significance),
]);

export type TimelineEvent = typeof timelineEvents.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 6: Audit Log
// Every system action with actor, outcome, and traceability
// ─────────────────────────────────────────────────────────────────────────────

export const auditLog = mysqlTable("audit_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  actor: mysqlEnum("actor", ["ghl_webhook", "ie_engine", "user", "system", "token_refresh"]).notNull(),
  action: varchar("action", { length: 256 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: varchar("entityId", { length: 256 }),
  outcome: mysqlEnum("outcome", ["success", "failure", "skipped", "pending"]).notNull(),
  details: json("details"),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_audit_tenant_created").on(t.tenantId, t.createdAt),
  index("idx_audit_actor").on(t.actor),
  index("idx_audit_outcome").on(t.outcome),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 7: Intelligence Engine — Recommendations
// LLM-generated executive recommendations with full trust anatomy.
// Scoped to a Subaccount (tenantId = GHL locationId).
// ─────────────────────────────────────────────────────────────────────────────

export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  // Trust Anatomy — the 7 elements every IE recommendation must answer
  title: text("title").notNull(),
  why: text("why").notNull(),                    // Why this matters
  whyNow: text("whyNow").notNull(),              // Why act now
  evidence: json("evidence"),                    // Supporting signals (array)
  businessImpact: text("businessImpact").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  recommendedAction: text("recommendedAction").notNull(),
  measurementPlan: text("measurementPlan").notNull(),
  // Confidence
  confidenceScore: int("confidenceScore").notNull(), // 0-100
  confidenceFactors: json("confidenceFactors"),      // what drove the score
  signalCount: int("signalCount").default(0),
  signalWindowDays: int("signalWindowDays").default(7),
  // Classification
  category: mysqlEnum("category", [
    "revenue", "pipeline", "retention", "operations", "growth", "risk", "team"
  ]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  // IE Metadata
  ieModelVersion: varchar("ieModelVersion", { length: 32 }).default("1.0"),
  promptHash: varchar("promptHash", { length: 64 }),
  rawLlmResponse: text("rawLlmResponse"),
  // Lifecycle
  status: mysqlEnum("status", ["active", "accepted", "rejected", "expired", "superseded"]).default("active"),
  expiresAt: timestamp("expiresAt"),
  supersededById: int("supersededById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("idx_recs_tenant_status").on(t.tenantId, t.status),
  index("idx_recs_tenant_created").on(t.tenantId, t.createdAt),
  index("idx_recs_priority").on(t.tenantId, t.priority),
]);

export type Recommendation = typeof recommendations.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LAYER 8: Executive Feedback & Continuous Learning
// Captures executive decisions on IE recommendations.
// Feeds back into IE calibration — this is how the IE improves over time.
// ─────────────────────────────────────────────────────────────────────────────

export const recommendationFeedback = mysqlTable("recommendation_feedback", {
  id: int("id").autoincrement().primaryKey(),
  recommendationId: int("recommendationId").notNull(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  userId: int("userId"),
  // Executive decision
  decision: mysqlEnum("decision", ["accepted", "rejected", "deferred", "already_done"]).notNull(),
  // Outcome tracking (filled in later, after action is taken)
  outcomeRecorded: boolean("outcomeRecorded").default(false),
  outcomeType: mysqlEnum("outcomeType", ["positive", "negative", "neutral", "unknown"]),
  outcomeNotes: text("outcomeNotes"),
  outcomeRecordedAt: timestamp("outcomeRecordedAt"),
  // Calibration data
  executiveConfidenceRating: int("executiveConfidenceRating"), // 1-5 stars
  executiveComment: text("executiveComment"),
  wasAccurate: boolean("wasAccurate"),
  // Metadata
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("idx_feedback_rec").on(t.recommendationId),
  index("idx_feedback_tenant").on(t.tenantId),
  index("idx_feedback_decision").on(t.decision),
]);

// ─────────────────────────────────────────────────────────────────────────────
// IE ACCURACY METRICS
// Aggregated IE performance per Subaccount — updated after each feedback event.
// This is the continuous learning signal that improves IE accuracy over time.
// ─────────────────────────────────────────────────────────────────────────────

export const ieMetrics = mysqlTable("ie_metrics", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 128 }).notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  // Accuracy
  totalRecommendations: int("totalRecommendations").default(0),
  accepted: int("accepted").default(0),
  rejected: int("rejected").default(0),
  deferred: int("deferred").default(0),
  acceptanceRate: float("acceptanceRate").default(0),
  // Calibration (predicted confidence vs actual accuracy)
  avgPredictedConfidence: float("avgPredictedConfidence").default(0),
  avgActualAccuracy: float("avgActualAccuracy").default(0),
  calibrationError: float("calibrationError").default(0),
  // False positive / negative (requires outcome data)
  truePositives: int("truePositives").default(0),
  falsePositives: int("falsePositives").default(0),
  falseNegatives: int("falseNegatives").default(0),
  precision: float("precision").default(0),
  recall: float("recall").default(0),
  f1Score: float("f1Score").default(0),
  // Performance
  avgResponseTimeMs: int("avgResponseTimeMs").default(0),
  // Metadata
  computedAt: timestamp("computedAt").defaultNow().notNull(),
}, (t) => [
  index("idx_ie_metrics_tenant").on(t.tenantId, t.periodStart),
]);

export type IeMetrics = typeof ieMetrics.$inferSelect;
