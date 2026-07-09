import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Express, Request, Response as ExpressResponse } from "express";

type GhlTokenSet = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  scopes: string[];
  locationId: string;
  companyId?: string;
};

type TenantResolution = {
  tenantId: "tenant-prn-staffers";
  locationId: string;
  businessDnaProfileId: "business-dna-prn-staffers";
  officeId: string;
};

type EeosReceipt = {
  accepted: boolean;
  eventType: string;
  route: string[];
  tenant: TenantResolution;
  correlationId: string;
  recommendationStatus: "Presented" | "Suppressed";
  decision: string;
  confidenceScore: number;
  businessReasoning: string[];
  supportingBusinessSignals: string[];
  expectedOutcome: string;
  potentialRisk: string;
  expectedBusinessImpact: string;
  qualityGate: RecommendationQualityGate;
  prediction: PredictionSummary;
  recommendationId: string;
  dashboardStatus: "Ready" | "Suppressed";
  timelineStatus: "Persisted";
  auditStatus: "Persisted";
  knowledgeGraphStatus: "Persisted";
  businessMemoryStatus: "Persisted";
  knowledgeGraphRelationships: KnowledgeGraphRelationship[];
};

type RecommendationQualityGate = {
  accurate: boolean;
  explainable: boolean;
  actionable: boolean;
  measurable: boolean;
  passed: boolean;
  missingRequirements: string[];
};

type PredictionSummary = {
  horizon: "Immediate" | "Short Term";
  expectedSignal: string;
  measurableMetric: string;
};

type EventContext = {
  eventId: string;
  entityId: string;
  entityType: "Contact" | "Opportunity" | "Appointment" | "Conversation";
  occurredAt?: string;
  lifecycleStage?: string;
  source?: string;
  pipelineId?: string;
  assignedUserId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  opportunityValue?: number;
};

type RecommendationInsight = {
  action: string;
  businessReasoning: string[];
  supportingBusinessSignals: string[];
  expectedOutcome: string;
  potentialRisk: string;
  expectedBusinessImpact: string;
  prediction: PredictionSummary;
};

type KnowledgeGraphRelationship = {
  from: string;
  to: string;
  relationship: string;
  evidence: string;
};

type GhlDiagnosticTarget =
  | "contacts"
  | "opportunities"
  | "calendars"
  | "conversations"
  | "customFields"
  | "pipelines"
  | "locations";

type GhlDiagnosticResult = {
  target: GhlDiagnosticTarget;
  status: "Passed" | "Failed" | "Skipped";
  path: string;
  httpStatus?: number;
  responseTimeMs?: number;
  reason?: string;
};

type GhlErrorCode =
  | "CONFIGURATION_ERROR"
  | "OAUTH_ERROR"
  | "TOKEN_VAULT_ERROR"
  | "WEBHOOK_SECURITY_ERROR"
  | "API_ERROR"
  | "RATE_LIMITED"
  | "DIAGNOSTIC_ERROR";

const approvedRoute = [
  "EEOS Gateway",
  "Tenant Resolver",
  "Business DNA",
  "Decision Engine",
  "Confidence Engine",
  "Executive Recommendation",
  "Executive Dashboard",
  "Timeline",
  "Audit",
  "Knowledge Graph",
];

const supportedWebhookEvents = [
  "Contact Created",
  "Contact Updated",
  "Opportunity Created",
  "Opportunity Updated",
  "Appointment Created",
  "Appointment Booked",
  "Calendar Event Created",
  "Conversation Created",
] as const;

const diagnosticTargets: GhlDiagnosticTarget[] = [
  "contacts",
  "opportunities",
  "calendars",
  "conversations",
  "customFields",
  "pipelines",
  "locations",
];

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const auditLog: Array<Record<string, unknown>> = [];
const retryQueue: Array<Record<string, unknown>> = [];
const businessMemory: Array<Record<string, unknown>> = [];
const knowledgeGraphRelationships: KnowledgeGraphRelationship[] = [];
let nextRequestAt = 0;

const prnBusinessDna = {
  industry: "Healthcare staffing",
  mission: "Place qualified healthcare staff quickly while protecting compliance and continuity of care.",
  executivePriorities: ["speed-to-lead", "qualified placement", "client retention", "schedule coverage", "compliance readiness"],
  kpis: ["lead response time", "opportunity conversion", "appointment show rate", "staffing coverage", "client follow-up latency"],
  riskTolerance: "Measured growth with low tolerance for compliance or service-quality drift.",
};

class GhlIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: GhlErrorCode,
    readonly statusCode = 500,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "GhlIntegrationError";
  }
}

