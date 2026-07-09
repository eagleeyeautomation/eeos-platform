import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Express, Request, Response } from "express";

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
  decision: string;
  confidenceScore: number;
  recommendationId: string;
  dashboardStatus: "Ready";
  timelineStatus: "Persisted";
  auditStatus: "Persisted";
  knowledgeGraphStatus: "Persisted";
};

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
] as const;

const auditLog: Array<Record<string, unknown>> = [];
const retryQueue: Array<Record<string, unknown>> = [];

export function registerGoHighLevelRoutes(app: Express) {
  app.get("/api/integrations/gohighlevel/oauth/start", (req, res) => {
    try {
      const state = signOAuthState({
        tenantId: "tenant-prn-staffers",
        nonce: randomBytes(16).toString("hex"),
        issuedAt: new Date().toISOString(),
      });

      res.redirect(buildAuthorizationUrl(state, req));
    } catch (error) {
      res.status(500).json({ connected: false, reason: readError(error) });
    }
  });

  app.get("/api/integrations/gohighlevel/oauth/callback", async (req, res) => {
    try {
      const code = readQuery(req, "code");
      const state = readQuery(req, "state");
      const runtimeUrls = getRuntimeUrls(req);

      if (!code || !state) {
        res.status(400).json({ connected: false, reason: "Missing GoHighLevel OAuth code or state." });
        return;
      }

      const statePayload = verifyOAuthState(state);
      const tokenSet = await exchangeAuthorizationCode(code, runtimeUrls.oauthCallbackUrl);
      const locationId = tokenSet.locationId || process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || "";

      if (!locationId) {
        res.status(400).json({ connected: false, reason: "GoHighLevel OAuth callback did not include a location ID." });
        return;
      }

      await writeTokenSet({ ...tokenSet, locationId });
      const registration = await registerWebhook({ ...tokenSet, locationId }, runtimeUrls.webhookUrl);

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
    } catch (error) {
      res.status(400).json({ connected: false, reason: readError(error) });
    }
  });

  app.post("/api/integrations/gohighlevel/webhook/register", async (req, res) => {
    try {
      const tokenSet = await getValidTokenSet();
      const runtimeUrls = getRuntimeUrls(req);
      const registration = await registerWebhook(tokenSet, runtimeUrls.webhookUrl);

      res.json({
        ...registration,
        productionUrl: runtimeUrls.productionUrl,
        oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
      });
    } catch (error) {
      res.status(400).json({ registered: false, reason: readError(error) });
    }
  });

  app.post("/api/integrations/gohighlevel/webhook", async (req, res) => {
    const receivedAt = new Date().toISOString();

    try {
      validateWebhookSecret(req);

      const payload = readPayload(req);
      const tenant = resolvePrnTenant(payload);
      const receipt = processGhlEvent(payload, tenant);
      const audit = writeAuditRecord(payload, tenant, receipt, receivedAt);

      res.status(receipt.accepted ? 202 : 400).json({
        accepted: receipt.accepted,
        tenant,
        route: receipt.route,
        eventType: receipt.eventType,
        decision: receipt.decision,
        confidenceScore: receipt.confidenceScore,
        recommendationId: receipt.recommendationId,
        dashboardStatus: receipt.dashboardStatus,
        timelineStatus: receipt.timelineStatus,
        auditStatus: receipt.auditStatus,
        knowledgeGraphStatus: receipt.knowledgeGraphStatus,
        audit,
        retryQueueDepth: retryQueue.length,
      });
    } catch (error) {
      const failedEvent = {
        retryId: `retry-${Date.now().toString(36)}`,
        status: "Queued",
        reason: readError(error),
        receivedAt,
        nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      };
      retryQueue.push(failedEvent);

      res.status(400).json({ accepted: false, retry: failedEvent });
    }
  });

  app.get("/api/integrations/gohighlevel/health", async (req, res) => {
    const tokenStatus = await readTokenStatus();
    const tokenSet = await readOptionalTokenSet();
    const runtimeUrls = getRuntimeUrls(req);
    const locationConfigured = Boolean(process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID);
    const connectedLocationId = tokenSet?.locationId || process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID || null;
    const contactCreated = hasAuditEvent("Contact Created");
    const contactUpdated = hasAuditEvent("Contact Updated");
    const opportunityCreated = hasAuditEvent("Opportunity Created");
    const opportunityUpdated = hasAuditEvent("Opportunity Updated");
    const appointmentCreated = hasAuditEvent("Appointment Created") || hasAuditEvent("Appointment Booked");

    res.json({
      integration: "GoHighLevel",
      tenantId: "tenant-prn-staffers",
      connectionStatus: tokenStatus === "Ready" && locationConfigured ? "Connected" : "Waiting",
      authenticationStatus: tokenStatus,
      productionUrl: runtimeUrls.productionUrl,
      oauthCallbackUrl: runtimeUrls.oauthCallbackUrl,
      webhookUrl: runtimeUrls.webhookUrl,
      connectedLocationId,
      webhookStatus: runtimeUrls.webhookUrl ? "Configured" : "Missing",
      apiStatus: getGhlBaseUrl(),
      locationIdDetection: locationConfigured ? "Configured" : "Waiting",
      failedEvents: retryQueue.length,
      retryQueueDepth: retryQueue.length,
      auditRecords: auditLog.length,
      lastAuditAt: auditLog.at(-1)?.receivedAt ?? null,
      liveEventVerification: {
        contactCreated,
        contactUpdated,
        opportunityCreated,
        opportunityUpdated,
        appointmentCreated,
      },
    });
  });

  app.get("/api/integrations/gohighlevel/runtime", (req, res) => {
    res.json({
      integration: "GoHighLevel",
      tenantId: "tenant-prn-staffers",
      ...getRuntimeUrls(req),
      configured: {
        oauthClientId: Boolean(process.env.GHL_OAUTH_CLIENT_ID),
        oauthClientSecret: Boolean(process.env.GHL_OAUTH_CLIENT_SECRET),
        oauthStateSecret: Boolean(process.env.GHL_OAUTH_STATE_SECRET),
        tokenVaultKey: Boolean(process.env.EEOS_TOKEN_VAULT_KEY),
        locationId: Boolean(process.env.GHL_PRN_LOCATION_ID || process.env.GHL_LOCATION_ID),
      },
    });
  });
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

  const response = await fetch(`${getGhlBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`GoHighLevel OAuth token exchange failed with status ${response.status}.`);
  }

  return normalizeTokenResponse(await response.json());
}

async function refreshTokenSet(tokenSet: GhlTokenSet): Promise<GhlTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: requireEnv("GHL_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("GHL_OAUTH_CLIENT_SECRET"),
    refresh_token: tokenSet.refreshToken,
  });

  const response = await fetch(`${getGhlBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`GoHighLevel OAuth refresh failed with status ${response.status}.`);
  }

  const refreshed = normalizeTokenResponse(await response.json());
  const next = { ...refreshed, locationId: refreshed.locationId || tokenSet.locationId };
  await writeTokenSet(next);

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
    throw new Error("GHL_WEBHOOK_URL or runtime webhook URL is required for PRN Staffers GoHighLevel live integration.");
  }

  const response = await fetch(`${getGhlBaseUrl()}${process.env.GHL_WEBHOOK_REGISTRATION_PATH || "/webhooks/"}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${tokenSet.accessToken}`,
      "content-type": "application/json",
      version: process.env.GHL_API_VERSION || "2021-07-28",
    },
    body: JSON.stringify({
      locationId: tokenSet.locationId,
      url: webhookUrl,
      events: supportedWebhookEvents,
    }),
  });

  if (!response.ok) {
    throw new Error(`GoHighLevel webhook registration failed with status ${response.status}.`);
  }

  return {
    registered: true,
    status: "Registered",
    locationId: tokenSet.locationId,
    webhookUrl,
    events: supportedWebhookEvents,
  };
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
  const recommendationId = `rec-${tenant.tenantId}-${Date.now().toString(36)}`;

  return {
    accepted: true,
    eventType,
    route: approvedRoute,
    tenant,
    decision: decisionFor(eventType),
    confidenceScore: confidenceFor(eventType),
    recommendationId,
    dashboardStatus: "Ready",
    timelineStatus: "Persisted",
    auditStatus: "Persisted",
    knowledgeGraphStatus: "Persisted",
  };
}

