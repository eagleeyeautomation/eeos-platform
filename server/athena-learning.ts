import type { Express, Response } from "express";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { PRN_BUSINESS_ID } from "./business-memory";
import { withDatabase, withTransaction } from "./db/postgres";

export type LearningCategory = "sales" | "revenue" | "operations" | "customer_experience" | "b2b" | "c2b" | "risk" | "growth";
export type ExecutiveDecision = "accepted" | "dismissed" | "deferred" | "modified" | "no_decision";
export type FeedbackStatus = "pending" | "in_progress" | "completed" | "cancelled" | "review_due";
export type LessonType = "successful" | "partially_successful" | "unsuccessful" | "inconclusive" | "invalidated" | "superseded";

export type RecommendationFeedbackRecord = {
  id: string;
  businessId: string;
  recommendationId: string;
  briefingId: string | null;
  executiveDecision: ExecutiveDecision;
  status: FeedbackStatus;
  feedback: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationMeasurementRecord = {
  id: string;
  businessId: string;
  recommendationId: string;
  metricName: string;
  baselineValue: number | null;
  targetValue: number | null;
  actualValue: number | null;
  unit: string;
  measurementSource: string;
  measuredAt: string;
  verified: boolean;
  verificationEvidence: string;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationLessonRecord = {
  id: string;
  businessId: string;
  recommendationId: string;
  lessonType: LessonType;
  summary: string;
  evidence: string[];
  confidenceAdjustment: number;
  rankingAdjustment: number;
  reusablePattern: string;
  approvedForReuse: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AthenaLearningProfile = {
  id: string;
  businessId: string;
  category: LearningCategory;
  evidenceCount: number;
  successfulOutcomeCount: number;
  unsuccessfulOutcomeCount: number;
  inconclusiveOutcomeCount: number;
  reliabilityScore: number;
  lastUpdatedAt: string;
};

export type AthenaLearningContext = {
  businessId: string;
  feedback: RecommendationFeedbackRecord[];
  measurements: RecommendationMeasurementRecord[];
  lessons: RecommendationLessonRecord[];
  profiles: AthenaLearningProfile[];
  adaptiveLearningReady: boolean;
  adaptiveLearningReason: string;
};

const categories: LearningCategory[] = ["sales", "revenue", "operations", "customer_experience", "b2b", "c2b", "risk", "growth"];
const insufficientLearningHistory = "Insufficient verified outcome history for adaptive learning.";

export function registerAthenaLearningRoutes(app: Express) {
  app.get("/api/prn/athena/learning", async (_req, res) => {
    try {
      const context = await loadAthenaLearningContext(PRN_BUSINESS_ID);
      res.status(200).json({ ok: true, ...context });
    } catch (error) {
      handleLearningError(res, error, "Unable to load Athena Learning.");
    }
  });

  app.post("/api/prn/athena/feedback", async (req, res) => {
    try {
      const record = await createRecommendationFeedback(PRN_BUSINESS_ID, req.body);
      res.status(201).json({ ok: true, record });
    } catch (error) {
      handleLearningError(res, error, "Unable to create recommendation feedback.");
    }
  });

  app.post("/api/prn/athena/measurements", async (req, res) => {
    try {
      const record = await createRecommendationMeasurement(PRN_BUSINESS_ID, req.body);
      res.status(201).json({ ok: true, record });
    } catch (error) {
      handleLearningError(res, error, "Unable to create recommendation measurement.");
    }
  });

  app.post("/api/prn/athena/outcomes/review", async (req, res) => {
    try {
      const review = await reviewRecommendationOutcome(PRN_BUSINESS_ID, req.body.recommendationId);
      res.status(200).json(review);
    } catch (error) {
      handleLearningError(res, error, "Unable to review recommendation outcome.");
    }
  });

  app.get("/api/prn/athena/recommendations/:recommendationId/history", async (req, res) => {
    try {
      const history = await loadRecommendationHistory(PRN_BUSINESS_ID, req.params.recommendationId);
      res.status(200).json({ ok: true, recommendationId: req.params.recommendationId, ...history });
    } catch (error) {
      handleLearningError(res, error, "Unable to load recommendation history.");
    }
  });

  app.post("/api/prn/athena/lessons/:lessonId/approve", async (req, res) => {
    try {
      const record = await approveRecommendationLesson(PRN_BUSINESS_ID, req.params.lessonId, req.body.approved !== false);
      res.status(200).json({ ok: true, record });
    } catch (error) {
      handleLearningError(res, error, "Unable to update recommendation lesson approval.");
    }
  });
}

export async function loadAthenaLearningContext(businessId: string): Promise<AthenaLearningContext> {
  await ensureAthenaLearningSchema();
  await ensureLearningProfiles(businessId);

  return withDatabase(async (client) => {
    const [feedback, measurements, lessons, profiles] = await Promise.all([
      selectFeedback(client, businessId),
      selectMeasurements(client, businessId),
      selectLessons(client, businessId),
      selectProfiles(client, businessId),
    ]);
    const adaptiveLearningReady = profiles.some(isProfileReady);

    return {
      businessId,
      feedback,
      measurements,
      lessons,
      profiles,
      adaptiveLearningReady,
      adaptiveLearningReason: adaptiveLearningReady ? "Verified outcome thresholds met for at least one category." : insufficientLearningHistory,
    };
  });
}

export async function createRecommendationFeedback(businessId: string, input: Record<string, unknown>) {
  const record = normalizeFeedbackInput(businessId, input);
  await ensureAthenaLearningSchema();

  return withTransaction(async (client) => {
    const result = await client.query<DbFeedback>(
      `
        insert into recommendation_feedback (
          id, business_id, recommendation_id, briefing_id, executive_decision, status, feedback, owner, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
        returning id, business_id, recommendation_id, briefing_id, executive_decision, status, feedback, owner, created_at, updated_at
      `,
      [randomUUID(), record.businessId, record.recommendationId, record.briefingId, record.executiveDecision, record.status, record.feedback, record.owner],
    );
    const created = mapFeedback(result.rows[0]);
    await insertLearningAudit(client, businessId, created.recommendationId, "executive", "feedback.created", null, created, [created.id]);
    return created;
  });
}

export async function createRecommendationMeasurement(businessId: string, input: Record<string, unknown>) {
  const record = normalizeMeasurementInput(businessId, input);
  await ensureAthenaLearningSchema();

  return withTransaction(async (client) => {
    const result = await client.query<DbMeasurement>(
      `
        insert into recommendation_measurements (
          id, business_id, recommendation_id, metric_name, baseline_value, target_value, actual_value, unit,
          measurement_source, measured_at, verified, verification_evidence, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
        returning id, business_id, recommendation_id, metric_name, baseline_value, target_value, actual_value, unit,
          measurement_source, measured_at, verified, verification_evidence, created_at, updated_at
      `,
      [
        randomUUID(),
        record.businessId,
        record.recommendationId,
        record.metricName,
        record.baselineValue,
        record.targetValue,
        record.actualValue,
        record.unit,
        record.measurementSource,
        record.measuredAt,
        record.verified,
        record.verificationEvidence,
      ],
    );
    const created = mapMeasurement(result.rows[0]);
    await insertLearningAudit(client, businessId, created.recommendationId, "executive", "measurement.created", null, created, [created.id]);
    return created;
  });
}

export async function reviewRecommendationOutcome(businessId: string, recommendationId: string) {
  if (!recommendationId) throw new Error("recommendationId is required.");
  await ensureAthenaLearningSchema();

  return withTransaction(async (client) => {
    const measurements = await selectMeasurements(client, businessId, recommendationId);
    const verified = measurements.filter((measurement) => measurement.verified && measurement.verificationEvidence.trim());
    const outcome = classifyOutcome(verified);
    const lesson = buildLessonFromOutcome(businessId, recommendationId, outcome, verified);
    const result = await client.query<DbLesson>(
      `
        insert into recommendation_lessons (
          id, business_id, recommendation_id, lesson_type, summary, evidence, confidence_adjustment,
          ranking_adjustment, reusable_pattern, approved_for_reuse, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, false, now(), now())
        returning id, business_id, recommendation_id, lesson_type, summary, evidence, confidence_adjustment,
          ranking_adjustment, reusable_pattern, approved_for_reuse, created_at, updated_at
      `,
      [
        randomUUID(),
        businessId,
        recommendationId,
        lesson.lessonType,
        lesson.summary,
        JSON.stringify(lesson.evidence),
        lesson.confidenceAdjustment,
        lesson.rankingAdjustment,
        lesson.reusablePattern,
      ],
    );
    const createdLesson = mapLesson(result.rows[0]);
    const review = {
      recommendationId,
      outcome,
      evidence: createdLesson.evidence,
      expectedOutcome: verified[0]?.targetValue === null ? "No verified target recorded." : String(verified[0]?.targetValue ?? "No verified target recorded."),
      actualOutcome: verified[0]?.actualValue === null ? "No verified actual value recorded." : String(verified[0]?.actualValue ?? "No verified actual value recorded."),
      lesson: createdLesson.summary,
      confidenceAdjustment: createdLesson.confidenceAdjustment,
      rankingAdjustment: createdLesson.rankingAdjustment,
      requiresExecutiveApproval: true,
      lessonId: createdLesson.id,
    };
    await insertLearningAudit(client, businessId, recommendationId, "system", "outcome.reviewed", null, review, createdLesson.evidence);
    return review;
  });
}

export async function approveRecommendationLesson(businessId: string, lessonId: string, approved: boolean) {
  await ensureAthenaLearningSchema();

  return withTransaction(async (client) => {
    const existing = await selectLessonById(client, businessId, lessonId);
    if (!existing) throw new Error("Recommendation lesson not found.");
    const result = await client.query<DbLesson>(
      `
        update recommendation_lessons
        set approved_for_reuse = $3, updated_at = now()
        where business_id = $1 and id = $2
        returning id, business_id, recommendation_id, lesson_type, summary, evidence, confidence_adjustment,
          ranking_adjustment, reusable_pattern, approved_for_reuse, created_at, updated_at
      `,
      [businessId, lessonId, approved],
    );
    const updated = mapLesson(result.rows[0]);
    await recalculateLearningProfile(client, businessId, categoryFromRecommendationId(updated.recommendationId));
    await insertLearningAudit(client, businessId, updated.recommendationId, "executive", approved ? "lesson.approved" : "lesson.rejected", existing, updated, [updated.id]);
    return updated;
  });
}

export async function loadRecommendationHistory(businessId: string, recommendationId: string) {
  await ensureAthenaLearningSchema();
  return withDatabase(async (client) => ({
    feedback: await selectFeedback(client, businessId, recommendationId),
    measurements: await selectMeasurements(client, businessId, recommendationId),
    lessons: await selectLessons(client, businessId, recommendationId),
  }));
}

export function buildLearningInfluenceForRecommendation(
  recommendation: { id: string; category: string; dataTimestamp?: string },
  context: AthenaLearningContext | undefined,
) {
  if (!context) {
    return { applied: false, explanation: insufficientLearningHistory };
  }

  const category = normalizeCategory(recommendation.category);
  const feedback = context.feedback.filter((item) => item.recommendationId === recommendation.id);
  const approvedLessons = context.lessons.filter((lesson) => lesson.approvedForReuse && (lesson.recommendationId === recommendation.id || categoryFromRecommendationId(lesson.recommendationId) === category));
  const profile = context.profiles.find((item) => item.category === category);
  const verifiedOutcomeCount = context.measurements.filter((item) => item.verified && item.recommendationId === recommendation.id).length;
  const ready = Boolean(profile && isProfileReady(profile) && approvedLessons.length > 0);

  if (!ready) {
    return {
      applied: false,
      priorRecommendationCount: feedback.length,
      verifiedOutcomeCount,
      approvedLessonsUsed: [],
      confidenceAdjustment: 0,
      rankingAdjustment: 0,
      explanation: insufficientLearningHistory,
    };
  }

  const confidenceAdjustment = clamp(approvedLessons.reduce((sum, lesson) => sum + lesson.confidenceAdjustment, 0), -15, 10);
  const rankingAdjustment = clamp(approvedLessons.reduce((sum, lesson) => sum + lesson.rankingAdjustment, 0), -20, 15);

  return {
    applied: true,
    priorRecommendationCount: feedback.length,
    verifiedOutcomeCount,
    approvedLessonsUsed: approvedLessons.map((lesson) => lesson.id),
    confidenceAdjustment,
    rankingAdjustment,
    explanation: `Applied ${approvedLessons.length} executive-approved lesson${approvedLessons.length === 1 ? "" : "s"} from ${category} outcomes for this business only.`,
  };
}

export function isDismissedByLearningWithoutNewEvidence(recommendationId: string, dataTimestamp: string, context: AthenaLearningContext | undefined) {
  if (!context) return false;
  return context.feedback.some((feedback) => {
    if (feedback.recommendationId !== recommendationId || feedback.executiveDecision !== "dismissed") return false;
    return new Date(feedback.updatedAt).getTime() >= new Date(dataTimestamp).getTime();
  });
}

export function applyLearningAdjustment<T extends { id: string; category: string; confidence: number; businessImpact: { score: number }; confidenceReason: string; dataTimestamp?: string }>(
  priority: T,
  context: AthenaLearningContext | undefined,
) {
  const influence = buildLearningInfluenceForRecommendation(priority, context);
  if (!influence.applied) {
    return {
      priority,
      learningInfluence: influence,
    };
  }

  return {
    priority: {
      ...priority,
      confidence: clamp(priority.confidence + (influence.confidenceAdjustment ?? 0), 0, 100),
      businessImpact: {
        ...priority.businessImpact,
        score: clamp(priority.businessImpact.score + (influence.rankingAdjustment ?? 0), 0, 100),
      },
      confidenceReason: `${priority.confidenceReason} Athena Learning adjusted this recommendation using verified, executive-approved outcome evidence.`,
    },
    learningInfluence: influence,
  };
}

export async function ensureAthenaLearningSchema() {
  await withDatabase(async (client) => {
    await client.query(athenaLearningSchemaSql);
  });
}

async function ensureLearningProfiles(businessId: string) {
  await ensureAthenaLearningSchema();
  await withTransaction(async (client) => {
    for (const category of categories) {
      await client.query(
        `
          insert into athena_learning_profiles (
            id, business_id, category, evidence_count, successful_outcome_count, unsuccessful_outcome_count,
            inconclusive_outcome_count, reliability_score, last_updated_at
          )
          values ($1, $2, $3, 0, 0, 0, 0, 0, now())
          on conflict (business_id, category) do nothing
        `,
        [randomUUID(), businessId, category],
      );
    }
  });
}

async function recalculateLearningProfile(client: PoolClient, businessId: string, category: LearningCategory) {
  const lessons = (await selectLessons(client, businessId)).filter((lesson) => lesson.approvedForReuse && categoryFromRecommendationId(lesson.recommendationId) === category);
  const evidenceCount = lessons.reduce((sum, lesson) => sum + lesson.evidence.length, 0);
  const successfulOutcomeCount = lessons.filter((lesson) => lesson.lessonType === "successful").length;
  const unsuccessfulOutcomeCount = lessons.filter((lesson) => lesson.lessonType === "unsuccessful").length;
  const inconclusiveOutcomeCount = lessons.filter((lesson) => lesson.lessonType === "inconclusive").length;
  const verifiedCount = lessons.length;
  const reliabilityScore = calculateReliabilityScore({
    evidenceCount,
    successfulOutcomeCount,
    unsuccessfulOutcomeCount,
    inconclusiveOutcomeCount,
    verifiedCount,
  });

  await client.query(
    `
      insert into athena_learning_profiles (
        id, business_id, category, evidence_count, successful_outcome_count, unsuccessful_outcome_count,
        inconclusive_outcome_count, reliability_score, last_updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, now())
      on conflict (business_id, category)
      do update set
        evidence_count = excluded.evidence_count,
        successful_outcome_count = excluded.successful_outcome_count,
        unsuccessful_outcome_count = excluded.unsuccessful_outcome_count,
        inconclusive_outcome_count = excluded.inconclusive_outcome_count,
        reliability_score = excluded.reliability_score,
        last_updated_at = now()
    `,
    [randomUUID(), businessId, category, evidenceCount, successfulOutcomeCount, unsuccessfulOutcomeCount, inconclusiveOutcomeCount, reliabilityScore],
  );
}

export function calculateReliabilityScore(input: {
  evidenceCount: number;
  successfulOutcomeCount: number;
  unsuccessfulOutcomeCount: number;
  inconclusiveOutcomeCount: number;
  verifiedCount: number;
}) {
  if (input.verifiedCount < 5 || input.verifiedCount - input.inconclusiveOutcomeCount < 3) return 0;
  const resolved = Math.max(1, input.verifiedCount - input.inconclusiveOutcomeCount);
  const successRatio = input.successfulOutcomeCount / resolved;
  const evidenceScore = Math.min(35, input.evidenceCount * 5);
  const outcomeScore = Math.round(successRatio * 45);
  const completenessScore = Math.max(0, 20 - input.inconclusiveOutcomeCount * 3);
  return clamp(evidenceScore + outcomeScore + completenessScore, 0, 100);
}

export function classifyOutcome(measurements: RecommendationMeasurementRecord[]): LessonType {
  const verified = measurements.filter((measurement) => measurement.verified && measurement.verificationEvidence.trim());
  if (verified.length === 0) return "inconclusive";

  const scored = verified.filter((measurement) => measurement.targetValue !== null && measurement.actualValue !== null);
  if (scored.length === 0) return "inconclusive";
  const hits = scored.filter((measurement) => Number(measurement.actualValue) >= Number(measurement.targetValue)).length;
  if (hits === scored.length) return "successful";
  if (hits > 0) return "partially_successful";
  return "unsuccessful";
}

function buildLessonFromOutcome(
  businessId: string,
  recommendationId: string,
  lessonType: LessonType,
  measurements: RecommendationMeasurementRecord[],
) {
  const evidence = measurements.map((measurement) => `${measurement.metricName}: actual ${measurement.actualValue ?? "unknown"} ${measurement.unit}; evidence ${measurement.verificationEvidence}`);
  const adjustment = adjustmentForLesson(lessonType);
  return {
    businessId,
    recommendationId,
    lessonType,
    summary: lessonType === "inconclusive"
      ? "Verified evidence is insufficient to classify this recommendation outcome."
      : `Verified measurements classify this recommendation as ${lessonType}. This is not causal proof and requires executive approval before reuse.`,
    evidence,
    confidenceAdjustment: adjustment.confidenceAdjustment,
    rankingAdjustment: adjustment.rankingAdjustment,
    reusablePattern: `${categoryFromRecommendationId(recommendationId)}:${lessonType}`,
  };
}

function adjustmentForLesson(lessonType: LessonType) {
  if (lessonType === "successful") return { confidenceAdjustment: 10, rankingAdjustment: 15 };
  if (lessonType === "partially_successful") return { confidenceAdjustment: 4, rankingAdjustment: 6 };
  if (lessonType === "unsuccessful") return { confidenceAdjustment: -12, rankingAdjustment: -18 };
  if (lessonType === "invalidated") return { confidenceAdjustment: -15, rankingAdjustment: -20 };
  return { confidenceAdjustment: 0, rankingAdjustment: 0 };
}

async function selectFeedback(client: PoolClient, businessId: string, recommendationId?: string) {
  const result = await client.query<DbFeedback>(
    `
      select id, business_id, recommendation_id, briefing_id, executive_decision, status, feedback, owner, created_at, updated_at
      from recommendation_feedback
      where business_id = $1
        and ($2::text is null or recommendation_id = $2)
      order by created_at desc
    `,
    [businessId, recommendationId ?? null],
  );
  return result.rows.map(mapFeedback);
}

async function selectMeasurements(client: PoolClient, businessId: string, recommendationId?: string) {
  const result = await client.query<DbMeasurement>(
    `
      select id, business_id, recommendation_id, metric_name, baseline_value, target_value, actual_value,
        unit, measurement_source, measured_at, verified, verification_evidence, created_at, updated_at
      from recommendation_measurements
      where business_id = $1
        and ($2::text is null or recommendation_id = $2)
      order by measured_at desc, created_at desc
    `,
    [businessId, recommendationId ?? null],
  );
  return result.rows.map(mapMeasurement);
}

async function selectLessons(client: PoolClient, businessId: string, recommendationId?: string) {
  const result = await client.query<DbLesson>(
    `
      select id, business_id, recommendation_id, lesson_type, summary, evidence, confidence_adjustment,
        ranking_adjustment, reusable_pattern, approved_for_reuse, created_at, updated_at
      from recommendation_lessons
      where business_id = $1
        and ($2::text is null or recommendation_id = $2)
      order by created_at desc
    `,
    [businessId, recommendationId ?? null],
  );
  return result.rows.map(mapLesson);
}

async function selectLessonById(client: PoolClient, businessId: string, lessonId: string) {
  const result = await client.query<DbLesson>(
    `
      select id, business_id, recommendation_id, lesson_type, summary, evidence, confidence_adjustment,
        ranking_adjustment, reusable_pattern, approved_for_reuse, created_at, updated_at
      from recommendation_lessons
      where business_id = $1 and id = $2
      limit 1
    `,
    [businessId, lessonId],
  );
  return result.rows[0] ? mapLesson(result.rows[0]) : null;
}

async function selectProfiles(client: PoolClient, businessId: string) {
  const result = await client.query<DbProfile>(
    `
      select id, business_id, category, evidence_count, successful_outcome_count, unsuccessful_outcome_count,
        inconclusive_outcome_count, reliability_score, last_updated_at
      from athena_learning_profiles
      where business_id = $1
      order by category
    `,
    [businessId],
  );
  return result.rows.map(mapProfile);
}

async function insertLearningAudit(
  client: PoolClient,
  businessId: string,
  recommendationId: string,
  actorType: "executive" | "system",
  action: string,
  priorState: unknown,
  newState: unknown,
  evidenceReferences: string[],
) {
  await client.query(
    `
      insert into athena_learning_audit_events (
        id, business_id, recommendation_id, actor_type, action, prior_state, new_state, evidence_references, created_at
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, now())
    `,
    [randomUUID(), businessId, recommendationId, actorType, action, JSON.stringify(priorState ?? null), JSON.stringify(newState), JSON.stringify(evidenceReferences)],
  );
}

function normalizeFeedbackInput(businessId: string, input: Record<string, unknown>): Omit<RecommendationFeedbackRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    businessId,
    recommendationId: requireText(input.recommendationId, "recommendationId"),
    briefingId: optionalText(input.briefingId) || null,
    executiveDecision: normalizeEnum(input.executiveDecision, ["accepted", "dismissed", "deferred", "modified", "no_decision"], "executiveDecision"),
    status: normalizeEnum(input.status, ["pending", "in_progress", "completed", "cancelled", "review_due"], "status"),
    feedback: optionalText(input.feedback) || "No feedback entered.",
    owner: optionalText(input.owner) || "Unassigned",
  };
}

function normalizeMeasurementInput(businessId: string, input: Record<string, unknown>): Omit<RecommendationMeasurementRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    businessId,
    recommendationId: requireText(input.recommendationId, "recommendationId"),
    metricName: requireText(input.metricName, "metricName"),
    baselineValue: readNullableNumber(input.baselineValue),
    targetValue: readNullableNumber(input.targetValue),
    actualValue: readNullableNumber(input.actualValue),
    unit: optionalText(input.unit) || "count",
    measurementSource: optionalText(input.measurementSource) || "user-entered evidence",
    measuredAt: optionalText(input.measuredAt) || new Date().toISOString(),
    verified: input.verified === true,
    verificationEvidence: optionalText(input.verificationEvidence) || "",
  };
}

