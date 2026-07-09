import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Express, Request, Response as ExpressResponse } from "express";

type GhlTokenSet = {
  authMode: "oauth" | "private_token";
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: string;
  scopes: string[];
  locationId: string;
  membershipId: string;
  operationalDivisionId: string;
  companyId?: string;
};

type TenantResolution = {
  tenantId: string;
  membershipId: string;
  membershipName: string;
  operationalDivisionId: string;
  operationalDivisionName: string;
  locationId: string;
  businessDnaProfileId: string;
  officeId: string;
  businessDna: BusinessDnaProfile;
};

type CustomerMembershipConfig = {
  membershipId: string;
  membershipName: string;
  businessDnaProfileId: string;
  defaultOfficeId: string;
  businessDna: BusinessDnaProfile;
  operationalDivisions: OperationalDivisionConfig[];
};

type OperationalDivisionConfig = {
  id: string;
  name: string;
  locationId: string;
  privateIntegrationToken?: string;
};

type BusinessDnaProfile = {
  industry: string;
  mission: string;
  executivePriorities: string[];
  kpis: string[];
  revenueDrivers: string[];
  costCenters: string[];
  complianceRequirements: string[];
  riskTolerance: string;
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
  whyThisMatters: string;
  businessReasoning: string[];
  supportingBusinessSignals: string[];
  expectedOutcome: string;
  potentialRisk: string;
  riskLevel: RiskLevel;
  expectedBusinessImpact: string;
  recommendedNextAction: string;
  measurementPlan: MeasurementPlan;
  estimatedConfidenceImprovementAfterAction: number;
  businessSignalCorrelation: string[];
  executivePriority: ExecutivePriority;
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

type RiskLevel = {
  level: "Critical" | "High" | "Medium" | "Low";
  reason: string;
};

type MeasurementPlan = {
  primaryMetric: string;
  targetMovement: string;
  verificationWindow: "Same Day" | "24 Hours" | "7 Days";
  successSignal: string;
};

type PredictionSummary = {
  horizon: "Immediate" | "Short Term";
  expectedSignal: string;
  measurableMetric: string;
  expectedMetricMovement: string;
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
  tags: string[];
};

type RecommendationInsight = {
  action: string;
  whyThisMatters: string;
  businessReasoning: string[];
  supportingBusinessSignals: string[];
  expectedOutcome: string;
  potentialRisk: string;
  riskLevel: RiskLevel;
  expectedBusinessImpact: string;
  recommendedNextAction: string;
  measurementPlan: MeasurementPlan;
  estimatedConfidenceImprovementAfterAction: number;
  businessSignalCorrelation: string[];
  executivePriority: ExecutivePriority;
  prediction: PredictionSummary;
};

type ExecutivePriority = {
  level: "Critical" | "High" | "Medium";
  score: number;
  reason: string;
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
  | "tags"
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
  "tags",
  "locations",
];

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const auditLog: Array<Record<string, unknown>> = [];
const retryQueue: Array<Record<string, unknown>> = [];
const businessMemory: Array<Record<string, unknown>> = [];
const knowledgeGraphRelationships: KnowledgeGraphRelationship[] = [];
let nextRequestAt = 0;

const defaultServiceBusinessDna: BusinessDnaProfile = {
  industry: "Healthcare staffing",
  mission: "Place qualified healthcare staff quickly while protecting compliance and continuity of care.",
  executivePriorities: ["speed-to-lead", "qualified placement", "client retention", "schedule coverage", "compliance readiness"],
  kpis: ["lead response time", "opportunity conversion", "appointment show rate", "staffing coverage", "client follow-up latency"],
  revenueDrivers: ["qualified leads", "client opportunities", "filled shifts", "repeat facility demand"],
  costCenters: ["recruiter time", "scheduling rework", "unfilled shift exposure"],
  complianceRequirements: ["credential readiness", "care continuity", "accurate client communication"],
  riskTolerance: "Measured growth with low tolerance for compliance or service-quality drift.",
};

const missionZeroDivisionDefaults = [
  { id: "delaware", name: "Delaware", locationEnv: "GHL_PRN_DELAWARE_LOCATION_ID", tokenEnv: "GHL_PRN_DELAWARE_PRIVATE_TOKEN" },
  { id: "south-carolina", name: "South Carolina", locationEnv: "GHL_PRN_SOUTH_CAROLINA_LOCATION_ID", tokenEnv: "GHL_PRN_SOUTH_CAROLINA_PRIVATE_TOKEN" },
  { id: "alabama", name: "Alabama", locationEnv: "GHL_PRN_ALABAMA_LOCATION_ID", tokenEnv: "GHL_PRN_ALABAMA_PRIVATE_TOKEN" },
  { id: "florida", name: "Florida", locationEnv: "GHL_PRN_FLORIDA_LOCATION_ID", tokenEnv: "GHL_PRN_FLORIDA_PRIVATE_TOKEN" },
] as const;

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
      const membership = getCustomerMembershipConfig();
      const state = signOAuthState({
        tenantId: membership.membershipId,
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
      const membership = getCustomerMembershipConfig();
      const fallbackDivision = membership.operationalDivisions[0];
      const locationId = tokenSet.locationId || fallbackDivision?.locationId || process.env.GHL_LOCATION_ID || "";

      if (!locationId) {
        throw new GhlIntegrationError("GoHighLevel OAuth callback did not include a location ID.", "OAUTH_ERROR", 400);
      }

      const division = findDivisionByLocationId(locationId, membership) || fallbackDivision;
      const connectedTokenSet = {
        ...tokenSet,
        locationId,
        membershipId: membership.membershipId,
        operationalDivisionId: division?.id || "default",
      };
      await writeTokenSet(connectedTokenSet);
      const registration = await registerWebhook(connectedTokenSet, runtimeUrls.webhookUrl);

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
      const tokenSet = await getPrimaryTokenSet();
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
      const tenant = resolveTenant(payload);
      const receipt = processGhlEvent(payload, tenant);
      const memory = writeBusinessMemoryRecord(payload, tenant, receipt, receivedAt);
      const audit = writeAuditRecord(payload, tenant, receipt, receivedAt);

      logIntegration("info", "webhook.accepted", {
        eventType: receipt.eventType,
        membershipId: tenant.membershipId,
        operationalDivisionId: tenant.operationalDivisionId,
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
        whyThisMatters: receipt.whyThisMatters,
        businessReasoning: receipt.businessReasoning,
        supportingBusinessSignals: receipt.supportingBusinessSignals,
        expectedBusinessImpact: receipt.expectedBusinessImpact,
        riskLevel: receipt.riskLevel,
        potentialRisk: receipt.potentialRisk,
        recommendedNextAction: receipt.recommendedNextAction,
        measurementPlan: receipt.measurementPlan,
        estimatedConfidenceImprovementAfterAction: receipt.estimatedConfidenceImprovementAfterAction,
        businessSignalCorrelation: receipt.businessSignalCorrelation,
        executivePriority: receipt.executivePriority,
        expectedOutcome: receipt.expectedOutcome,
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
        membership: describeMembershipForRuntime(),
        ...getRuntimeUrls(req),
        configured: getConfigurationStatus(),
      });
    });
  });

  app.get("/api/integrations/gohighlevel/diagnostics", (req, res) => {
    withRouteHandling(res, "diagnostics", async () => {
      const diagnostics = await runGoHighLevelDiagnostics(req);
      const failed = diagnostics.divisions.some((division) => division.results.some((result) => result.status === "Failed"));

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
  if (tokenSet.authMode === "private_token") {
    return tokenSet;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: requireEnv("GHL_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("GHL_OAUTH_CLIENT_SECRET"),
    refresh_token: tokenSet.refreshToken || "",
  });

  const response = await fetchWithRetry(`${getGhlBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    operation: "oauth.token.refresh",
  });
  const refreshed = normalizeTokenResponse(await response.json());
  const next = {
    ...refreshed,
    locationId: refreshed.locationId || tokenSet.locationId,
    membershipId: tokenSet.membershipId,
    operationalDivisionId: tokenSet.operationalDivisionId,
  };
  await writeTokenSet(next);

  logIntegration("info", "oauth.token.refreshed", { locationId: next.locationId, expiresAt: next.expiresAt });

  return next;
}

async function getValidTokenSet() {
  const tokenSet = await readTokenSet();

  if (tokenSet.authMode === "oauth" && new Date(tokenSet.expiresAt).getTime() <= Date.now() + 60_000) {
    return refreshTokenSet(tokenSet);
  }

  return tokenSet;
}

async function getPrimaryTokenSet() {
  const privateTokenSets = readPrivateIntegrationTokenSets();

  if (privateTokenSets.length > 0) {
    return privateTokenSets[0];
  }

  return getValidTokenSet();
}

async function registerWebhook(tokenSet: GhlTokenSet, runtimeWebhookUrl?: string) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL || runtimeWebhookUrl;

  if (!webhookUrl) {
    throw new GhlIntegrationError(
      "GHL_WEBHOOK_URL or runtime webhook URL is required for GoHighLevel live integration.",
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
  const tokenSets = await readConfiguredTokenSets();

  if (tokenSets.length === 0) {
    const membership = getCustomerMembershipConfig();
    return {
      integration: "GoHighLevel",
      membershipId: membership.membershipId,
      membershipName: membership.membershipName,
      productionUrl: runtimeUrls.productionUrl,
      status: "Blocked",
      reason: "No GoHighLevel credentials are configured. Add Private Integration Tokens per operational division or complete OAuth.",
      divisions: membership.operationalDivisions.map((division) => ({
        operationalDivisionId: division.id,
        operationalDivisionName: division.name,
        locationId: division.locationId || "{locationId}",
        credentialStatus: "Missing",
        results: diagnosticTargets.map((target) => ({
          target,
          status: "Skipped" as const,
          path: buildDiagnosticPath(target, division.locationId || "{locationId}"),
          reason: "Missing GoHighLevel credential.",
        })),
      })),
    };
  }

  const divisions = await Promise.all(
    tokenSets.map(async (tokenSet) => ({
      operationalDivisionId: tokenSet.operationalDivisionId,
      operationalDivisionName: findDivisionById(tokenSet.operationalDivisionId)?.name || tokenSet.operationalDivisionId,
      locationId: tokenSet.locationId,
      authMode: tokenSet.authMode,
      credentialStatus: "Configured",
      results: await Promise.all(diagnosticTargets.map((target) => runDiagnosticTarget(tokenSet, target))),
    })),
  );
  const hasFailed = divisions.some((division) => division.results.some((result) => result.status === "Failed"));
  const membership = getCustomerMembershipConfig();

  return {
    integration: "GoHighLevel",
    membershipId: membership.membershipId,
    membershipName: membership.membershipName,
    productionUrl: runtimeUrls.productionUrl,
    connectedDivisions: divisions.length,
    status: hasFailed ? "Warning" : "Passed",
    divisions,
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
    tags: process.env.GHL_TAGS_PATH || `/locations/${encodeURIComponent(locationId)}/tags`,
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

function resolveTenant(payload: Record<string, unknown>): TenantResolution {
  const membership = getCustomerMembershipConfig();
  const locationId =
    readString(payload.locationId) ||
    readString(payload.location_id) ||
    readString(readRecord(payload.location)?.id) ||
    membership.operationalDivisions[0]?.locationId ||
    process.env.GHL_LOCATION_ID ||
    "";
  const division = findDivisionByLocationId(locationId, membership) || membership.operationalDivisions[0];

  return {
    tenantId: membership.membershipId,
    membershipId: membership.membershipId,
    membershipName: membership.membershipName,
    operationalDivisionId: division?.id || "default",
    operationalDivisionName: division?.name || "Default",
    locationId,
    businessDnaProfileId: membership.businessDnaProfileId,
    officeId: membership.defaultOfficeId,
    businessDna: membership.businessDna,
  };
}

function getCustomerMembershipConfig(): CustomerMembershipConfig {
  const jsonConfig = process.env.EEOS_CUSTOMER_MEMBERSHIP_JSON;

  if (jsonConfig) {
    const parsed = JSON.parse(jsonConfig) as CustomerMembershipConfig;

    return {
      ...parsed,
      businessDna: parsed.businessDna || defaultServiceBusinessDna,
      operationalDivisions: parsed.operationalDivisions || [],
    };
  }

  return {
    membershipId: process.env.EEOS_CUSTOMER_MEMBERSHIP_ID || "membership-prn-staffers",
    membershipName: process.env.EEOS_CUSTOMER_MEMBERSHIP_NAME || "PRN Staffers",
    businessDnaProfileId: process.env.EEOS_BUSINESS_DNA_PROFILE_ID || "business-dna-prn-staffers",
    defaultOfficeId: process.env.EEOS_DEFAULT_OFFICE_ID || process.env.EEOS_PRN_DEFAULT_OFFICE_ID || "office-charleston",
    businessDna: defaultServiceBusinessDna,
    operationalDivisions: missionZeroDivisionDefaults
      .map((division) => ({
        id: division.id,
        name: division.name,
        locationId: process.env[division.locationEnv] || "",
        privateIntegrationToken: process.env[division.tokenEnv],
      })),
  };
}

function describeMembershipForRuntime() {
  const membership = getCustomerMembershipConfig();

  return {
    membershipId: membership.membershipId,
    membershipName: membership.membershipName,
    businessDnaProfileId: membership.businessDnaProfileId,
    operationalDivisions: membership.operationalDivisions.map((division) => ({
      id: division.id,
      name: division.name,
      locationConfigured: Boolean(division.locationId),
      credentialConfigured: Boolean(division.privateIntegrationToken),
    })),
  };
}

function findDivisionByLocationId(locationId: string, membership = getCustomerMembershipConfig()) {
  return membership.operationalDivisions.find((division) => division.locationId === locationId);
}

function findDivisionById(id: string, membership = getCustomerMembershipConfig()) {
  return membership.operationalDivisions.find((division) => division.id === id);
}

function readPrivateIntegrationTokenSets(): GhlTokenSet[] {
  const membership = getCustomerMembershipConfig();

  return membership.operationalDivisions
    .filter((division) => division.privateIntegrationToken && division.locationId)
    .map((division) => ({
      authMode: "private_token" as const,
      accessToken: division.privateIntegrationToken || "",
      tokenType: "Bearer",
      expiresAt: "static",
      scopes: readScopes(),
      locationId: division.locationId,
      membershipId: membership.membershipId,
      operationalDivisionId: division.id,
    }));
}

async function readConfiguredTokenSets() {
  const tokenSets = [...readPrivateIntegrationTokenSets()];
  const oauthTokenSet = await readOptionalTokenSet();

  if (oauthTokenSet) {
    tokenSets.push(await getValidTokenSet());
  }

  return tokenSets;
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
    whyThisMatters: insight.whyThisMatters,
    businessReasoning: insight.businessReasoning,
    supportingBusinessSignals: insight.supportingBusinessSignals,
    expectedOutcome: insight.expectedOutcome,
    potentialRisk: insight.potentialRisk,
    riskLevel: insight.riskLevel,
    expectedBusinessImpact: insight.expectedBusinessImpact,
    recommendedNextAction: insight.recommendedNextAction,
    measurementPlan: insight.measurementPlan,
    estimatedConfidenceImprovementAfterAction: insight.estimatedConfidenceImprovementAfterAction,
    businessSignalCorrelation: insight.businessSignalCorrelation,
    executivePriority: insight.executivePriority,
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
    whyThisMatters: receipt.whyThisMatters,
    qualityGate: receipt.qualityGate,
    supportingBusinessSignals: receipt.supportingBusinessSignals,
    businessSignalCorrelation: receipt.businessSignalCorrelation,
    expectedBusinessImpact: receipt.expectedBusinessImpact,
    riskLevel: receipt.riskLevel,
    potentialRisk: receipt.potentialRisk,
    recommendedNextAction: receipt.recommendedNextAction,
    measurementPlan: receipt.measurementPlan,
    estimatedConfidenceImprovementAfterAction: receipt.estimatedConfidenceImprovementAfterAction,
    executivePriority: receipt.executivePriority,
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
    whyThisMatters: receipt.whyThisMatters,
    businessReasoning: receipt.businessReasoning,
    supportingBusinessSignals: receipt.supportingBusinessSignals,
    businessSignalCorrelation: receipt.businessSignalCorrelation,
    expectedOutcome: receipt.expectedOutcome,
    expectedBusinessImpact: receipt.expectedBusinessImpact,
    riskLevel: receipt.riskLevel,
    potentialRisk: receipt.potentialRisk,
    recommendedNextAction: receipt.recommendedNextAction,
    measurementPlan: receipt.measurementPlan,
    estimatedConfidenceImprovementAfterAction: receipt.estimatedConfidenceImprovementAfterAction,
    executivePriority: receipt.executivePriority,
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
    tags: readTags(payload.tags) || readTags(contact.tags) || readTags(opportunity.tags) || [],
  };
}

function buildRecommendationInsight(eventType: string, tenant: TenantResolution, context: EventContext): RecommendationInsight {
  const supportingBusinessSignals = buildSupportingBusinessSignals(eventType, tenant, context);
  const businessSignalCorrelation = buildBusinessSignalCorrelation(eventType, context, tenant.businessDna);
  const executivePriority = prioritizeExecutiveSignal(eventType, context);
  const riskLevel = assessRiskLevel(eventType, context, executivePriority);
  const estimatedConfidenceImprovementAfterAction = estimateConfidenceImprovementAfterAction(eventType, context);
  const businessDna = tenant.businessDna;
  const reasonPrefix = `${businessDna.industry} depends on ${businessDna.executivePriorities.slice(0, 3).join(", ")}.`;

  if (eventType.includes("Opportunity")) {
    const nextAction = "Assign an executive owner, confirm the opportunity stage, and schedule the next client follow-up within the active pipeline window.";

    return {
      action: nextAction,
      whyThisMatters:
        "Opportunity movement is the strongest current signal of future staffing demand, revenue visibility, and client-retention risk.",
      businessReasoning: [
        reasonPrefix,
        `Opportunity movement changes near-term demand and revenue visibility for ${tenant.membershipName}.`,
        "Business DNA prioritizes qualified placement and client retention, so unattended pipeline changes carry operational risk.",
      ],
      supportingBusinessSignals,
      businessSignalCorrelation,
      expectedOutcome: "Improve opportunity conversion discipline and keep follow-up latency inside the active pipeline KPI window.",
      potentialRisk: "If the opportunity is not reviewed, staffing demand may drift without ownership or a measurable next action.",
      riskLevel,
      expectedBusinessImpact: "Protects conversion rate, revenue forecast quality, and staffing coverage planning.",
      recommendedNextAction: nextAction,
      measurementPlan: buildMeasurementPlan(eventType),
      estimatedConfidenceImprovementAfterAction,
      executivePriority,
      prediction: {
        horizon: "Short Term",
        expectedSignal: "Pipeline stage stability and owner follow-up should improve on the next opportunity touch.",
        measurableMetric: "Opportunity conversion and client follow-up latency",
        expectedMetricMovement: "Higher conversion probability and shorter follow-up latency after owner confirmation.",
      },
    };
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    const nextAction = "Confirm coverage ownership, appointment purpose, and follow-up readiness before the scheduled interaction.";

    return {
      action: nextAction,
      whyThisMatters:
        "Appointments convert pipeline intent into operational commitments, so weak readiness can create scheduling rework or client-friction.",
      businessReasoning: [
        reasonPrefix,
        "Appointments are operational commitments that affect schedule coverage and client experience.",
        "Business DNA has low tolerance for service-quality drift, making missed or underprepared meetings a measurable risk.",
      ],
      supportingBusinessSignals,
      businessSignalCorrelation,
      expectedOutcome: "Increase appointment show readiness and reduce scheduling friction before it reaches the client.",
      potentialRisk: "If coverage is not confirmed, PRN Staffers may lose response speed or create scheduling rework.",
      riskLevel,
      expectedBusinessImpact: "Improves appointment show rate, staffing coverage confidence, and client follow-up latency.",
      recommendedNextAction: nextAction,
      measurementPlan: buildMeasurementPlan(eventType),
      estimatedConfidenceImprovementAfterAction,
      executivePriority,
      prediction: {
        horizon: "Immediate",
        expectedSignal: "Appointment readiness should become visible through owner confirmation or calendar completion.",
        measurableMetric: "Appointment show rate and staffing coverage",
        expectedMetricMovement: "Higher show readiness and lower scheduling rework after ownership confirmation.",
      },
    };
  }

  if (eventType.includes("Conversation")) {
    const nextAction = "Classify intent, assign the right owner, and send a response or disposition before the lead-response window closes.";

    return {
      action: nextAction,
      whyThisMatters:
        "Conversation activity is a live intent signal; delayed response directly weakens speed-to-lead and client-retention confidence.",
      businessReasoning: [
        reasonPrefix,
        "Conversation activity is a direct signal of buyer or clinician intent.",
        "Business DNA prioritizes speed-to-lead, so response latency should be managed before demand cools.",
      ],
      supportingBusinessSignals,
      businessSignalCorrelation,
      expectedOutcome: "Shorten response latency and preserve conversion intent while the conversation is active.",
      potentialRisk: "If no owner responds, the lead or client may disengage before PRN Staffers can qualify the need.",
      riskLevel,
      expectedBusinessImpact: "Improves lead response time, conversion opportunity, and client retention signals.",
      recommendedNextAction: nextAction,
      measurementPlan: buildMeasurementPlan(eventType),
      estimatedConfidenceImprovementAfterAction,
      executivePriority,
      prediction: {
        horizon: "Immediate",
        expectedSignal: "A timely owner response should produce a qualified next step or disposition.",
        measurableMetric: "Lead response time and client follow-up latency",
        expectedMetricMovement: "Lower response latency and higher qualification confidence after owner disposition.",
      },
    };
  }

  const nextAction = "Qualify the contact, assign an owner, and capture the measurable next step within the speed-to-lead window.";

  return {
    action: nextAction,
    whyThisMatters:
      `Contact changes are the earliest signal of new demand, supply, or relationship movement for ${tenant.membershipName}.`,
    businessReasoning: [
      reasonPrefix,
      "New or updated contacts are intake signals for staffing demand, clinician supply, or client relationship health.",
      "Business DNA prioritizes speed-to-lead and qualified placement, so contact records need owner accountability.",
    ],
    supportingBusinessSignals,
    businessSignalCorrelation,
    expectedOutcome: "Move the contact from raw intake to qualified next action with measurable owner accountability.",
    potentialRisk: "If qualification is delayed, PRN Staffers may lose conversion momentum or miss a staffing coverage signal.",
    riskLevel,
    expectedBusinessImpact: "Improves lead response time, qualification quality, and downstream opportunity conversion.",
    recommendedNextAction: nextAction,
    measurementPlan: buildMeasurementPlan(eventType),
    estimatedConfidenceImprovementAfterAction,
    executivePriority,
    prediction: {
      horizon: "Immediate",
      expectedSignal: "Contact should receive owner assignment, qualification status, or a booked next step.",
      measurableMetric: "Lead response time and opportunity conversion",
      expectedMetricMovement: "Shorter lead response time and stronger qualification confidence after owner assignment.",
    },
  };
}

function buildSupportingBusinessSignals(eventType: string, tenant: TenantResolution, context: EventContext) {
  const businessDna = tenant.businessDna;
  const signals = [
    `Event type: ${eventType}`,
    `Customer membership: ${tenant.membershipName}`,
    `Operational division: ${tenant.operationalDivisionName}`,
    `Business DNA profile: ${tenant.businessDnaProfileId}`,
    `Business priority: ${businessDna.executivePriorities[0]}`,
    `Primary KPI: ${businessDna.kpis[0]}`,
  ];

  if (tenant.locationId) signals.push(`Location ID: ${tenant.locationId}`);
  if (context.entityId) signals.push(`${context.entityType} ID: ${context.entityId}`);
  if (context.lifecycleStage) signals.push(`Lifecycle stage/status: ${context.lifecycleStage}`);
  if (context.source) signals.push(`Source/channel: ${context.source}`);
  if (context.pipelineId) signals.push(`Pipeline ID: ${context.pipelineId}`);
  if (context.tags.length > 0) signals.push(`Tags: ${context.tags.join(", ")}`);
  if (context.assignedUserId) signals.push(`Assigned owner: ${context.assignedUserId}`);
  if (context.contactName) signals.push(`Contact name: ${context.contactName}`);
  if (context.contactEmail || context.contactPhone) signals.push("Contactability: email or phone present");
  if (context.opportunityValue !== undefined) signals.push(`Opportunity value: ${context.opportunityValue}`);
  if (context.occurredAt) signals.push(`Event timestamp: ${context.occurredAt}`);

  return signals;
}

function buildBusinessSignalCorrelation(eventType: string, context: EventContext, businessDna = defaultServiceBusinessDna) {
  const correlations = [
    `Business DNA priority '${businessDna.executivePriorities[0]}' is connected to KPI '${businessDna.kpis[0]}'.`,
  ];

  if (eventType.includes("Opportunity")) {
    correlations.push(
      `Revenue driver '${businessDna.revenueDrivers[1]}' is connected to KPI '${businessDna.kpis[1]}'.`,
      `Cost exposure '${businessDna.costCenters[2]}' rises when opportunity ownership or stage data is incomplete.`,
    );
  } else if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    correlations.push(
      `Revenue driver '${businessDna.revenueDrivers[2]}' is connected to KPI '${businessDna.kpis[3]}'.`,
      `Cost exposure '${businessDna.costCenters[1]}' rises when appointment readiness is not confirmed.`,
    );
  } else if (eventType.includes("Conversation")) {
    correlations.push(
      `Revenue driver '${businessDna.revenueDrivers[0]}' is connected to KPI '${businessDna.kpis[4]}'.`,
      `Compliance requirement '${businessDna.complianceRequirements[2]}' depends on timely, accurate client communication.`,
    );
  } else {
    correlations.push(
      `Revenue driver '${businessDna.revenueDrivers[0]}' is connected to KPI '${businessDna.kpis[1]}'.`,
      `Cost exposure '${businessDna.costCenters[0]}' increases when contact qualification lacks ownership.`,
    );
  }

  if (context.assignedUserId) {
    correlations.push("Assigned owner signal reduces execution ambiguity.");
  }

  if (context.lifecycleStage) {
    correlations.push("Lifecycle stage signal improves prediction quality for the next action.");
  }

  if (context.contactEmail || context.contactPhone) {
    correlations.push("Contactability signal increases confidence that the recommended action can be completed.");
  }

  if (context.tags.length > 0) {
    correlations.push("Tag signal validates segmentation and improves follow-up routing accuracy.");
  }

  return correlations;
}

function prioritizeExecutiveSignal(eventType: string, context: EventContext): ExecutivePriority {
  let score = 60;
  const reasons = [`Base priority set by event class: ${eventType}.`];

  if (eventType.includes("Opportunity")) {
    score += 20;
    reasons.push("Opportunity events affect revenue visibility and staffing demand.");
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    score += 14;
    reasons.push("Calendar events affect coverage readiness and client experience.");
  }

  if (eventType.includes("Conversation")) {
    score += 12;
    reasons.push("Conversation events affect response latency and retention risk.");
  }

  if (context.opportunityValue && context.opportunityValue >= 10_000) {
    score += 8;
    reasons.push("Opportunity value is material enough for executive visibility.");
  }

  if (!context.assignedUserId) {
    score += 6;
    reasons.push("Missing owner raises execution risk.");
  }

  if (!context.lifecycleStage) {
    score += 4;
    reasons.push("Missing lifecycle stage reduces forecast clarity.");
  }

  const boundedScore = Math.max(1, Math.min(100, score));
  const level = boundedScore >= 85 ? "Critical" : boundedScore >= 70 ? "High" : "Medium";

  return {
    level,
    score: boundedScore,
    reason: reasons.join(" "),
  };
}

function estimateConfidenceImprovementAfterAction(eventType: string, context: EventContext) {
  let improvement = eventType.includes("Opportunity") ? 8 : eventType.includes("Conversation") ? 7 : 6;

  if (!context.assignedUserId) improvement += 4;
  if (!context.lifecycleStage) improvement += 3;
  if (!context.contactEmail && !context.contactPhone) improvement += 2;
  if (eventType.includes("Opportunity") && context.opportunityValue === undefined) improvement += 2;
  if (context.tags.length === 0) improvement += 1;

  return Math.max(3, Math.min(18, improvement));
}

function assessRiskLevel(eventType: string, context: EventContext, priority: ExecutivePriority): RiskLevel {
  const reasons = [priority.reason];
  let score = priority.score;

  if (!context.assignedUserId) {
    score += 6;
    reasons.push("No assigned owner is present.");
  }

  if (!context.lifecycleStage && eventType.includes("Opportunity")) {
    score += 5;
    reasons.push("Opportunity stage is missing.");
  }

  if (context.tags.length === 0) {
    score += 2;
    reasons.push("No tags are available to validate routing or segmentation.");
  }

  return {
    level: score >= 92 ? "Critical" : score >= 78 ? "High" : score >= 60 ? "Medium" : "Low",
    reason: reasons.join(" "),
  };
}

function buildMeasurementPlan(eventType: string): MeasurementPlan {
  if (eventType.includes("Opportunity")) {
    return {
      primaryMetric: "Opportunity conversion and client follow-up latency",
      targetMovement: "Confirm owner and next step, then reduce follow-up latency on the next opportunity touch.",
      verificationWindow: "24 Hours",
      successSignal: "Opportunity has owner, stage confirmation, and scheduled next action.",
    };
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    return {
      primaryMetric: "Appointment show rate and staffing coverage",
      targetMovement: "Increase coverage readiness before the scheduled interaction.",
      verificationWindow: "Same Day",
      successSignal: "Appointment has owner confirmation and follow-up readiness.",
    };
  }

  if (eventType.includes("Conversation")) {
    return {
      primaryMetric: "Lead response time and client follow-up latency",
      targetMovement: "Reduce active response latency and capture disposition.",
      verificationWindow: "Same Day",
      successSignal: "Conversation has owner response or qualified disposition.",
    };
  }

  return {
    primaryMetric: "Lead response time and opportunity conversion",
    targetMovement: "Move contact from raw intake to qualified next action.",
    verificationWindow: "24 Hours",
    successSignal: "Contact has owner assignment, qualification status, or booked next step.",
  };
}

function evaluateRecommendationQuality(
  eventType: string,
  tenant: TenantResolution,
  context: EventContext,
  insight: RecommendationInsight,
): RecommendationQualityGate {
  const accurate = supportedWebhookEvents.includes(eventType as (typeof supportedWebhookEvents)[number]) && Boolean(tenant.locationId && context.entityId);
  const explainable =
    Boolean(insight.whyThisMatters) &&
    insight.businessReasoning.length >= 2 &&
    insight.supportingBusinessSignals.length >= 5 &&
    insight.businessSignalCorrelation.length >= 3;
  const actionable =
    insight.recommendedNextAction.length > 0 &&
    !insight.recommendedNextAction.toLowerCase().includes("review only") &&
    insight.executivePriority.score > 0;
  const measurable = Boolean(
    insight.expectedOutcome &&
      insight.expectedBusinessImpact &&
      insight.prediction.measurableMetric &&
      insight.prediction.expectedMetricMovement &&
      insight.measurementPlan.primaryMetric &&
      insight.measurementPlan.successSignal &&
      insight.estimatedConfidenceImprovementAfterAction > 0,
  );
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
      evidence: tenant.businessDna.mission,
    },
    {
      from: tenant.tenantId,
      to: tenant.locationId || "unknown-location",
      relationship: "owns_location",
      evidence: `Tenant resolver mapped the GoHighLevel event to ${tenant.membershipName} / ${tenant.operationalDivisionName}.`,
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
    {
      from: recommendationId,
      to: insight.executivePriority.level,
      relationship: "prioritized_as",
      evidence: insight.executivePriority.reason,
    },
    {
      from: recommendationId,
      to: insight.businessSignalCorrelation[0],
      relationship: "correlates_business_signal",
      evidence: insight.whyThisMatters,
    },
    {
      from: recommendationId,
      to: insight.prediction.expectedMetricMovement,
      relationship: "predicts_metric_movement",
      evidence: `Estimated confidence improvement after action: ${insight.estimatedConfidenceImprovementAfterAction} points.`,
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
  if (context.tags.length > 0) score += 2;
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
  const privateTokenSets = readPrivateIntegrationTokenSets();

  if (privateTokenSets.length > 0) {
    return "Private Tokens Ready";
  }

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
  const membership = getCustomerMembershipConfig();
  const privateTokenSets = readPrivateIntegrationTokenSets();
  const connectedDivisions = privateTokenSets.length + (tokenSet ? 1 : 0);
  const locationConfigured = membership.operationalDivisions.some((division) => division.locationId) || Boolean(tokenSet?.locationId);
  const connectedLocationId = tokenSet?.locationId || membership.operationalDivisions.find((division) => division.locationId)?.locationId || null;
  const configuration = getConfigurationStatus();

  return {
    integration: "GoHighLevel",
    membership: describeMembershipForRuntime(),
    connectionStatus: connectedDivisions > 0 && locationConfigured ? "Connected" : "Waiting",
    authenticationStatus: tokenStatus,
    productionUrl: runtimeUrls.productionUrl,
    oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
    webhookUrl: runtimeUrls.webhookUrl,
    connectedLocationId,
    connectedDivisions,
    missionZeroAuthentication: privateTokenSets.length > 0 ? "Private Integration Tokens" : "Waiting",
    futureAuthenticationPath: "Eagle Eye Automation OAuth Marketplace App",
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
    authMode: "oauth",
    accessToken,
    refreshToken,
    tokenType: readString(record.token_type) || "Bearer",
    expiresAt: new Date(Date.now() + Number(record.expires_in || 3600) * 1000).toISOString(),
    scopes: readString(record.scope)?.split(/[,\s]+/).filter(Boolean) || readScopes(),
    locationId: readString(record.locationId) || readString(record.location_id) || "",
    membershipId: getCustomerMembershipConfig().membershipId,
    operationalDivisionId: "oauth-location",
    companyId: readString(record.companyId) || readString(record.company_id),
  };
}

function getVaultKey() {
  return createHash("sha256").update(requireEnv("EEOS_TOKEN_VAULT_KEY")).digest();
}

function getVaultFile() {
  return process.env.GHL_TOKEN_VAULT_FILE || path.join(os.tmpdir(), "eeos-ghl-token-vault.json");
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
  const membership = getCustomerMembershipConfig();
  const privateTokenSets = readPrivateIntegrationTokenSets();

  return {
    customerMembership: Boolean(membership.membershipId),
    operationalDivisions: membership.operationalDivisions.length,
    privateIntegrationTokens: privateTokenSets.length,
    oauthClientId: Boolean(process.env.GHL_OAUTH_CLIENT_ID),
    oauthClientSecret: Boolean(process.env.GHL_OAUTH_CLIENT_SECRET),
    oauthStateSecret: Boolean(process.env.GHL_OAUTH_STATE_SECRET),
    tokenVaultKey: Boolean(process.env.EEOS_TOKEN_VAULT_KEY),
    webhookSecret: Boolean(process.env.GHL_WEBHOOK_SECRET),
    locationId: membership.operationalDivisions.some((division) => division.locationId) || Boolean(process.env.GHL_LOCATION_ID),
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

function readTags(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tags = value
    .map((tag) => (typeof tag === "string" ? tag : readString(readRecord(tag).name) || readString(readRecord(tag).id)))
    .filter((tag): tag is string => Boolean(tag));

  return tags.length > 0 ? tags : undefined;
}

function readQuery(req: Request, key: string) {
  const value = req.query[key];

  return typeof value === "string" ? value : undefined;
}

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new GhlIntegrationError(`${key} is required for GoHighLevel live integration.`, "CONFIGURATION_ERROR", 500, {
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
  getCustomerMembershipConfig,
  normalizeBaseUrl,
  normalizeEventType,
  processGhlEvent,
  resolveTenant,
  secureCompare,
  verifyHmacSignature,
};