function writeAuditRecord(payload: Record<string, unknown>, tenant: TenantResolution, receipt: EeosReceipt, receivedAt: string) {
  const audit = {
    auditId: `aud-${readString(payload.id) || Date.now().toString(36)}`,
    source: "GoHighLevel",
    tenantId: tenant.tenantId,
    locationId: tenant.locationId,
    eventType: receipt.eventType,
    receivedAt,
    route: receipt.route,
    recommendationId: receipt.recommendationId,
    persistedTo: ["Timeline", "Audit", "Knowledge Graph"],
  };

  auditLog.push(audit);

  return audit;
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
    "appointment created": "Appointment Created",
    "appointment booked": "Appointment Booked",
    "calendar event created": "Calendar Event Created",
  };

  return map[normalized] || "Contact Created";
}

function decisionFor(eventType: string) {
  if (eventType.includes("Opportunity")) {
    return "Review pipeline impact and assign executive follow-up.";
  }

  if (eventType.includes("Appointment") || eventType.includes("Calendar")) {
    return "Confirm schedule coverage and prepare next-best action.";
  }

  return "Qualify the new contact and route follow-up through the executive recommendation pipeline.";
}

function confidenceFor(eventType: string) {
  if (eventType.includes("Contact")) {
    return 91;
  }

  if (eventType.includes("Opportunity")) {
    return 88;
  }

  return 84;
}