export function registerGoHighLevelRoutes(app: Express) {
  app.get("/api/integrations/gohighlevel/oauth/start", (req, res) => {
    withRouteHandling(res, "oauth.start", async () => {
      const state = signOAuthState({
        tenantId: "tenant-prn-staffers",
        nonce: randomBytes(16).toString("hex"),
        issuedAt: new Date().toISOString(),
      });

      res.redirect(buildAuthorizationUrl(state, req));
    });
  });

  app.get("/api/integrations/gohighlevel/oauth/callback", (req, res) => {
    withRouteHandling(res, "oauth.callback", async () => {
      const code = readQuery(req, "code");
      const state = readQuery(req, "state");
      const runtimeUrls = getRuntimeUrls(req);

      if (!code || !state) {
        throw new GhlIntegrationError("Missing GoHighLevel OAuth code or state.", "OAUTH_ERROR", 400);
      }

      const statePayload = verifyOAuthState(state);
      const tokenSet = await exchangeAuthorizationCode(code, runtimeUrls.oauthCallbackUrl);
      const locationId = tokenSet.locationId || process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || "";

      if (!locationId) {
        throw new GhlIntegrationError("GoHighLevel OAuth callback did not include a location ID.", "OAUTH_ERROR", 400);
      }

      await writeTokenSet({ ...tokenSet, locationId });
      const registration = await registerWebhook({ ...tokenSet, locationId }, runtimeUrls.webhookUrl);

      logIntegration("info", "oauth.callback.connected", {
        tenantId: statePayload.tenantId,
        locationId,
        webhookStatus: registration.status,
      });

      res.json({
        connected: true,
        tenantId: statePayload.tenantId,
        locationId,
        productionUrl: runtimeUrls.productionUrl,
        oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
        webhookUrl: runtimeUrls.webhookUrl,
        credentialsStored: "Secure Token Vault",
        webhookStatus: registration.status,
        frontendExposure: "Blocked",
      });
    });
  });

  app.post("/api/integrations/gohighlevel/webhook/register", (req, res) => {
    withRouteHandling(res, "webhook.register", async () => {
      const tokenSet = await getValidTokenSet();
      const runtimeUrls = getRuntimeUrls(req);
      const registration = await registerWebhook(tokenSet, runtimeUrls.webhookUrl);

      res.json({
        ...registration,
        productionUrl: runtimeUrls.productionUrl,
        oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
      });
    });
  });

  app.post("/api/integrations/gohighlevel/webhook", async (req, res) => {
    const receivedAt = new Date().toISOString();

    try {
      validateWebhookSecurity(req);

      const payload = readPayload(req);
      const tenant = resolvePrnTenant(payload);
      const receipt = processGhlEvent(payload, tenant);
      const memory = writeBusinessMemoryRecord(payload, tenant, receipt, receivedAt);
      const audit = writeAuditRecord(payload, tenant, receipt, receivedAt);

      logIntegration("info", "webhook.accepted", {
        eventType: receipt.eventType,
        tenantId: tenant.tenantId,
        locationId: tenant.locationId,
        recommendationId: receipt.recommendationId,
        recommendationStatus: receipt.recommendationStatus,
        confidenceScore: receipt.confidenceScore,
        correlationId: receipt.correlationId,
      });

      res.status(202).json({
        accepted: receipt.accepted,
        tenant,
        route: receipt.route,
        eventType: receipt.eventType,
        recommendationId: receipt.recommendationId,
        confidenceScore: receipt.confidenceScore,
        businessReasoning: receipt.businessReasoning,
        supportingBusinessSignals: receipt.supportingBusinessSignals,
        expectedOutcome: receipt.expectedOutcome,
        potentialRisk: receipt.potentialRisk,
        expectedBusinessImpact: receipt.expectedBusinessImpact,
        recommendationStatus: receipt.recommendationStatus,
        qualityGate: receipt.qualityGate,
        prediction: receipt.prediction,
        decision: receipt.decision,
        correlationId: receipt.correlationId,
        dashboardStatus: receipt.dashboardStatus,
        timelineStatus: receipt.timelineStatus,
        auditStatus: receipt.auditStatus,
        knowledgeGraphStatus: receipt.knowledgeGraphStatus,
        businessMemoryStatus: receipt.businessMemoryStatus,
        knowledgeGraphRelationships: receipt.knowledgeGraphRelationships,
        businessMemory: memory,
        audit,
        retryQueueDepth: retryQueue.length,
      });
    } catch (error) {
      const normalized = normalizeError(error);
      const failedEvent = {
        retryId: `retry-${Date.now().toString(36)}`,
        status: "Queued",
        reason: normalized.message,
        code: normalized.code,
        receivedAt,
        nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      };
      retryQueue.push(failedEvent);

      logIntegration("warn", "webhook.rejected", failedEvent);
      res.status(normalized.statusCode).json({ accepted: false, retry: failedEvent });
    }
  });

  app.get("/api/integrations/gohighlevel/health", (req, res) => {
    withRouteHandling(res, "health", async () => {
      const health = await getGoHighLevelHealth(req);
      res.status(health.connectionStatus === "Connected" ? 200 : 207).json(health);
    });
  });

  app.get("/api/integrations/gohighlevel/runtime", (req, res) => {
    withRouteHandling(res, "runtime", async () => {
      res.json({
        integration: "GoHighLevel",
        tenantId: "tenant-prn-staffers",
        ...getRuntimeUrls(req),
        configured: getConfigurationStatus(),
      });
    });
  });

  app.get("/api/integrations/gohighlevel/diagnostics", (req, res) => {
    withRouteHandling(res, "diagnostics", async () => {
      const diagnostics = await runGoHighLevelDiagnostics(req);
      const failed = diagnostics.results.some((result) => result.status === "Failed");

      res.status(failed ? 207 : 200).json(diagnostics);
    });
  });
}

async function withRouteHandling(res: ExpressResponse, operation: string, handler: () => Promise<void>) {
  const startedAt = Date.now();

  try {
    await handler();
    logIntegration("info", `${operation}.complete`, { durationMs: Date.now() - startedAt });
  } catch (error) {
    const normalized = normalizeError(error);
    logIntegration("error", `${operation}.failed`, {
      code: normalized.code,
      statusCode: normalized.statusCode,
      message: normalized.message,
      durationMs: Date.now() - startedAt,
      details: normalized.details,
    });
    res.status(normalized.statusCode).json({
      ok: false,
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
    });
  }
}

function buildAuthorizationUrl(state: string, req: Request) {
  const clientId = requireEnv("GHL_OAUTH_CLIENT_ID");
  const redirectUri = process.env.GHL_OAUTH_REDIRECT_URI || getRuntimeUrls(req).oauthCallbackUrl;
  const scopes = readScopes().join(" ");
  const url = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);

  return url.toString();
}