function normalizeEnum<T extends string>(value: unknown, allowed: T[], field: string): T {
  if (typeof value === "string" && allowed.includes(value as T)) return value as T;
  throw new Error(`${field} must be one of: ${allowed.join(", ")}.`);
}

function requireText(value: unknown, field: string) {
  const normalized = optionalText(value);
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Measurement values must be numeric.");
  return parsed;
}

function categoryFromRecommendationId(recommendationId: string): LearningCategory {
  const prefix = recommendationId.split("-")[0];
  return normalizeCategory(prefix);
}

function normalizeCategory(category: string): LearningCategory {
  const normalized = category.toLowerCase().replace(/\s+/g, "_");
  if (categories.includes(normalized as LearningCategory)) return normalized as LearningCategory;
  if (normalized === "customer experience") return "customer_experience";
  return "growth";
}

function isProfileReady(profile: AthenaLearningProfile) {
  const resolved = profile.successfulOutcomeCount + profile.unsuccessfulOutcomeCount;
  return profile.evidenceCount >= 5 && resolved >= 3 && profile.reliabilityScore > 0;
}

function handleLearningError(res: Response, error: unknown, message: string) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  const status = detail.includes("required") || detail.includes("must be") ? 400 : 500;
  console.error(JSON.stringify({ level: "error", component: "athena_learning", event: "learning.failed", error: detail }));
  res.status(status).json({ ok: false, error: message, detail: status === 400 ? detail : undefined });
}

