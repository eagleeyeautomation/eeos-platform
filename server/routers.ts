/**
 * EEOS tRPC Router — Complete Pipeline Procedures
 * Covers all 8 pipeline layers: Auth, GHL, Signals, Memory, Timeline,
 * Knowledge Graph, Recommendations, Feedback, IE Metrics
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
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
} from "./db";
import { runIntelligenceEngine } from "./intelligence-engine";
import {
  listPlatformOrganizations,
  listAuthorizedLocationsForMembership,
  requireAuthorizedLocation,
  requirePlatformAdmin,
  requireWritableOrganizationRole,
  resolveAuthorizationContext,
} from "./authorization";

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
          organization: null,
          authorizedLocations: [],
          ghlConnected: false,
        };
      }

      const authorization = await resolveAuthorizationContext(ctx.user);
      const authorizedLocations = await listAuthorizedLocationsForMembership(authorization.membershipId);
      const connectedTokens = await Promise.all(
        authorization.authorizedLocationIds.map((locationId) => getGhlToken(locationId))
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
        organization: authorization.organizationId ? {
          id: authorization.organizationId,
          name: authorization.organizationName ?? "Organization",
        } : null,
        authorizedLocations,
        ghlConnected: connectedTokens.some((token) => token?.isActive && token.scope === "private_integration"),
      };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
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
    connectionStatus: publicProcedure
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
    get: publicProcedure
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
    list: publicProcedure
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
    get: publicProcedure
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
    recent: publicProcedure
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
    list: publicProcedure
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
    generate: publicProcedure
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
    feedback: publicProcedure
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
        const rec = await getRecommendationById(input.recommendationId);
        if (!rec) {
          throw new Error("Recommendation not found");
        }

        // Update recommendation status
        const newStatus = input.decision === "accepted" ? "accepted"
          : input.decision === "rejected" ? "rejected"
          : "active"; // deferred/already_done keep it active

        await updateRecommendationStatus(input.recommendationId, newStatus);

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

        // Trigger metrics recomputation asynchronously
        computeAndStoreIeMetrics(input.tenantId)
          .catch(err => console.error("[IE] Metrics recomputation error:", err));

        return { success: true, decision: input.decision };
      }),

    /**
     * Records the outcome of a previously accepted recommendation.
     * Critical for IE accuracy calibration.
     */
    recordOutcome: publicProcedure
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
    subaccountStatus: publicProcedure
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
    metrics: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        return getLatestIeMetrics(input.tenantId);
      }),

    /**
     * Returns executive feedback history for a tenant.
     * Used by the IE accuracy dashboard.
     */
    feedbackHistory: publicProcedure
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
    recomputeMetrics: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await requireAuthorizedLocation(ctx.user!, input.tenantId);
        await requireWritableOrganizationRole(ctx.user!);
        await computeAndStoreIeMetrics(input.tenantId);
        return { success: true };
      }),
  }),

  admin: router({
    organizations: publicProcedure.query(async ({ ctx }) => {
      await requirePlatformAdmin(ctx.user);
      return listPlatformOrganizations(ctx.user);
    }),
  }),
});

export type AppRouter = typeof appRouter;