async function exchangeAuthorizationCode(code: string, redirectUri: string): Promise<GhlTokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: requireEnv("GHL_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("GHL_OAUTH_CLIENT_SECRET"),
    redirect_uri: process.env.GHL_OAUTH_REDIRECT_URI || redirectUri,
    code,
  });

  const response = await fetchWithRetry(`${getGhlBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    operation: "oauth.token.exchange",
  });

  return normalizeTokenResponse(await response.json());
}

async function refreshTokenSet(tokenSet: GhlTokenSet): Promise<GhlTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: requireEnv("GHL_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("GHL_OAUTH_CLIENT_SECRET"),
    refresh_token: tokenSet.refreshToken,
  });

  const response = await fetchWithRetry(`${getGhlBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    operation: "oauth.token.refresh",
  });
  const refreshed = normalizeTokenResponse(await response.json());
  const next = { ...refreshed, locationId: refreshed.locationId || tokenSet.locationId };
  await writeTokenSet(next);

  logIntegration("info", "oauth.token.refreshed", { locationId: next.locationId, expiresAt: next.expiresAt });

  return next;
}

async function getValidTokenSet() {
  const tokenSet = await readTokenSet();

  if (new Date(tokenSet.expiresAt).getTime() <= Date.now() + 60_000) {
    return refreshTokenSet(tokenSet);
  }

  return tokenSet;
}

async function registerWebhook(tokenSet: GhlTokenSet, runtimeWebhookUrl?: string) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL || runtimeWebhookUrl;

  if (!webhookUrl) {
    throw new GhlIntegrationError(
      "GHL_WEBHOOK_URL or runtime webhook URL is required for PRN Staffers GoHighLevel live integration.",
      "CONFIGURATION_ERROR",
      500,
    );
  }

  const response = await ghlApiRequest(tokenSet, process.env.GHL_WEBHOOK_REGISTRATION_PATH || "/webhooks/", {
    method: "POST",
    operation: "webhook.register",
    body: {
      locationId: tokenSet.locationId,
      url: webhookUrl,
      events: supportedWebhookEvents,
    },
  });

  logIntegration("info", "webhook.registered", { locationId: tokenSet.locationId, webhookUrl });

  return {
    registered: true,
    status: "Registered",
    httpStatus: response.status,
    locationId: tokenSet.locationId,
    webhookUrl,
    events: supportedWebhookEvents,
  };
}

async function runGoHighLevelDiagnostics(req: Request) {
  const runtimeUrls = getRuntimeUrls(req);
  const tokenSet = await readOptionalTokenSet();

  if (!tokenSet) {
    return {
      integration: "GoHighLevel",
      tenantId: "tenant-prn-staffers",
      productionUrl: runtimeUrls.productionUrl,
      status: "Blocked",
      reason: "No token vault entry is available. Complete OAuth before running live diagnostics.",
      results: diagnosticTargets.map((target) => ({
        target,
        status: "Skipped" as const,
        path: buildDiagnosticPath(target, process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || "{locationId}"),
        reason: "Missing OAuth token vault.",
      })),
    };
  }

  const validTokenSet = await getValidTokenSet();
  const results = await Promise.all(diagnosticTargets.map((target) => runDiagnosticTarget(validTokenSet, target)));

  return {
    integration: "GoHighLevel",
    tenantId: "tenant-prn-staffers",
    productionUrl: runtimeUrls.productionUrl,
    connectedLocationId: validTokenSet.locationId,
    status: results.some((result) => result.status === "Failed") ? "Warning" : "Passed",
    results,
  };
}