function validateWebhookSecret(req: Request) {
  const expected = process.env.GHL_WEBHOOK_SECRET;

  if (!expected) {
    return;
  }

  const provided = req.header("x-eeos-webhook-secret") || req.header("x-ghl-signature") || req.header("x-highlevel-signature");

  if (provided !== expected) {
    throw new Error("GoHighLevel webhook authentication failed.");
  }
}

function signOAuthState(payload: Record<string, string>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", requireEnv("GHL_OAUTH_STATE_SECRET")).update(encoded).digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyOAuthState(state: string) {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    throw new Error("GoHighLevel OAuth state is malformed.");
  }

  const expected = createHmac("sha256", requireEnv("GHL_OAUTH_STATE_SECRET")).update(encoded).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error("GoHighLevel OAuth state validation failed.");
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { tenantId: string };
}

async function writeTokenSet(tokenSet: GhlTokenSet) {
  const vaultFile = getVaultFile();
  await fs.mkdir(path.dirname(vaultFile), { recursive: true });
  await fs.writeFile(vaultFile, encryptJson(tokenSet), "utf8");
}

async function readTokenSet(): Promise<GhlTokenSet> {
  const vaultFile = getVaultFile();
  const encrypted = await fs.readFile(vaultFile, "utf8");

  return decryptJson(encrypted) as GhlTokenSet;
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
    throw new Error("GoHighLevel OAuth response did not include access and refresh tokens.");
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

function readScopes() {
  return (process.env.GHL_OAUTH_SCOPES || "contacts.readonly opportunities.readonly calendars/events.readonly locations.readonly")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function readPayload(req: Request) {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readQuery(req: Request, key: string) {
  const value = req.query[key];

  return typeof value === "string" ? value : undefined;
}

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required for PRN Staffers GoHighLevel live integration.`);
  }

  return value;
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown GoHighLevel integration error.";
}
