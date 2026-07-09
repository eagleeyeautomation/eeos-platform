/**
 * EEOS Intelligence Engine (IE)
 * The core AI layer that transforms business signals into executive recommendations.
 *
 * Pipeline: Signals → Business Memory → Knowledge Graph → LLM Analysis → Recommendations
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every recommendation must answer:
 *   1. Why? (why this matters)
 *   2. What evidence? (supporting signals)
 *   3. How confident? (0-100 confidence score with calibration factors)
 *   4. Expected business impact? (quantified where possible)
 *   5. Recommended action? (specific, executable)
 *   6. How to measure success? (measurement plan)
 *   7. What's the risk? (risk level)
 */

import crypto from "crypto";
import { invokeLLM } from "./_core/llm";
import {
  getRecentSignals, getBusinessMemory, getKnowledgeGraph,
  getActiveRecommendations, insertRecommendation, expireOldRecommendations,
  updateRecommendationStatus, insertAuditEntry,
} from "./db";

// IE Model Version — increment when prompt or scoring changes
const IE_MODEL_VERSION = "1.0";

// Recommendation expiry — 7 days by default
const RECOMMENDATION_TTL_DAYS = 7;

// Maximum active recommendations per tenant
const MAX_ACTIVE_RECOMMENDATIONS = 10;

// Minimum confidence threshold to surface a recommendation
const MIN_CONFIDENCE_THRESHOLD = 40;

/** The 7-element trust anatomy every recommendation must have */
interface RecommendationOutput {
  title: string;
  why: string;
  whyNow: string;
  evidence: Array<{ signal: string; weight: number; description: string }>;
  businessImpact: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendedAction: string;
  measurementPlan: string;
  confidenceScore: number;
  confidenceFactors: Array<{ factor: string; impact: "positive" | "negative"; weight: number }>;
  category: "revenue" | "pipeline" | "retention" | "operations" | "growth" | "risk" | "team";
  priority: "low" | "medium" | "high" | "critical";
}

/** JSON schema for structured LLM output */
const RECOMMENDATION_SCHEMA = {
  name: "eeos_recommendations",
  schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short, action-oriented title (max 80 chars)" },
            why: { type: "string", description: "Why this matters to the business owner (2-3 sentences)" },
            whyNow: { type: "string", description: "Why act now, not later (1-2 sentences, specific urgency)" },
            evidence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  signal: { type: "string" },
                  weight: { type: "number", minimum: 0, maximum: 3 },
                  description: { type: "string" },
                },
                required: ["signal", "weight", "description"],
              },
              description: "List of supporting signals from the data",
            },
            businessImpact: { type: "string", description: "Quantified business impact where possible (revenue, time, risk)" },
            riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
            recommendedAction: { type: "string", description: "Specific, executable action the owner should take" },
            measurementPlan: { type: "string", description: "How to measure whether this action succeeded (KPIs, timeline)" },
            confidenceScore: { type: "number", minimum: 0, maximum: 100, description: "IE confidence in this recommendation" },
            confidenceFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  impact: { type: "string", enum: ["positive", "negative"] },
                  weight: { type: "number" },
                },
                required: ["factor", "impact", "weight"],
              },
            },
            category: { type: "string", enum: ["revenue", "pipeline", "retention", "operations", "growth", "risk", "team"] },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          },
          required: [
            "title", "why", "whyNow", "evidence", "businessImpact",
            "riskLevel", "recommendedAction", "measurementPlan",
            "confidenceScore", "confidenceFactors", "category", "priority",
          ],
        },
        maxItems: 5,
      },
    },
    required: ["recommendations"],
  },
  strict: false,
};