async function runDiagnosticTarget(tokenSet: GhlTokenSet, target: GhlDiagnosticTarget): Promise<GhlDiagnosticResult> {
  const path = buildDiagnosticPath(target, tokenSet.locationId);
  const startedAt = Date.now();

  try {
    const response = await ghlApiRequest(tokenSet, path, {
      method: "GET",
      operation: `diagnostics.${target}`,
    });

    return {
      target,
      status: "Passed",
      path,
      httpStatus: response.status,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    const normalized = normalizeError(error);

    return {
      target,
      status: "Failed",
      path,
      httpStatus: normalized.statusCode,
      responseTimeMs: Date.now() - startedAt,
      reason: normalized.message,
    };
  }
}

function buildDiagnosticPath(target: GhlDiagnosticTarget, locationId: string) {
  const paths: Record<GhlDiagnosticTarget, string> = {
    contacts: process.env.GHL_CONTACTS_PATH || `/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`,
    opportunities: process.env.GHL_OPPORTUNITIES_PATH || `/opportunities/search?location_id=${encodeURIComponent(locationId)}&limit=1`,
    calendars: process.env.GHL_CALENDARS_PATH || `/calendars/events?locationId=${encodeURIComponent(locationId)}&limit=1`,
    conversations: process.env.GHL_CONVERSATIONS_PATH || `/conversations/search?locationId=${encodeURIComponent(locationId)}&limit=1`,
    customFields: process.env.GHL_CUSTOM_FIELDS_PATH || `/locations/${encodeURIComponent(locationId)}/customFields`,
    pipelines: process.env.GHL_PIPELINES_PATH || `/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`,
    locations: process.env.GHL_LOCATIONS_PATH || `/locations/${encodeURIComponent(locationId)}`,
  };

  return paths[target];
}

async function ghlApiRequest(
  tokenSet: GhlTokenSet,
  requestPath: string,
  options: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; operation: string; body?: unknown },
) {
  const url = requestPath.startsWith("http") ? requestPath : `${getGhlBaseUrl()}${requestPath}`;

  return fetchWithRetry(url, {
    method: options.method,
    operation: options.operation,
    headers: {
      authorization: `Bearer ${tokenSet.accessToken}`,
      "content-type": "application/json",
      version: process.env.GHL_API_VERSION || "2021-07-28",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit & { operation: string },
  maxAttempts = readNumberEnv("GHL_RETRY_MAX_ATTEMPTS", 3),
): Promise<globalThis.Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await waitForRateLimitWindow();
    const startedAt = Date.now();

    try {
      const response = await fetch(url, options);
      const responseTimeMs = Date.now() - startedAt;

      logIntegration(response.ok ? "info" : "warn", "ghl.request", {
        operation: options.operation,
        attempt,
        status: response.status,
        responseTimeMs,
      });

      if (response.ok) {
        return response;
      }

      if (!retryableStatuses.has(response.status) || attempt === maxAttempts) {
        throw new GhlIntegrationError(
          `GoHighLevel ${options.operation} failed with status ${response.status}.`,
          response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
          response.status,
        );
      }

      await sleep(readRetryDelayMs(response, attempt));
    } catch (error) {
      lastError = error;

      if (error instanceof GhlIntegrationError && (!retryableStatuses.has(error.statusCode) || attempt === maxAttempts)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        throw normalizeError(error);
      }

      await sleep(readRetryDelayMs(undefined, attempt));
    }
  }

  throw normalizeError(lastError);
}

async function waitForRateLimitWindow() {
  const minimumSpacingMs = readNumberEnv("GHL_RATE_LIMIT_MIN_INTERVAL_MS", 150);
  const now = Date.now();
  const waitMs = Math.max(0, nextRequestAt - now);

  nextRequestAt = Math.max(now, nextRequestAt) + minimumSpacingMs;

  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function readRetryDelayMs(response: globalThis.Response | undefined, attempt: number) {
  const retryAfter = response?.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const retryDate = new Date(retryAfter).getTime();

    if (Number.isFinite(retryDate)) {
      return Math.max(0, retryDate - Date.now());
    }
  }

  return readNumberEnv("GHL_RETRY_BASE_DELAY_MS", 250) * 2 ** (attempt - 1);
}

function resolvePrnTenant(payload: Record<string, unknown>): TenantResolution {
  const locationId =
    readString(payload.locationId) ||
    readString(payload.location_id) ||
    readString(readRecord(payload.location)?.id) ||
    process.env.GHL_PRN_LOCATION_ID ||
    process.env.GHL_LOCATION_ID ||
    "";

  return {
    tenantId: "tenant-prn-staffers",
    locationId,
    businessDnaProfileId: "business-dna-prn-staffers",
    officeId: process.env.EEOS_PRN_DEFAULT_OFFICE_ID || "office-charleston",
  };
}

function processGhlEvent(payload: Record<string, unknown>, tenant: TenantResolution): EeosReceipt {
  const eventType = normalizeEventType(readString(payload.eventType) || readString(payload.type));
  const context = buildEventContext(payload, tenant, eventType);
  const correlationId = buildCorrelationId(tenant, context, eventType);
  const recommendationId = `rec-${correlationId}`;
  const insight = buildRecommendationInsight(eventType, tenant, context);
  const qualityGate = evaluateRecommendationQuality(eventType, tenant, context, insight);
  const presented = qualityGate.passed;
  const relationships = buildKnowledgeGraphRelationships(tenant, context, recommendationId, eventType, insight);

  return {
    accepted: true,
    eventType,
    route: approvedRoute,
    tenant,
    correlationId,
    recommendationStatus: presented ? "Presented" : "Suppressed",
    decision: presented
      ? insight.action
      : `Recommendation suppressed because it is missing: ${qualityGate.missingRequirements.join(", ")}.`,
    confidenceScore: confidenceFor(eventType, payload, tenant),
    businessReasoning: insight.businessReasoning,
    supportingBusinessSignals: insight.supportingBusinessSignals,
    expectedOutcome: insight.expectedOutcome,
    potentialRisk: insight.potentialRisk,
    expectedBusinessImpact: insight.expectedBusinessImpact,
    qualityGate,
    prediction: insight.prediction,
    recommendationId,
    dashboardStatus: presented ? "Ready" : "Suppressed",
    timelineStatus: "Persisted",
    auditStatus: "Persisted",
    knowledgeGraphStatus: "Persisted",
    businessMemoryStatus: "Persisted",
    knowledgeGraphRelationships: relationships,
  };
}

function writeAuditRecord(payload: Record<string, unknown>, tenant: TenantResolution, receipt: EeosReceipt, receivedAt: string) {
  const audit = {
    auditId: `aud-${receipt.correlationId}`,
    source: "GoHighLevel",
    tenantId: tenant.tenantId,
    locationId: tenant.locationId,
    eventType: receipt.eventType,
    receivedAt,
    correlationId: receipt.correlationId,
    route: receipt.route,
    recommendationId: receipt.recommendationId,
    recommendationStatus: receipt.recommendationStatus,
    confidenceScore: receipt.confidenceScore,
    qualityGate: receipt.qualityGate,
    supportingBusinessSignals: receipt.supportingBusinessSignals,
    expectedBusinessImpact: receipt.expectedBusinessImpact,
    payloadFingerprint: fingerprintPayload(payload),
    persistedTo: ["Timeline", "Audit", "Knowledge Graph", "Business Memory"],
  };

  auditLog.push(audit);

  return audit;
}

function writeBusinessMemoryRecord(payload: Record<string, unknown>, tenant: TenantResolution, receipt: EeosReceipt, receivedAt: string) {
  const memory = {
    memoryId: `mem-${receipt.correlationId}`,
    tenantId: tenant.tenantId,
    businessDnaProfileId: tenant.businessDnaProfileId,
    eventType: receipt.eventType,
    receivedAt,
    correlationId: receipt.correlationId,
    confidenceScore: receipt.confidenceScore,
    recommendationStatus: receipt.recommendationStatus,
    businessReasoning: receipt.businessReasoning,
    supportingBusinessSignals: receipt.supportingBusinessSignals,
    expectedOutcome: receipt.expectedOutcome,
    expectedBusinessImpact: receipt.expectedBusinessImpact,
    payloadFingerprint: fingerprintPayload(payload),
  };

  businessMemory.push(memory);
  knowledgeGraphRelationships.push(...receipt.knowledgeGraphRelationships);

  return memory;
}

function normalizeEventType(value = "Contact Created") {
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, " ");
  const map: Record<string, string> = {
    "new contact": "Contact Created",
    "contact create": "Contact Created",
    "contact created": "Contact Created",
    "contact updated": "Contact Updated",
    "opportunity create": "Opportunity Created",
    "opportunity created": "Opportunity Created",
    "opportunity update": "Opportunity Updated",
    "opportunity updated": "Opportunity Updated",
    "appointment create": "Appointment Created",
    "appointment created": "Appointment Created",
    "appointment booked": "Appointment Booked",
    "calendar event created": "Calendar Event Created",
    "conversation created": "Conversation Created",
  };

  return map[normalized] || "Contact Created";
}