function mapFeedback(row: DbFeedback): RecommendationFeedbackRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    recommendationId: row.recommendation_id,
    briefingId: row.briefing_id,
    executiveDecision: row.executive_decision,
    status: row.status,
    feedback: row.feedback,
    owner: row.owner,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapMeasurement(row: DbMeasurement): RecommendationMeasurementRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    recommendationId: row.recommendation_id,
    metricName: row.metric_name,
    baselineValue: row.baseline_value === null ? null : Number(row.baseline_value),
    targetValue: row.target_value === null ? null : Number(row.target_value),
    actualValue: row.actual_value === null ? null : Number(row.actual_value),
    unit: row.unit,
    measurementSource: row.measurement_source,
    measuredAt: toIso(row.measured_at),
    verified: row.verified,
    verificationEvidence: row.verification_evidence,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapLesson(row: DbLesson): RecommendationLessonRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    recommendationId: row.recommendation_id,
    lessonType: row.lesson_type,
    summary: row.summary,
    evidence: Array.isArray(row.evidence) ? row.evidence.map(String) : [],
    confidenceAdjustment: row.confidence_adjustment,
    rankingAdjustment: row.ranking_adjustment,
    reusablePattern: row.reusable_pattern,
    approvedForReuse: row.approved_for_reuse,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapProfile(row: DbProfile): AthenaLearningProfile {
  return {
    id: row.id,
    businessId: row.business_id,
    category: row.category,
    evidenceCount: row.evidence_count,
    successfulOutcomeCount: row.successful_outcome_count,
    unsuccessfulOutcomeCount: row.unsuccessful_outcome_count,
    inconclusiveOutcomeCount: row.inconclusive_outcome_count,
    reliabilityScore: row.reliability_score,
    lastUpdatedAt: toIso(row.last_updated_at),
  };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type DbFeedback = {
  id: string;
  business_id: string;
  recommendation_id: string;
  briefing_id: string | null;
  executive_decision: ExecutiveDecision;
  status: FeedbackStatus;
  feedback: string;
  owner: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbMeasurement = {
  id: string;
  business_id: string;
  recommendation_id: string;
  metric_name: string;
  baseline_value: number | string | null;
  target_value: number | string | null;
  actual_value: number | string | null;
  unit: string;
  measurement_source: string;
  measured_at: Date | string;
  verified: boolean;
  verification_evidence: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbLesson = {
  id: string;
  business_id: string;
  recommendation_id: string;
  lesson_type: LessonType;
  summary: string;
  evidence: unknown;
  confidence_adjustment: number;
  ranking_adjustment: number;
  reusable_pattern: string;
  approved_for_reuse: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbProfile = {
  id: string;
  business_id: string;
  category: LearningCategory;
  evidence_count: number;
  successful_outcome_count: number;
  unsuccessful_outcome_count: number;
  inconclusive_outcome_count: number;
  reliability_score: number;
  last_updated_at: Date | string;
};

const athenaLearningSchemaSql = `
  create table if not exists recommendation_feedback (
    id text primary key,
    business_id text not null,
    recommendation_id text not null,
    briefing_id text,
    executive_decision text not null check (executive_decision in ('accepted', 'dismissed', 'deferred', 'modified', 'no_decision')),
    status text not null check (status in ('pending', 'in_progress', 'completed', 'cancelled', 'review_due')),
    feedback text not null,
    owner text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists recommendation_feedback_business_recommendation_idx
    on recommendation_feedback (business_id, recommendation_id, created_at desc);

  create table if not exists recommendation_measurements (
    id text primary key,
    business_id text not null,
    recommendation_id text not null,
    metric_name text not null,
    baseline_value numeric,
    target_value numeric,
    actual_value numeric,
    unit text not null,
    measurement_source text not null,
    measured_at timestamptz not null,
    verified boolean not null default false,
    verification_evidence text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists recommendation_measurements_business_recommendation_idx
    on recommendation_measurements (business_id, recommendation_id, measured_at desc);

  create table if not exists recommendation_lessons (
    id text primary key,
    business_id text not null,
    recommendation_id text not null,
    lesson_type text not null check (lesson_type in ('successful', 'partially_successful', 'unsuccessful', 'inconclusive', 'invalidated', 'superseded')),
    summary text not null,
    evidence jsonb not null default '[]'::jsonb,
    confidence_adjustment integer not null default 0 check (confidence_adjustment between -15 and 10),
    ranking_adjustment integer not null default 0 check (ranking_adjustment between -20 and 15),
    reusable_pattern text not null,
    approved_for_reuse boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index if not exists recommendation_lessons_business_recommendation_idx
    on recommendation_lessons (business_id, recommendation_id, created_at desc);

  create table if not exists athena_learning_profiles (
    id text primary key,
    business_id text not null,
    category text not null,
    evidence_count integer not null default 0,
    successful_outcome_count integer not null default 0,
    unsuccessful_outcome_count integer not null default 0,
    inconclusive_outcome_count integer not null default 0,
    reliability_score integer not null default 0,
    last_updated_at timestamptz not null default now(),
    unique (business_id, category)
  );

  create table if not exists athena_learning_audit_events (
    id text primary key,
    business_id text not null,
    recommendation_id text not null,
    actor_type text not null,
    action text not null,
    prior_state jsonb,
    new_state jsonb not null default '{}'::jsonb,
    evidence_references jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  );
  create index if not exists athena_learning_audit_business_recommendation_idx
    on athena_learning_audit_events (business_id, recommendation_id, created_at desc);
`;

export const athenaLearningInternals = {
  applyLearningAdjustment,
  buildLearningInfluenceForRecommendation,
  calculateReliabilityScore,
  classifyOutcome,
  isDismissedByLearningWithoutNewEvidence,
};