/** Build the IE system prompt */
function buildSystemPrompt(): string {
  return `You are the EEOS Intelligence Engine (IE) — the AI core of Eagle Eye Operating System by Eagle Eye Automation.

Your mission: Transform business signals into accurate, trustworthy executive recommendations that help service business owners stop managing and start leading.

Engineering Principle: "Don't Build More. Build Accurate."

Every recommendation you generate MUST:
1. Answer WHY this matters (not just what happened)
2. Answer WHY NOW (specific urgency, not generic)
3. Cite SPECIFIC EVIDENCE from the signal data (not generic claims)
4. Quantify BUSINESS IMPACT where possible (revenue, time, risk reduction)
5. Provide a SPECIFIC, EXECUTABLE action (not "consider improving")
6. Include a MEASUREMENT PLAN with concrete KPIs and timeline
7. Assign a CONFIDENCE SCORE (0-100) based on signal quality and volume

Confidence scoring guidelines:
- 80-100: Multiple corroborating signals, high signal weight, clear trend
- 60-79: 2-3 supporting signals, moderate weight, emerging pattern
- 40-59: Single strong signal or weak pattern, worth monitoring
- Below 40: Insufficient evidence, do not surface

Risk levels:
- critical: Immediate revenue or customer loss risk
- high: Significant business impact if not addressed within 7 days
- medium: Important but not urgent, 2-4 week window
- low: Optimization opportunity, 30+ day window

Priority levels mirror risk levels but also consider business impact magnitude.

Be specific, be honest about confidence, and never fabricate signals that aren't in the data.`;
}

/** Build the IE user prompt with business context */
function buildUserPrompt(
  tenantId: string,
  memory: Awaited<ReturnType<typeof getBusinessMemory>>,
  recentSignals: Awaited<ReturnType<typeof getRecentSignals>>,
  existingRecs: Awaited<ReturnType<typeof getActiveRecommendations>>
): string {
  const signalSummary = recentSignals.slice(0, 50).map(s =>
    `[${s.signalType}] ${s.entityName || s.entityId || "entity"} (weight: ${s.signalWeight}, at: ${s.receivedAt.toISOString()})`
  ).join("\n");

  const existingTitles = existingRecs.map(r => r.title).join(", ");

  return `Analyze the following business data for tenant ${tenantId} and generate executive recommendations.

## Business Memory (Current State)
${memory ? `
- Total Pipeline Value: $${(memory.totalPipelineValue ?? 0).toLocaleString()}
- Active Opportunities: ${memory.activeOpportunities ?? 0}
- Won Opportunities (30d): ${memory.wonOpportunitiesLast30d ?? 0}
- Lost Opportunities (30d): ${memory.lostOpportunitiesLast30d ?? 0}
- Average Deal Size: $${(memory.avgDealSize ?? 0).toLocaleString()}
- Total Contacts: ${memory.totalContacts ?? 0}
- New Contacts (7d): ${memory.newContactsLast7d ?? 0}
- New Contacts (30d): ${memory.newContactsLast30d ?? 0}
- Appointments (7d): ${memory.appointmentsLast7d ?? 0}
- Appointments (30d): ${memory.appointmentsLast30d ?? 0}
- Appointment Cancellation Rate: ${((memory.appointmentCancellationRate ?? 0) * 100).toFixed(1)}%
- Business Health Score: ${memory.healthScore ?? 50}/100 (${memory.healthScoreTrend ?? "neutral"})
- Signal Activity (24h/7d/30d): ${memory.signalCount24h ?? 0} / ${memory.signalCount7d ?? 0} / ${memory.signalCount30d ?? 0}
` : "No business memory available yet — this is a new connection."}

## Recent Signals (Last 24 Hours)
${signalSummary || "No recent signals."}

## Already Active Recommendations (Do NOT duplicate these)
${existingTitles || "None"}

## Instructions
Generate 1-5 executive recommendations based on the above data.
Focus on patterns, trends, and anomalies that require executive attention.
If data is sparse, generate fewer but higher-confidence recommendations.
Do NOT generate recommendations that duplicate the already-active ones listed above.
Prioritize recommendations by business impact and urgency.`;
}

/** Hash a prompt to detect duplicate IE runs */
function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

/** Calculate final confidence score with calibration */
function calibrateConfidence(
  rawScore: number,
  signalCount: number,
  signalWindowDays: number
): number {
  // Penalize low signal volume
  const volumePenalty = signalCount < 3 ? -15 : signalCount < 10 ? -5 : 0;
  // Penalize short observation windows
  const windowPenalty = signalWindowDays < 1 ? -20 : signalWindowDays < 3 ? -10 : 0;
  // Bonus for high signal volume
  const volumeBonus = signalCount > 50 ? 5 : 0;

  return Math.max(0, Math.min(100, rawScore + volumePenalty + windowPenalty + volumeBonus));
}