function buildEventContext(payload: Record<string, unknown>, tenant: TenantResolution, eventType: string): EventContext {
  const contact = readRecord(payload.contact);
  const opportunity = readRecord(payload.opportunity);
  const calendar = readRecord(payload.calendar);
  const appointment = readRecord(payload.appointment);
  const conversation = readRecord(payload.conversation);
  const nested = eventType.includes("Opportunity")
    ? opportunity
    : eventType.includes("Appointment") || eventType.includes("Calendar")
      ? appointment
      : eventType.includes("Conversation")
        ? conversation
        : contact;

  return {
    eventId: readString(payload.id) || readString(payload.eventId) || stableHash(JSON.stringify(payload)).slice(0, 12),
    entityId:
      readString(payload.contactId) ||
      readString(payload.opportunityId) ||
      readString(payload.appointmentId) ||
      readString(payload.calendarEventId) ||
      readString(payload.conversationId) ||
      readString(nested.id) ||
      readString(payload.id) ||
      "",
    entityType: eventType.includes("Opportunity")
      ? "Opportunity"
      : eventType.includes("Appointment") || eventType.includes("Calendar")
        ? "Appointment"
        : eventType.includes("Conversation")
          ? "Conversation"
          : "Contact",
    occurredAt:
      readString(payload.occurredAt) ||
      readString(payload.dateAdded) ||
      readString(payload.dateUpdated) ||
      readString(payload.createdAt) ||
      readString(nested.createdAt),
    lifecycleStage:
      readString(payload.stage) ||
      readString(payload.status) ||
      readString(payload.pipelineStageId) ||
      readString(opportunity.stage) ||
      readString(opportunity.status),
    source: readString(payload.source) || readString(payload.channel) || readString(contact.source) || readString(conversation.channel),
    pipelineId: readString(payload.pipelineId) || readString(opportunity.pipelineId),
    assignedUserId: readString(payload.assignedTo) || readString(payload.assignedUserId) || readString(nested.assignedUserId),
    contactName:
      readString(payload.contactName) ||
      readString(contact.name) ||
      [readString(contact.firstName), readString(contact.lastName)].filter(Boolean).join(" "),
    contactEmail: readString(payload.email) || readString(contact.email),
    contactPhone: readString(payload.phone) || readString(contact.phone),
    opportunityValue: readNumber(payload.monetaryValue) || readNumber(opportunity.monetaryValue) || readNumber(opportunity.value),
  };
}

