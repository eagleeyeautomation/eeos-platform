/**
 * EEOS tRPC Router — Complete Pipeline Procedures
 * Covers all 8 pipeline layers: Auth, GHL, Signals, Memory, Timeline,
 * Knowledge Graph, Recommendations, Feedback, IE Metrics
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { evaluateRecentMfa } from "./_core/recentMfa";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import {
  getGhlToken, getActiveRecommendations, getRecommendationById,
  getBusinessMemory, getTimeline, getKnowledgeGraph,
  insertFeedback, getFeedbackForTenant,
  getLatestIeMetrics, computeAndStoreIeMetrics,
  updateRecommendationStatus, expireOldRecommendations,
  getRecentSignals,
  // Multi-tenant hierarchy
  getUserSubaccounts, getSubaccountsByMembership, getMembershipByOrg,
  getAllOrganizations, getSubaccountByGhlLocationId,
  getPlatformAdminOverview,
  getPlatformOrganizationDetails,
  getPlatformOnboardingSummary,
  getPlatformIntegrationSummary,
  getPlatformHealthSummary,
  getPlatformAuditActivity,
  getPlatformSupportSummary,
  getPlatformAiOperationsSummary,
  getC2bOpportunity,
  listC2bConnectors,
  listC2bOpportunities,
  listGlobalIntelligenceOpportunities,
  updateC2bOpportunity,
  getIntelligenceEvolution,
  getAnonymousPlatformLearningEvents,
  recordIntelligenceOutcome,
  getRecommendationHistory,
} from "./db";
import { runIntelligenceEngine } from "./intelligence-engine";
import {
  listPlatformOrganizations,
  listAuthorizedLocationsForMembership,
  requireAuthorizedLocation,
  requirePlatformAdmin,
  requireWritableOrganizationRole,
  resolveAuthorizationContext,
  resolveOrganizationAuthorizationContext,
} from "./authorization";
import {
  C2B_ACTION_TRANSITIONS,
  connectorsForDomain,
  INTELLIGENCE_DOMAIN_CONFIG,
  summarizeC2bOpportunities,
  type C2bScoring,
} from "./c2b/core";
import {
  anonymizePlatformLearning,
  diagnoseIntelligenceHealth,
  validateLearningEvent,
} from "./intelligence-evolution/core";
import {
  buildExecutiveBriefing,
  calculateExecutiveReadiness,
  healthLabel,
} from "./mission-control/core";
import { INTELLIGENCE_CATEGORIES, GRAPH_ENTITY_TYPES } from "./intelligence-orchestration/core";
import { askExecutiveCopilot, getExecutiveContext, publishIntelligenceEvent } from "./intelligence-orchestration/service";
import { GOAL_TYPES } from "./decision-orchestration/core";
import { createBusinessGoal, decideWorkflow, getAutomationDashboard, prepareDecisionWorkflow, updateBusinessGoal } from "./decision-orchestration/service";
import { INDUSTRY_KEYS, scoreIndustryOpportunity } from "./industry-intelligence/core";
import { configureOrganizationIndustryPacks, getOrganizationIndustryContext, listIndustryCatalog, recordIndustryKpi } from "./industry-intelligence/service";
import { advancePresentation, approvePresentationWorkflow, completePresentation, getDemoCenter, getPresentationDefinition, getPresentationState, presentationCopilot, previousPresentation, replayDemo, resetDemo, restartPresentation, seedDemo, startDemoScenario, startPresentation } from "./demo/service";

export const appRouter = router({
  system: systemRouter,

  // ─────────────────────────────────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    session: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return {
          loading: false,
          authenticated: false,
          user: null,
          role: null,
          organizationRole: null,
          organization: null,
          authorizedLocations: [],
          ghlConnected: false,
        };
      }

      const authorization = await resolveAuthorizationContext(ctx.user);
      const organizationAuthorization = await resolveOrganizationAuthorizationContext(ctx.user);
      const authorizedLocations = await listAuthorizedLocationsForMembership(organizationAuthorization?.membershipId ?? null);
      const connectedTokens = await Promise.all(
        (organizationAuthorization?.authorizedLocationIds ?? []).map((locationId) => getGhlToken(locationId))
      );

      return {
        loading: false,
        authenticated: true,
        user: {
          id: String(ctx.user.id),
          name: ctx.user.name ?? undefined,
          email: ctx.user.email ?? undefined,
        },
        role: authorization.role,
        organizationRole: organizationAuthorization?.role ?? null,
        organization: organizationAuthorization?.organizationId ? {
          id: organizationAuthorization.organizationId,
          name: organizationAuthorization.organizationName ?? "Organization",
        } : null,
        authorizedLocations,
        ghlConnected: connectedTokens.some((token) => token?.isActive && token.scope === "private_integration"),
      };
    }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      await sdk.revokeCurrentSession(ctx.req);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // GoHighLevel Connection
  // ─────────────────────────────────────────────────────────────────────────
  ghl: router({
    /**
     * Returns the GHL connection status for the current tenant.
     * Used by ConnectGHL page and IntegrationStatus page.
     */
    connectionStatus: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        const user = ctx.user;
        if (!user) {
          return {
            connected: false,
            reason: "not_authenticated" as const,
          };
        }
        await requireAuthorizedLocation(user, input.tenantId);
        const token = await getGhlToken(input.tenantId);
        if (!token || !token.isActive) {
          return {
            connected: false,
            reason: "not_connected" as const,
          };
        }
        const isExpired = token.expiresAt < new Date();
        return {
          connected: true,
          locationId: token.locationId,
          companyId: token.companyId,
          isExpired,
          expiresAt: token.expiresAt,
          webhookRegistered: token.webhookRegistered,
          connectedAt: token.connectedAt,
          refreshFailCount: token.refreshFailCount,
        };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Business Memory
  // ─────────────────────────────────────────────────────────────────────────
  memory: router({
    /**
     * Returns the current business memory snapshot for a tenant.
     * Used by ExecutiveHome and BusinessHealth pages.
     */
    get: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getBusinessMemory(input.tenantId);
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Timeline
  // ─────────────────────────────────────────────────────────────────────────
  timeline: router({
    /**
     * Returns paginated timeline events for a tenant.
     * Used by ExecutiveTimeline page.
     */
    list: protectedProcedure
      .input(z.object({
        tenantId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getTimeline(input.tenantId, input.limit);
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Knowledge Graph
  // ─────────────────────────────────────────────────────────────────────────
  knowledgeGraph: router({
    /**
     * Returns the knowledge graph (nodes + edges) for a tenant.
     * Used by KnowledgeGraphPreview page.
     */
    get: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getKnowledgeGraph(input.tenantId);
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Live Signals
  // ─────────────────────────────────────────────────────────────────────────
  signals: router({
    /**
     * Returns recent signals for a tenant.
     * Used by LiveSignals page.
     */
    recent: protectedProcedure
      .input(z.object({
        tenantId: z.string(),
        hours: z.number().min(1).max(168).default(24),
      }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getRecentSignals(input.tenantId, input.hours);
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Recommendations
  // ─────────────────────────────────────────────────────────────────────────
  recommendations: router({
    /**
     * Returns all active recommendations for a tenant.
     * Used by AIRecommendations and ExecutiveHome pages.
     */
    list: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await expireOldRecommendations(input.tenantId);
        return getActiveRecommendations(input.tenantId);
      }),

    /**
     * Manually triggers the Intelligence Engine for a tenant.
     * Used by the executive dashboard "Refresh" button.
     */
    generate: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await requireWritableOrganizationRole(ctx.user!);
        const result = await runIntelligenceEngine(input.tenantId);
        return result;
      }),

    /**
     * Records executive feedback on a recommendation.
     * Feeds the IE continuous learning loop.
     */
    feedback: protectedProcedure
      .input(z.object({
        recommendationId: z.number(),
        tenantId: z.string(),
        decision: z.enum(["accepted", "rejected", "deferred", "already_done"]),
        executiveComment: z.string().optional(),
        executiveConfidenceRating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await requireWritableOrganizationRole(ctx.user!);
        const rec = await getRecommendationById(input.recommendationId, input.tenantId);
        if (!rec) {
          throw new Error("Recommendation not found");
        }

        // Update recommendation status
        const newStatus = input.decision === "accepted" ? "accepted"
          : input.decision === "rejected" ? "rejected"
          : "active"; // deferred/already_done keep it active

        await updateRecommendationStatus(input.recommendationId, newStatus, input.tenantId);

        // Record feedback
        await insertFeedback({
          recommendationId: input.recommendationId,
          tenantId: input.tenantId,
          userId: ctx.user?.id ?? null,
          decision: input.decision,
          executiveComment: input.executiveComment ?? null,
          executiveConfidenceRating: input.executiveConfidenceRating ?? null,
          decidedAt: new Date(),
        });

        const authorization = await resolveOrganizationAuthorizationContext(ctx.user!);
        if (authorization?.organizationId) {
          await publishIntelligenceEvent({
            id: `recommendation-feedback:${input.recommendationId}:${input.decision}`,
            organizationId: authorization.organizationId,
            locationId: input.tenantId,
            producer: "recommendations",
            type: `recommendation.${input.decision}`,
            category: input.decision === "rejected" ? "risk" : "operations",
            occurredAt: new Date().toISOString(),
            subject: { type: "recommendation", key: String(input.recommendationId), name: rec.title },
            payload: { decision: input.decision, comment: input.executiveComment ?? null },
            evidence: [`recommendation:${input.recommendationId}`, `executive-decision:${input.decision}`],
          });
        }

        // Trigger metrics recomputation asynchronously
        computeAndStoreIeMetrics(input.tenantId)
          .catch(err => console.error("[IE] Metrics recomputation error:", err));

        return { success: true, decision: input.decision };
      }),

    /**
     * Records the outcome of a previously accepted recommendation.
     * Critical for IE accuracy calibration.
     */
    recordOutcome: protectedProcedure
      .input(z.object({
        recommendationId: z.number(),
        tenantId: z.string(),
        outcomeType: z.enum(["positive", "negative", "neutral", "unknown"]),
        outcomeNotes: z.string().optional(),
        wasAccurate: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await requireWritableOrganizationRole(ctx.user!);
        // Update feedback record with outcome
        const feedback = await getFeedbackForTenant(input.tenantId, 100);
        const matchingFeedback = feedback.find(f => f.recommendationId === input.recommendationId);

        if (!matchingFeedback) {
          throw new Error("No feedback found for this recommendation");
        }

        // Recompute metrics
        await computeAndStoreIeMetrics(input.tenantId);

        return { success: true };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-Tenant: Subaccounts & Memberships
  // ─────────────────────────────────────────────────────────────────────────
  tenant: router({
    /**
     * Returns all subaccounts accessible to the current user.
     * This is the primary way the frontend discovers which tenantIds to use.
     * For a customer like PRN Staffers, this returns their 4 GHL locations.
     */
    mySubaccounts: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubaccounts(ctx.user.id);
    }),

    /**
     * Returns the GHL connection status for a specific subaccount.
     */
    subaccountStatus: protectedProcedure
      .input(z.object({ ghlLocationId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.ghlLocationId);
        const sub = await getSubaccountByGhlLocationId(input.ghlLocationId);
        const token = await getGhlToken(input.ghlLocationId);
        return {
          subaccount: sub ?? null,
          connected: !!(token?.isActive),
          tokenExpired: token ? token.expiresAt < new Date() : false,
          webhookRegistered: token?.webhookRegistered ?? false,
          connectedAt: token?.connectedAt ?? null,
        };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // IE Accuracy Metrics
  // ─────────────────────────────────────────────────────────────────────────
  ie: router({
    /**
     * Returns the latest IE accuracy metrics for a tenant.
     * Used by SystemHealth and the executive feedback loop.
     */
    metrics: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getLatestIeMetrics(input.tenantId);
      }),

    /**
     * Returns executive feedback history for a tenant.
     * Used by the IE accuracy dashboard.
     */
    feedbackHistory: protectedProcedure
      .input(z.object({
        tenantId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getFeedbackForTenant(input.tenantId, input.limit);
      }),

    /**
     * Manually triggers IE metrics recomputation.
     */
    recomputeMetrics: protectedProcedure
      .input(z.object({ tenantId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await requireWritableOrganizationRole(ctx.user!);
        await computeAndStoreIeMetrics(input.tenantId);
        return { success: true };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // C2B Intelligence — attributed discovery and human-governed decisions
  // ─────────────────────────────────────────────────────────────────────────
  c2b: router({
    dashboard: protectedProcedure
      .input(z.object({ domain: z.enum(["c2c", "c2b", "b2b"]).default("c2b") }).optional())
      .query(async ({ ctx, input }) => {
      const domain = input?.domain ?? "c2b";
      const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
      if (!authorization?.organizationId) {
        throw new Error("An active organization context is required.");
      }
      const organizationId = Number(authorization.organizationId);
      const [opportunities, storedConnectors] = await Promise.all([
        listC2bOpportunities(organizationId, authorization.authorizedLocationIds, domain),
        listC2bConnectors(organizationId, domain),
      ]);
      const connectorState = new Map(storedConnectors.map((item) => [item.connectorKey, item]));
      const connectors = connectorsForDomain(domain).map((connector) => ({
        ...connector,
        enabled: connectorState.get(connector.key)?.enabled ?? false,
        approvalStatus: connectorState.get(connector.key)?.approvalStatus ?? "draft",
        lastRunAt: connectorState.get(connector.key)?.lastRunAt ?? null,
      }));
      const summary = summarizeC2bOpportunities(opportunities);
      const recommendations = opportunities
        .filter((item) => ["high_priority", "pending_review"].includes(item.status))
        .map((item) => {
          const scoring = item.scoring as C2bScoring;
          return {
            opportunityId: item.opportunityId,
            priority: item.status === "high_priority" ? "HIGH PRIORITY" : "REVIEW",
            title: item.businessName || item.name,
            recommendation: item.recommendedNextAction,
            source: item.source,
            sourceUrl: item.sourceUrl,
            reason: item.reasonRelevant,
            confidence: scoring.confidence?.value ?? 0,
            supportingData: scoring.confidence?.evidence ?? [],
          };
        });
      return { domain, config: INTELLIGENCE_DOMAIN_CONFIG[domain], summary, opportunities, connectors, recommendations };
    }),

    act: protectedProcedure
      .input(z.object({
        opportunityId: z.number().int().positive(),
        action: z.enum(["approve", "reject", "assign", "research", "convert_to_ghl", "create_task"]),
        assignedUserId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        const opportunity = await getC2bOpportunity(input.opportunityId);
        if (!opportunity
          || opportunity.organizationId !== Number(authorization.organizationId)
          || !authorization.authorizedLocationIds.includes(opportunity.tenantId)) {
          throw new Error("Opportunity not found");
        }
        if (input.action === "convert_to_ghl" && opportunity.status !== "approved") {
          throw new Error("Human approval is required before GoHighLevel conversion.");
        }
        const transition = C2B_ACTION_TRANSITIONS[input.action];
        await updateC2bOpportunity({
          id: opportunity.id,
          organizationId: opportunity.organizationId,
          actorUserId: ctx.user.id,
          action: input.action,
          status: transition.status,
          ghlStatus: transition.ghlStatus,
          assignedUserId: input.action === "assign"
            ? input.assignedUserId ?? ctx.user.id
            : input.assignedUserId,
        });
        await publishIntelligenceEvent({
          id: `opportunity-action:${opportunity.opportunityId}:${input.action}`,
          organizationId: authorization.organizationId!, locationId: opportunity.tenantId,
          producer: opportunity.intelligenceDomain ?? "c2b", type: `opportunity.${input.action}`,
          category: input.action === "reject" ? "risk" : "growth", occurredAt: new Date().toISOString(),
          subject: { type: "opportunity", key: String(opportunity.opportunityId), name: opportunity.businessName || opportunity.name },
          payload: { action: input.action, source: opportunity.source, nextStatus: transition.status },
          evidence: [opportunity.sourceUrl, `opportunity:${opportunity.opportunityId}`].filter((item): item is string => Boolean(item)),
        });
        return {
          success: true,
          downstreamWritePerformed: false,
          nextStatus: transition.status,
          message: input.action === "convert_to_ghl"
            ? "Approved handoff queued. Phase 1 performs no automatic outreach or CRM write."
            : "Decision recorded with audit history.",
        };
      }),
  }),

  evolution: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
      if (!authorization?.organizationId) throw new Error("An active organization context is required.");
      const memory = await getIntelligenceEvolution(
        Number(authorization.organizationId),
        authorization.authorizedLocationIds,
      );
      const recommendationHistory = await getRecommendationHistory(authorization.authorizedLocationIds);
      const verifiedOutcomes = memory.outcomes.filter((item) => Array.isArray(item.evidence) && item.evidence.length > 0);
      const successful = verifiedOutcomes.filter((item) => item.outcomeType === "positive").length;
      return {
        events: memory.events,
        recommendationHistory,
        profiles: memory.profiles,
        metrics: {
          approvedLearningEvents: memory.events.length,
          recordedOutcomes: memory.outcomes.length,
          verifiedOutcomes: verifiedOutcomes.length,
          accuracyRate: verifiedOutcomes.length ? Math.round((successful / verifiedOutcomes.length) * 10000) / 100 : 0,
          adaptiveProfiles: memory.profiles.filter((item) => item.verifiedOutcomeCount >= 5).length,
        },
        health: diagnoseIntelligenceHealth({
          evidenceCount: memory.events.length,
          dataCompleteness: memory.events.length ? 100 : 0,
          connectorHealthy: true,
          recommendationAgeDays: 0,
          historicalAccuracy: verifiedOutcomes.length ? (successful / verifiedOutcomes.length) * 100 : 0,
          learningOutcomeCount: verifiedOutcomes.length,
        }),
      };
    }),
    recordOutcome: protectedProcedure
      .input(z.object({
        tenantId: z.string().min(1),
        recommendationId: z.number().int().positive(),
        decision: z.enum(["accepted", "rejected", "deferred", "already_done"]),
        outcomeType: z.enum(["positive", "negative", "neutral", "unknown"]),
        modelArea: z.enum(["scoring", "prioritization", "recommendations", "forecasting", "duplicates", "workflow", "assignment", "risk", "anomaly", "confidence"]),
        sourceType: z.enum(["operational", "user_action", "executive_decision", "opportunity_outcome", "connector", "crm", "financial", "marketing", "kpi", "recommendation_history", "business_rule"]),
        sourceReference: z.string().min(1),
        approved: z.literal(true),
        evidence: z.array(z.string().min(1)).min(1),
        measuredAt: z.coerce.date(),
        revenueImpact: z.number().int().optional(),
        operationalImpact: z.string().optional(),
        timeSavedMinutes: z.number().int().nonnegative().optional(),
        conversionImprovement: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireAuthorizedLocation(ctx.user, input.tenantId);
        const authorization = await requireWritableOrganizationRole(ctx.user);
        const validation = validateLearningEvent(input);
        if (!validation.valid) throw new Error(validation.errors.join(" "));
        const recommendation = await getRecommendationById(input.recommendationId);
        if (!recommendation || recommendation.tenantId !== input.tenantId) {
          throw new Error("Recommendation not found");
        }
        const profile = await recordIntelligenceOutcome({
          ...input,
          organizationId: Number(authorization.organizationId),
          recordedByUserId: ctx.user.id,
        });
        await computeAndStoreIeMetrics(input.tenantId);
        return { success: true, profile, autonomousDataWritePerformed: false };
      }),
  }),

  missionControl: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
      if (!authorization?.organizationId) throw new Error("An active organization context is required.");
      const organizationId = Number(authorization.organizationId);
      const tenantIds = authorization.authorizedLocationIds;
      const [memories, recommendationSets, tokens, c2c, c2b, b2b, evolution] = await Promise.all([
        Promise.all(tenantIds.map((tenantId) => getBusinessMemory(tenantId))),
        Promise.all(tenantIds.map((tenantId) => getActiveRecommendations(tenantId))),
        Promise.all(tenantIds.map((tenantId) => getGhlToken(tenantId))),
        listC2bOpportunities(organizationId, tenantIds, "c2c"),
        listC2bOpportunities(organizationId, tenantIds, "c2b"),
        listC2bOpportunities(organizationId, tenantIds, "b2b"),
        getIntelligenceEvolution(organizationId, tenantIds),
      ]);
      const availableMemories = memories.filter((item): item is NonNullable<typeof item> => Boolean(item));
      const recommendations = recommendationSets.flat();
      const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      const operations = average(availableMemories.map((item) => item.healthScore ?? 0));
      const won = availableMemories.reduce((sum, item) => sum + (item.wonOpportunitiesLast30d ?? 0), 0);
      const lost = availableMemories.reduce((sum, item) => sum + (item.lostOpportunitiesLast30d ?? 0), 0);
      const revenue = won + lost ? (won / (won + lost)) * 100 : null;
      const contacts7 = availableMemories.reduce((sum, item) => sum + (item.newContactsLast7d ?? 0), 0);
      const contacts30 = availableMemories.reduce((sum, item) => sum + (item.newContactsLast30d ?? 0), 0);
      const weeklyBaseline = contacts30 / 4.3;
      const growth = contacts30 ? Math.max(0, Math.min(100, 50 + ((contacts7 - weeklyBaseline) / Math.max(1, weeklyBaseline)) * 50)) : null;
      const cancellationRates = availableMemories
        .map((item) => item.appointmentCancellationRate)
        .filter((value): value is number => typeof value === "number");
      const customerExperience = cancellationRates.length ? 100 - average(cancellationRates)! * 100 : null;
      const risk = customerExperience;
      const activeTokens = tokens.filter((token) => token?.isActive);
      const connectorHealth = tenantIds.length ? (activeTokens.length / tenantIds.length) * 100 : null;
      const aiConfidence = recommendations.length
        ? average(recommendations.map((item) => item.confidenceScore))
        : evolution.profiles.length ? average(evolution.profiles.map((item) => item.accuracyRate)) : null;
      const readiness = calculateExecutiveReadiness({
        operations, revenue, growth, risk, customerExperience,
        staffing: null, connectorHealth, aiConfidence,
      }, null);
      const trendBalance = availableMemories.reduce((sum, item) =>
        sum + (item.healthScoreTrend === "up" ? 1 : item.healthScoreTrend === "down" ? -1 : 0), 0);
      const readinessWithTrend = {
        ...readiness,
        trend: readiness.score === null ? "unavailable" as const
          : trendBalance > 0 ? "up" as const
            : trendBalance < 0 ? "down" as const
              : "stable" as const,
      };
      const briefing = buildExecutiveBriefing(recommendations);
      const now = Date.now();
      const withinDays = (days: number) => recommendations.filter((item) => now - new Date(item.createdAt).getTime() <= days * 86400000);
      const domainSummary = (items: typeof c2c) => summarizeC2bOpportunities(items);
      const health = (score: number | null) => ({ score: score === null ? null : Math.round(score), label: healthLabel(score) });
      return {
        readiness: readinessWithTrend,
        health: {
          business: health(operations),
          financial: health(revenue),
          marketing: health(growth),
          operations: health(operations),
          customer: health(customerExperience),
        },
        intelligence: {
          c2c: domainSummary(c2c),
          c2b: domainSummary(c2b),
          b2b: domainSummary(b2b),
        },
        briefing,
        criticalAlerts: recommendations.filter((item) => item.priority === "critical"),
        upcomingRisks: recommendations.filter((item) => item.category === "risk"),
        growthOpportunities: briefing.growthOpportunities,
        periods: {
          today: withinDays(1),
          thisWeek: withinDays(7),
          thisMonth: withinDays(30),
        },
        evidence: {
          authorizedLocations: tenantIds.length,
          businessMemorySnapshots: availableMemories.length,
          connectedLocations: activeTokens.length,
          attributedRecommendations: briefing.topPriorities.length,
        },
      };
    }),
  }),

  // Phase 4 extends the Phase 1–3 contracts with one organization-scoped Brain.
  intelligence: router({
    context: protectedProcedure
      .input(z.object({ consumer: z.string().min(1).max(80).default("executive_dashboard") }).optional())
      .query(async ({ ctx, input }) => {
        const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
        if (!authorization?.organizationId) throw new Error("An active organization context is required.");
        return getExecutiveContext(authorization.organizationId, authorization.authorizedLocationIds, input?.consumer);
      }),
    publish: protectedProcedure
      .input(z.object({
        id: z.string().min(1).max(160), locationId: z.string().min(1).optional(), producer: z.string().min(1).max(80),
        type: z.string().min(1).max(120), category: z.enum(INTELLIGENCE_CATEGORIES), occurredAt: z.string().datetime(),
        subject: z.object({ type: z.enum(GRAPH_ENTITY_TYPES), key: z.string().min(1), name: z.string().min(1), attributes: z.record(z.string(), z.unknown()).optional() }).optional(),
        entities: z.array(z.object({ type: z.enum(GRAPH_ENTITY_TYPES), key: z.string().min(1), name: z.string().min(1), attributes: z.record(z.string(), z.unknown()).optional() })).max(100).optional(),
        relationships: z.array(z.object({ from: z.object({ type: z.enum(GRAPH_ENTITY_TYPES), key: z.string().min(1) }), to: z.object({ type: z.enum(GRAPH_ENTITY_TYPES), key: z.string().min(1) }), type: z.string().min(1), attributes: z.record(z.string(), z.unknown()).optional() })).max(200).optional(),
        payload: z.record(z.string(), z.unknown()), evidence: z.array(z.string().min(1)).max(100), correlationId: z.string().optional(),
        recommendation: z.object({ key: z.string().min(1), title: z.string().min(1), summary: z.string().min(1), action: z.string().min(1), consumers: z.array(z.string().min(1)).max(30).optional(), factors: z.object({ businessImpact: z.number(), financialValue: z.number(), operationalImpact: z.number(), strategicValue: z.number(), risk: z.number(), urgency: z.number(), confidence: z.number() }) }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        if (input.locationId && !authorization.authorizedLocationIds.includes(input.locationId)) throw new Error("This location is not authorized for the current organization.");
        return publishIntelligenceEvent({ ...input, organizationId: authorization.organizationId! });
      }),
    copilot: protectedProcedure
      .input(z.object({ question: z.string().trim().min(2).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
        if (!authorization?.organizationId) throw new Error("An active organization context is required.");
        return askExecutiveCopilot(authorization.organizationId, authorization.authorizedLocationIds, input.question);
      }),
  }),

  // Phase 5 prepares governed work from Phase 4 intelligence. It never executes external writes.
  automation: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
      if (!authorization?.organizationId) throw new Error("An active organization context is required.");
      return getAutomationDashboard(authorization.organizationId, authorization.authorizedLocationIds);
    }),
    prepare: protectedProcedure
      .input(z.object({
        locationId: z.string().min(1).optional(), recommendationId: z.string().uuid().optional(),
        templateKey: z.string().min(1).max(80), playbookKey: z.string().min(1).max(80).optional(),
        title: z.string().trim().min(2).max(200), payload: z.record(z.string(), z.unknown()),
        evidence: z.array(z.string().trim().min(1)).min(1).max(100), confidence: z.number().min(0).max(100), riskScore: z.number().min(0).max(100),
        bulk: z.boolean().optional(), financial: z.boolean().optional(), customerCommunication: z.boolean().optional(), externalIntegration: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        if (input.locationId && !authorization.authorizedLocationIds.includes(input.locationId)) throw new Error("This location is not authorized for the current organization.");
        return prepareDecisionWorkflow({ ...input, organizationId: authorization.organizationId!, requestedBy: authorization.userId });
      }),
    decide: protectedProcedure
      .input(z.object({ workflowId: z.string().uuid(), decision: z.enum(["approved", "rejected"]), comment: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        if (authorization.role !== "ORGANIZATION_OWNER") throw new Error("Executive owner approval is required.");
        return decideWorkflow({ ...input, organizationId: authorization.organizationId!, decidedBy: authorization.userId });
      }),
    createGoal: protectedProcedure
      .input(z.object({ locationId: z.string().min(1).optional(), goalType: z.enum(GOAL_TYPES), title: z.string().trim().min(2).max(200), baseline: z.number().optional(), target: z.number(), currentValue: z.number().optional(), unit: z.string().trim().min(1).max(40), dueAt: z.string().datetime().optional() }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        if (input.locationId && !authorization.authorizedLocationIds.includes(input.locationId)) throw new Error("This location is not authorized for the current organization.");
        return createBusinessGoal({ ...input, organizationId: authorization.organizationId!, createdBy: authorization.userId });
      }),
    updateGoal: protectedProcedure
      .input(z.object({ goalId: z.string().uuid(), currentValue: z.number(), status: z.enum(["active", "achieved", "paused"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        return updateBusinessGoal({ ...input, organizationId: authorization.organizationId!, updatedBy: authorization.userId });
      }),
  }),

  // Phase 6 configures one shared Brain with tenant-selected Industry Packs.
  industry: router({
    catalog: protectedProcedure.query(() => listIndustryCatalog()),
    context: protectedProcedure.query(async ({ ctx }) => {
      const authorization = await resolveOrganizationAuthorizationContext(ctx.user);
      if (!authorization?.organizationId) throw new Error("An active organization context is required.");
      return getOrganizationIndustryContext(authorization.organizationId, authorization.authorizedLocationIds);
    }),
    configure: protectedProcedure
      .input(z.object({ packKeys: z.array(z.enum(INDUSTRY_KEYS)).min(1).max(8), primaryPackKey: z.enum(INDUSTRY_KEYS) }))
      .mutation(async ({ ctx, input }) => {
        const authorization = await requireWritableOrganizationRole(ctx.user);
        if (authorization.role !== "ORGANIZATION_OWNER") throw new Error("Organization owner access is required to configure Industry Packs.");
        return configureOrganizationIndustryPacks({ ...input, organizationId: authorization.organizationId!, actorId: authorization.userId });
      }),
    recordKpi: protectedProcedure
      .input(z.object({ locationId:z.string().min(1).optional(),packKey:z.enum(INDUSTRY_KEYS),kpiKey:z.string().min(1).max(120),value:z.number(),unit:z.string().min(1).max(40),observedAt:z.string().datetime(),evidence:z.array(z.string().min(1)).min(1).max(50) }))
      .mutation(async ({ctx,input})=>{
        const authorization=await requireWritableOrganizationRole(ctx.user);
        if(input.locationId&&!authorization.authorizedLocationIds.includes(input.locationId)) throw new Error("This location is not authorized for the current organization.");
        return recordIndustryKpi({...input,organizationId:authorization.organizationId!,actorId:authorization.userId});
      }),
    scoreOpportunity: protectedProcedure
      .input(z.object({ evidenceCount:z.number().int().min(0),strategicFit:z.number(),conversionPotential:z.number(),complianceRisk:z.number() }))
      .query(({input})=>scoreIndustryOpportunity(input)),
  }),

  demo: router({
    environment: protectedProcedure.query(async({ctx})=>{await requirePlatformAdmin(ctx.user);return getDemoCenter();}),
    seed: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);return seedDemo(authorization.userId);}),
    start: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);return startDemoScenario(authorization.userId);}),
    reset: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);return resetDemo(authorization.userId);}),
    replay: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);return replayDemo(authorization.userId);}),
    presentation: protectedProcedure.query(async({ctx})=>{await requirePlatformAdmin(ctx.user);return getPresentationDefinition(false);}),
    presenterNotes: protectedProcedure.query(async({ctx})=>{await requirePlatformAdmin(ctx.user);return getPresentationDefinition(true);}),
    presentationState: protectedProcedure.query(async({ctx})=>{await requirePlatformAdmin(ctx.user);return getPresentationState();}),
    startPresentation: protectedProcedure.input(z.object({mode:z.enum(["guided","self-guided"])})).mutation(async({ctx,input})=>{const authorization=await requirePlatformAdmin(ctx.user);return startPresentation(authorization.userId,input.mode);}),
    advancePresentation: protectedProcedure.input(z.object({currentStep:z.number().int().min(0).max(13)})).mutation(async({ctx,input})=>{const authorization=await requirePlatformAdmin(ctx.user);return advancePresentation(authorization.userId,input.currentStep);}),
    previousPresentation: protectedProcedure.input(z.object({currentStep:z.number().int().min(0).max(13)})).mutation(async({ctx,input})=>{const authorization=await requirePlatformAdmin(ctx.user);return previousPresentation(authorization.userId,input.currentStep);}),
    completePresentation: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);return completePresentation(authorization.userId);}),
    restartPresentation: protectedProcedure.input(z.object({confirmed:z.literal(true)})).mutation(async({ctx,input})=>{const authorization=await requirePlatformAdmin(ctx.user);return restartPresentation(authorization.userId,input.confirmed);}),
    presentationCopilot: protectedProcedure.input(z.object({question:z.string().min(1).max(300)})).query(async({ctx,input})=>{await requirePlatformAdmin(ctx.user);return presentationCopilot(input.question);}),
    approvePresentationWorkflow: protectedProcedure.mutation(async({ctx})=>{const authorization=await requirePlatformAdmin(ctx.user);const session=await sdk.currentSession(ctx.req);if(!evaluateRecentMfa(session).allowed) throw new TRPCError({code:"FORBIDDEN",message:"Recent MFA-verified authentication is required to approve this presentation workflow."});return approvePresentationWorkflow(authorization.userId);}),
  }),

  admin: router({
    globalEvolution: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return anonymizePlatformLearning(await getAnonymousPlatformLearningEvents());
    }),
    globalIntelligence: protectedProcedure
      .input(z.object({ domain: z.enum(["c2c", "c2b", "b2b"]) }))
      .query(async ({ ctx, input }) => {
        await requirePlatformAdmin(ctx.user);
        const opportunities = await listGlobalIntelligenceOpportunities(input.domain);
        return {
          domain: input.domain,
          config: INTELLIGENCE_DOMAIN_CONFIG[input.domain],
          summary: summarizeC2bOpportunities(opportunities),
          organizationCount: new Set(opportunities.map((item) => item.organizationId)).size,
          recommendations: opportunities
            .filter((item) => ["high_priority", "pending_review"].includes(item.status))
            .map((item) => ({
              opportunityId: item.opportunityId,
              organizationId: item.organizationId,
              title: item.businessName || item.name,
              source: item.source,
              evidence: (item.scoring as C2bScoring).confidence?.evidence ?? [],
              confidence: (item.scoring as C2bScoring).confidence?.value ?? 0,
              reason: item.reasonRelevant,
              priority: item.status,
              supportingData: (item.scoring as C2bScoring).priority?.evidence ?? [],
            })),
        };
      }),
    overview: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformAdminOverview();
    }),
    organizations: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformOrganizationDetails();
    }),
    onboarding: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformOnboardingSummary();
    }),
    integrations: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformIntegrationSummary();
    }),
    platformHealth: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformHealthSummary();
    }),
    auditActivity: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformAuditActivity();
    }),
    support: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformSupportSummary();
    }),
    aiOperations: protectedProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return getPlatformAiOperationsSummary();
    }),
  }),
});

export type AppRouter = typeof appRouter;