/** Run the Intelligence Engine for a tenant */
export async function runIntelligenceEngine(tenantId: string): Promise<{
  generated: number;
  expired: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let generated = 0;
  let expired = 0;

  try {
    // 1. Expire stale recommendations
    await expireOldRecommendations(tenantId);
    expired = 1; // We don't get a count back, but it ran

    // 2. Gather context
    const [memory, recentSignals, existingRecs] = await Promise.all([
      getBusinessMemory(tenantId),
      getRecentSignals(tenantId, 24),
      getActiveRecommendations(tenantId),
    ]);

    // Don't run IE if we already have max recommendations
    if (existingRecs.length >= MAX_ACTIVE_RECOMMENDATIONS) {
      console.log(`[IE] Tenant ${tenantId} already has ${existingRecs.length} active recommendations, skipping`);
      return { generated: 0, expired, errors };
    }

    // Don't run IE with no signals and no memory
    if (!memory && recentSignals.length === 0) {
      console.log(`[IE] Tenant ${tenantId} has no data yet, skipping`);
      return { generated: 0, expired, errors };
    }

    // 3. Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(tenantId, memory, recentSignals, existingRecs);
    const promptHash = hashPrompt(userPrompt);

    // 4. Invoke LLM with structured output
    console.log(`[IE] Running for tenant ${tenantId} with ${recentSignals.length} signals`);
    const llmResult = await invokeLLM({
      model: "claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      outputSchema: RECOMMENDATION_SCHEMA,
      maxTokens: 4000,
    });

    // 5. Parse LLM response
    const rawContent = llmResult.choices[0]?.message?.content;
    if (!rawContent) {
      errors.push("LLM returned empty response");
      return { generated, expired, errors };
    }

    let parsed: { recommendations: RecommendationOutput[] };
    try {
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      parsed = JSON.parse(content);
    } catch {
      errors.push("Failed to parse LLM JSON response");
      return { generated, expired, errors };
    }

    const recommendations = parsed.recommendations || [];

    // 6. Store each recommendation
    for (const rec of recommendations) {
      // Apply confidence calibration
      const calibratedConfidence = calibrateConfidence(
        rec.confidenceScore,
        recentSignals.length,
        1 // 24h window
      );

      // Skip low-confidence recommendations
      if (calibratedConfidence < MIN_CONFIDENCE_THRESHOLD) {
        console.log(`[IE] Skipping low-confidence recommendation: "${rec.title}" (${calibratedConfidence})`);
        continue;
      }

      const expiresAt = new Date(Date.now() + RECOMMENDATION_TTL_DAYS * 24 * 60 * 60 * 1000);

      await insertRecommendation({
        tenantId,
        title: rec.title,
        why: rec.why,
        whyNow: rec.whyNow,
        evidence: rec.evidence,
        businessImpact: rec.businessImpact,
        riskLevel: rec.riskLevel,
        recommendedAction: rec.recommendedAction,
        measurementPlan: rec.measurementPlan,
        confidenceScore: calibratedConfidence,
        confidenceFactors: rec.confidenceFactors,
        signalCount: recentSignals.length,
        signalWindowDays: 1,
        category: rec.category,
        priority: rec.priority,
        ieModelVersion: IE_MODEL_VERSION,
        promptHash,
        rawLlmResponse: typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent),
        status: "active",
        expiresAt,
      });

      generated++;
    }

    // 7. Audit log
    await insertAuditEntry({
      tenantId,
      actor: "ie_engine",
      action: "recommendations.generated",
      outcome: "success",
      details: {
        generated,
        expired,
        signalCount: recentSignals.length,
        modelVersion: IE_MODEL_VERSION,
      },
      durationMs: Date.now() - startTime,
    });

    console.log(`[IE] Generated ${generated} recommendations for tenant ${tenantId} (${Date.now() - startTime}ms)`);
    return { generated, expired, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(errorMsg);
    console.error(`[IE] Error for tenant ${tenantId}:`, error);

    await insertAuditEntry({
      tenantId,
      actor: "ie_engine",
      action: "recommendations.generated",
      outcome: "failure",
      errorMessage: errorMsg,
      durationMs: Date.now() - startTime,
    });

    return { generated, expired, errors };
  }
}

/** Trigger IE for a tenant after a batch of signals */
export async function triggerIeAfterSignals(tenantId: string): Promise<void> {
  // Run IE asynchronously — don't block the webhook response
  setTimeout(() => {
    runIntelligenceEngine(tenantId)
      .then(result => console.log(`[IE] Auto-trigger complete for ${tenantId}:`, result))
      .catch(err => console.error(`[IE] Auto-trigger error for ${tenantId}:`, err));
  }, 2000); // 2 second delay to let signals settle
}