function buildRecommendationInsight(eventType: string, tenant: TenantResolution, context: EventContext): RecommendationInsight {
  const supportingBusinessSignals = buildSupportingBusinessSignals(eventType, tenant, context);
  const reasonPrefix = `${prnBusinessDna.industry} depends on ${prnBusinessDna.executivePriorities.slice(0, 3).join(", ")}.`;

  if (eventType.includes("Opportunity")) {
    return {
      action: "Review pipeline impact, assign ownership, and confirm the next client follow-up step before the opportunity ages.",
      businessReasoning: [
        reasonPrefix,
        "Opportunity movement changes near-term staffing demand and revenue visibility for PRN Staffers.",
        "Business DNA prioritizes qualified placement and client retention, so unattended pipeline changes carry operational risk.",
      ],
      supportingBusinessSignals,
      expectedOutcome: "Improve opportunity conversion discipline and keep follow-up latency inside the active pipeline KPI window.",
      potentialRisk: "If the opportunity is not reviewed, staffing demand may drift without ownership or a measurable next action.",
      expectedBusinessImpact: "Protects conversion rate, revenue forecast quality, and staffing coverage planning.",
      prediction: {
        horizon: "Short Term",
        expectedSignal: "Pipeline stage stability and owner follow-up should improve on the next opportunity touch.",
        measurableMetric: "Opportunity conversion and client follow-up latency",
      },
    };
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    return {
      action: "Confirm appointment coverage, owner readiness, and the next-best follow-up before the scheduled interaction.",
      businessReasoning: [
        reasonPrefix,
        "Appointments are operational commitments that affect schedule coverage and client experience.",
        "Business DNA has low tolerance for service-quality drift, making missed or underprepared meetings a measurable risk.",
      ],
      supportingBusinessSignals,
      expectedOutcome: "Increase appointment show readiness and reduce scheduling friction before it reaches the client.",
      potentialRisk: "If coverage is not confirmed, PRN Staffers may lose response speed or create scheduling rework.",
      expectedBusinessImpact: "Improves appointment show rate, staffing coverage confidence, and client follow-up latency.",
      prediction: {
        horizon: "Immediate",
        expectedSignal: "Appointment readiness should become visible through owner confirmation or calendar completion.",
        measurableMetric: "Appointment show rate and staffing coverage",
      },
    };
  }

  if (eventType.includes("Conversation")) {
    return {
      action: "Classify conversation intent, assign the owner, and respond within the lead response target.",
      businessReasoning: [
        reasonPrefix,
        "Conversation activity is a direct signal of buyer or clinician intent.",
        "Business DNA prioritizes speed-to-lead, so response latency should be managed before demand cools.",
      ],
      supportingBusinessSignals,
      expectedOutcome: "Shorten response latency and preserve conversion intent while the conversation is active.",
      potentialRisk: "If no owner responds, the lead or client may disengage before PRN Staffers can qualify the need.",
      expectedBusinessImpact: "Improves lead response time, conversion opportunity, and client retention signals.",
      prediction: {
        horizon: "Immediate",
        expectedSignal: "A timely owner response should produce a qualified next step or disposition.",
        measurableMetric: "Lead response time and client follow-up latency",
      },
    };
  }

  return {
    action: "Qualify the contact, assign the owner, and set a measurable next step within the speed-to-lead window.",
    businessReasoning: [
      reasonPrefix,
      "New or updated contacts are intake signals for staffing demand, clinician supply, or client relationship health.",
      "Business DNA prioritizes speed-to-lead and qualified placement, so contact records need owner accountability.",
    ],
    supportingBusinessSignals,
    expectedOutcome: "Move the contact from raw intake to qualified next action with measurable owner accountability.",
    potentialRisk: "If qualification is delayed, PRN Staffers may lose conversion momentum or miss a staffing coverage signal.",
    expectedBusinessImpact: "Improves lead response time, qualification quality, and downstream opportunity conversion.",
    prediction: {
      horizon: "Immediate",
      expectedSignal: "Contact should receive owner assignment, qualification status, or a booked next step.",
      measurableMetric: "Lead response time and opportunity conversion",
    },
  };
}

function buildSupportingBusinessSignals(eventType: string, tenant: TenantResolution, context: EventContext) {
  const signals = [
    `Event type: ${eventType}`,
    `Tenant: ${tenant.tenantId}`,
    `Business DNA profile: ${tenant.businessDnaProfileId}`,
    `Business priority: ${prnBusinessDna.executivePriorities[0]}`,
    `Primary KPI: ${prnBusinessDna.kpis[0]}`,
  ];

  if (tenant.locationId) signals.push(`Location ID: ${tenant.locationId}`);
  if (context.entityId) signals.push(`${context.entityType} ID: ${context.entityId}`);
  if (context.lifecycleStage) signals.push(`Lifecycle stage/status: ${context.lifecycleStage}`);
  if (context.source) signals.push(`Source/channel: ${context.source}`);
  if (context.pipelineId) signals.push(`Pipeline ID: ${context.pipelineId}`);
  if (context.assignedUserId) signals.push(`Assigned owner: ${context.assignedUserId}`);
  if (context.contactName) signals.push(`Contact name: ${context.contactName}`);
  if (context.contactEmail || context.contactPhone) signals.push("Contactability: email or phone present");
  if (context.opportunityValue !== undefined) signals.push(`Opportunity value: ${context.opportunityValue}`);
  if (context.occurredAt) signals.push(`Event timestamp: ${context.occurredAt}`);

  return signals;
}

function evaluateRecommendationQuality(
  eventType: string,
  tenant: TenantResolution,
  context: EventContext,
  insight: RecommendationInsight,
): RecommendationQualityGate {
  const accurate = supportedWebhookEvents.includes(eventType as (typeof supportedWebhookEvents)[number]) && Boolean(tenant.locationId && context.entityId);
  const explainable = insight.businessReasoning.length >= 2 && insight.supportingBusinessSignals.length >= 5;
  const actionable = insight.action.length > 0 && !insight.action.toLowerCase().includes("review only");
  const measurable = Boolean(insight.expectedOutcome && insight.expectedBusinessImpact && insight.prediction.measurableMetric);
  const checks = { accurate, explainable, actionable, measurable };
  const missingRequirements = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([requirement]) => requirement);

  return {
    ...checks,
    passed: missingRequirements.length === 0,
    missingRequirements,
  };
}

function buildKnowledgeGraphRelationships(
  tenant: TenantResolution,
  context: EventContext,
  recommendationId: string,
  eventType: string,
  insight: RecommendationInsight,
) {
  return [
    {
      from: tenant.tenantId,
      to: tenant.businessDnaProfileId,
      relationship: "uses_business_dna",
      evidence: prnBusinessDna.mission,
    },
    {
      from: tenant.tenantId,
      to: tenant.locationId || "unknown-location",
      relationship: "owns_location",
      evidence: "Tenant resolver mapped the GoHighLevel event to PRN Staffers.",
    },
    {
      from: context.entityId || "unknown-entity",
      to: eventType,
      relationship: "produced_event",
      evidence: `Event correlation ID ${buildCorrelationId(tenant, context, eventType)}.`,
    },
    {
      from: recommendationId,
      to: context.entityId || "unknown-entity",
      relationship: "recommends_action_for",
      evidence: insight.expectedBusinessImpact,
    },
    {
      from: recommendationId,
      to: insight.prediction.measurableMetric,
      relationship: "measured_by",
      evidence: insight.expectedOutcome,
    },
  ];
}

function buildCorrelationId(tenant: TenantResolution, context: EventContext, eventType: string) {
  return stableHash([tenant.tenantId, tenant.locationId, eventType, context.entityType, context.entityId || context.eventId].join("|")).slice(0, 16);
}

function decisionFor(eventType: string) {
  if (eventType.includes("Opportunity")) {
    return "Review pipeline impact and assign executive follow-up.";
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    return "Confirm schedule coverage and prepare next-best action.";
  }

  if (eventType.includes("Conversation")) {
    return "Review conversation intent and assign timely follow-up.";
  }

  return "Qualify the new contact and route follow-up through the executive recommendation pipeline.";
}

function confidenceFor(eventType: string, payload: Record<string, unknown> = {}, tenant?: TenantResolution) {
  const context = tenant ? buildEventContext(payload, tenant, eventType) : undefined;
  let score = eventType.includes("Contact") ? 84 : eventType.includes("Opportunity") ? 82 : eventType.includes("Conversation") ? 80 : 78;

  if (!context || !tenant) {
    return score;
  }

  if (tenant.locationId) score += 3;
  if (context.entityId) score += 4;
  if (context.occurredAt) score += 2;
  if (context.lifecycleStage) score += 2;
  if (context.source) score += 2;
  if (context.assignedUserId) score += 2;
  if (context.contactEmail || context.contactPhone) score += 3;
  if (context.pipelineId) score += 2;
  if (context.opportunityValue !== undefined) score += 2;
  if (!context.entityId || !tenant.locationId) score -= 12;

  return Math.max(45, Math.min(96, score));
}

function validateWebhookSecurity(req: Request) {
  const expected = process.env.GHL_WEBHOOK_SECRET;

  if (!expected) {
    throw new GhlIntegrationError("GHL_WEBHOOK_SECRET is required before accepting production webhooks.", "WEBHOOK_SECURITY_ERROR", 500);
  }

  const sharedSecret = req.header("x-eeos-webhook-secret");
  const ghlSignature = req.header("x-ghl-signature") || req.header("x-highlevel-signature");

  if (sharedSecret && secureCompare(sharedSecret, expected)) {
    return;
  }

  if (ghlSignature && verifyHmacSignature(readRawBody(req), ghlSignature, expected)) {
    return;
  }

  throw new GhlIntegrationError("GoHighLevel webhook authentication failed.", "WEBHOOK_SECURITY_ERROR", 401);
}

function verifyHmacSignature(rawBody: Buffer, signatureHeader: string, secret: string) {
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

  return secureCompare(provided, digest);
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signOAuthState(payload: Record<string, string>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", requireEnv("GHL_OAUTH_STATE_SECRET")).update(encoded).digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyOAuthState(state: string) {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    throw new GhlIntegrationError("GoHighLevel OAuth state is malformed.", "OAUTH_ERROR", 400);
  }

  const expected = createHmac("sha256", requireEnv("GHL_OAUTH_STATE_SECRET")).update(encoded).digest("base64url");

  if (!secureCompare(signature, expected)) {
    throw new GhlIntegrationError("GoHighLevel OAuth state validation failed.", "OAUTH_ERROR", 400);
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { tenantId: string };
}

async function writeTokenSet(tokenSet: GhlTokenSet) {
  try {
    const vaultFile = getVaultFile();
    await fs.mkdir(path.dirname(vaultFile), { recursive: true });
    await fs.writeFile(vaultFile, encryptJson(tokenSet), "utf8");
  } catch (error) {
    throw new GhlIntegrationError("Unable to write GoHighLevel token vault.", "TOKEN_VAULT_ERROR", 500, {
      cause: readError(error),
    });
  }
}

async function readTokenSet(): Promise<GhlTokenSet> {
  try {
    const vaultFile = getVaultFile();
    const encrypted = await fs.readFile(vaultFile, "utf8");

    return decryptJson(encrypted) as GhlTokenSet;
  } catch (error) {
    throw new GhlIntegrationError("GoHighLevel token vault is unavailable.", "TOKEN_VAULT_ERROR", 503, {
      cause: readError(error),
    });
  }
}

async function readTokenStatus() {
  try {
    const tokenSet = await readTokenSet();

    return new Date(tokenSet.expiresAt).getTime() > Date.now() ? "Ready" : "Refresh Required";
  } catch {
    return "Missing";
  }
}

async function readOptionalTokenSet(): Promise<GhlTokenSet | null> {
  try {
    return await readTokenSet();
  } catch {
    return null;
  }
}

async function getGoHighLevelHealth(req: Request) {
  const tokenStatus = await readTokenStatus();
  const tokenSet = await readOptionalTokenSet();
  const runtimeUrls = getRuntimeUrls(req);
  const locationConfigured = Boolean(process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || tokenSet?.locationId);
  const connectedLocationId = tokenSet?.locationId || process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || null;
  const configuration = getConfigurationStatus();

  return {
    integration: "GoHighLevel",
    tenantId: "tenant-prn-staffers",
    connectionStatus: tokenStatus === "Ready" && locationConfigured ? "Connected" : "Waiting",
    authenticationStatus: tokenStatus,
    productionUrl: runtimeUrls.productionUrl,
    oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
    webhookUrl: runtimeUrls.webhookUrl,
    connectedLocationId,
    webhookStatus: configuration.webhookSecret ? "Configured" : "Missing Secret",
    apiStatus: getGhlBaseUrl(),
    diagnosticsUrl: `${runtimeUrls.productionUrl}/api/integrations/gohighlevel/diagnostics`,
    locationIdDetection: locationConfigured ? "Configured" : "Waiting",
    failedEvents: retryQueue.length,
    retryQueueDepth: retryQueue.length,
    auditRecords: auditLog.length,
    businessMemoryRecords: businessMemory.length,
    knowledgeGraphRelationships: knowledgeGraphRelationships.length,
    lastAuditAt: auditLog.at(-1)?.receivedAt ?? null,
    configuration,
    liveEventVerification: {
      contactCreated: hasAuditEvent("Contact Created"),
      contactUpdated: hasAuditEvent("Contact Updated"),
      opportunityCreated: hasAuditEvent("Opportunity Created"),
      opportunityUpdated: hasAuditEvent("Opportunity Updated"),
      appointmentCreated: hasAuditEvent("Appointment Created") || hasAuditEvent("Appointment Booked"),
    },
  };
}

function hasAuditEvent(eventType: string) {
  return auditLog.some((event) => event.eventType === eventType);
}

function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    value: encrypted.toString("base64url"),
  });
}

function decryptJson(value: string) {
  const parsed = JSON.parse(value) as { iv: string; tag: string; value: string };
  const decipher = createDecipheriv("aes-256-gcm", getVaultKey(), Buffer.from(parsed.iv, "base64url"));

  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));

  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parsed.value, "base64url")), decipher.final()]).toString("utf8"));
}

function normalizeTokenResponse(value: unknown): GhlTokenSet {
  const record = readRecord(value);
  const accessToken = readString(record.access_token) || readString(record.accessToken);
  const refreshToken = readString(record.refresh_token) || readString(record.refreshToken);

  if (!accessToken || !refreshToken) {
    throw new GhlIntegrationError("GoHighLevel OAuth response did not include access and refresh tokens.", "OAUTH_ERROR", 502);
  }

  return {
    accessToken,
    refreshToken,
    tokenType: readString(record.token_type) || "Bearer",
    expiresAt: new Date(Date.now() + Number(record.expires_in || 3600) * 1000).toISOString(),
    scopes: readString(record.scope)?.split(/[,\s]+/).filter(Boolean) || readScopes(),
    locationId: readString(record.locationId) || readString(record.location_id) || "",
    companyId: readString(record.companyId) || readString(record.company_id),
  };
}

function getVaultKey() {
  return createHash("sha256").update(requireEnv("EEOS_TOKEN_VAULT_KEY")).digest();
}

function getVaultFile() {
  return process.env.GHL_TOKEN_VAULT_FILE || path.join(os.tmpdir(), "eeos-ghl-prn-token-vault.json");
}

function getGhlBaseUrl() {
  return process.env.GHL_BASE_URL || "https://services.leadconnectorhq.com";
}

function getRuntimeUrls(req: Request) {
  const productionUrl = getProductionUrl(req);

  return {
    productionUrl,
    oauthCallbackUrl: `${productionUrl}/api/integrations/gohighlevel/oauth/callback`,
    webhookUrl: process.env.GHL_WEBHOOK_URL || `${productionUrl}/api/integrations/gohighlevel/webhook`,
  };
}

function getProductionUrl(req: Request) {
  const configuredUrl = process.env.EEOS_APP_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  const forwardedHost = req.header("x-forwarded-host");
  const forwardedProto = req.header("x-forwarded-proto");
  const host = forwardedHost || req.header("host") || "localhost:3000";
  const protocol = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`.replace(/\/$/, "");
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getConfigurationStatus() {
  return {
    oauthClientId: Boolean(process.env.GHL_OAUTH_CLIENT_ID),
    oauthClientSecret: Boolean(process.env.GHL_OAUTH_CLIENT_SECRET),
    oauthStateSecret: Boolean(process.env.GHL_OAUTH_STATE_SECRET),
    tokenVaultKey: Boolean(process.env.EEOS_TOKEN_VAULT_KEY),
    webhookSecret: Boolean(process.env.GHL_WEBHOOK_SECRET),
    locationId: Boolean(process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID),
  };
}

function readScopes() {
  return (process.env.GHL_OAUTH_SCOPES || "contacts.readonly opportunities.readonly calendars/events.readonly conversations.readonly locations.readonly")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function readPayload(req: Request) {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
}

function readRawBody(req: Request) {
  return (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(readPayload(req)));
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function readQuery(req: Request, key: string) {
  const value = req.query[key];

  return typeof value === "string" ? value : undefined;
}

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new GhlIntegrationError(`${key} is required for PRN Staffers GoHighLevel live integration.`, "CONFIGURATION_ERROR", 500, {
      env: key,
    });
  }

  return value;
}

function readNumberEnv(key: string, fallback: number) {
  const value = process.env[key];
  const parsed = value ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeError(error: unknown) {
  if (error instanceof GhlIntegrationError) {
    return error;
  }

  return new GhlIntegrationError(readError(error), "API_ERROR", 500);
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown GoHighLevel integration error.";
}

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprintPayload(payload: Record<string, unknown>) {
  return stableHash(JSON.stringify(payload)).slice(0, 24);
}

function logIntegration(level: "info" | "warn" | "error", event: string, metadata: Record<string, unknown>) {
  const log = {
    level,
    event,
    integration: "GoHighLevel",
    tenantId: "tenant-prn-staffers",
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  const line = JSON.stringify(log);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const goHighLevelInternals = {
  buildDiagnosticPath,
  buildEventContext,
  buildRecommendationInsight,
  confidenceFor,
  decisionFor,
  evaluateRecommendationQuality,
  normalizeBaseUrl,
  normalizeEventType,
  processGhlEvent,
  secureCompare,
  verifyHmacSignature,
};
