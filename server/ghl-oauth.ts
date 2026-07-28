/**
 * GoHighLevel OAuth Flow
 * GET /api/ghl/auth      — generates GHL authorization URL and redirects
 * GET /api/ghl/callback  — exchanges auth code for tokens, stores in DB
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every token stored here feeds the IE pipeline with accurate, fresh data.
 */

import { createCipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { resolveOrganizationAuthorizationContext } from "./authorization";
import { upsertGhlToken, getGhlToken } from "./db";
import { consumeOAuthState, persistAuditEvent, persistOAuthState, upsertGhlTokenRecord } from "./db/runtimePersistence";

const GHL_AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const EEOS_OAUTH_PREFLIGHT_HEADER = "x-eeos-oauth-preflight";
const EEOS_OAUTH_PREFLIGHT_VALUE = "verify";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const APPROVED_GHL_CALLBACK_PATH = "/api/integrations/eea/oauth/callback";
const APPROVED_GHL_CALLBACK_URL = "https://eeos-platform-production.up.railway.app/api/integrations/eea/oauth/callback";
const EEOS_CSRF_COOKIE = "eeos_csrf";

type GhlConnectSessionContext = {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  organizationId: string;
  organizationName: string;
  membershipId: number;
  locationId: string;
  locationName: string;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function logGhlOAuth(event: string, metadata: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    level: "info",
    component: "ghl_oauth",
    event,
    ...metadata,
  }));
}

function logGhlOAuthError(event: string, error: unknown, metadata: Record<string, unknown> = {}) {
  console.error(JSON.stringify({
    level: "error",
    component: "ghl_oauth",
    event,
    error: sanitizeError(error),
    ...metadata,
  }));
}

function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: redactSecrets(error.message) };
  }

  return { message: redactSecrets(String(error)) };
}

function redactSecrets(value: string) {
  return value
    .replace(/access_token["'=:\s]+[^"',\s}]+/gi, "access_token=<redacted>")
    .replace(/refresh_token["'=:\s]+[^"',\s}]+/gi, "refresh_token=<redacted>")
    .replace(/client_secret["'=:\s]+[^"',\s}]+/gi, "client_secret=<redacted>");
}

function getGhlClientId() {
  return process.env.GHL_CLIENT_ID || process.env.GHL_OAUTH_CLIENT_ID || ENV.ghlClientId;
}

function getGhlClientSecret() {
  return process.env.GHL_CLIENT_SECRET || process.env.GHL_OAUTH_CLIENT_SECRET || ENV.ghlClientSecret;
}

function getGhlConfigPresence() {
  return {
    GHL_CLIENT_ID: Boolean(process.env.GHL_CLIENT_ID),
    GHL_CLIENT_SECRET: Boolean(process.env.GHL_CLIENT_SECRET),
    GHL_OAUTH_CLIENT_ID: Boolean(process.env.GHL_OAUTH_CLIENT_ID),
    GHL_OAUTH_CLIENT_SECRET: Boolean(process.env.GHL_OAUTH_CLIENT_SECRET),
    GHL_REDIRECT_URI: Boolean(process.env.GHL_REDIRECT_URI),
    GHL_OAUTH_REDIRECT_URI: Boolean(process.env.GHL_OAUTH_REDIRECT_URI),
  };
}

/** Build the GHL OAuth authorization URL */
function buildGhlAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: getApprovedRedirectUri(),
    client_id: getGhlClientId(),
    scope: [
      "contacts.readonly",
      "contacts.write",
      "opportunities.readonly",
      "opportunities.write",
      "calendars.readonly",
      "calendars/events.readonly",
      "locations.readonly",
      "workflows.readonly",
      "forms.readonly",
      "conversations.readonly",
      "conversations/message.readonly",
    ].join(" "),
    state,
  });
  return `${GHL_AUTH_URL}?${params.toString()}`;
}

/** Exchange authorization code for GHL access + refresh tokens */
async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    client_id: getGhlClientId(),
    client_secret: getGhlClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    user_type: "Location",
  });

  const response = await fetch(GHL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHL token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    locationId?: string;
    location_id?: string;
    companyId?: string;
    company_id?: string;
    userId?: string;
    userType?: string;
    user_type?: string;
  }>;
}

function getApprovedRedirectUri() {
  return process.env.GHL_REDIRECT_URI || process.env.GHL_OAUTH_REDIRECT_URI || ENV.ghlRedirectUri || APPROVED_GHL_CALLBACK_URL;
}

function readTokenLocationId(tokenData: Awaited<ReturnType<typeof exchangeCodeForTokens>>) {
  return tokenData.locationId || tokenData.location_id || "";
}

function readTokenCompanyId(tokenData: Awaited<ReturnType<typeof exchangeCodeForTokens>>) {
  return tokenData.companyId || tokenData.company_id || "";
}

function readTokenUserType(tokenData: Awaited<ReturnType<typeof exchangeCodeForTokens>>) {
  return tokenData.userType || tokenData.user_type || "Location";
}

function encryptTokenPayload(payload: Record<string, unknown>) {
  const keyMaterial = process.env.EEOS_TOKEN_VAULT_KEY;

  if (!keyMaterial) {
    throw new Error("EEOS_TOKEN_VAULT_KEY is required to store GoHighLevel OAuth tokens.");
  }

  const key = createHash("sha256").update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);

  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  });
}

function tryDecodeEeosStatePayload(state: string) {
  const stateBody = state.includes(".") ? state.slice(0, state.indexOf(".")) : state;

  try {
    const decoded = JSON.parse(Buffer.from(stateBody, "base64url").toString()) as Record<string, unknown>;
    const tenantId = typeof decoded.tenantId === "string" ? decoded.tenantId : "";
    const locationId = typeof decoded.locationId === "string" ? decoded.locationId : "";

    if (!tenantId || !locationId) {
      return null;
    }

    return { tenantId, locationId };
  } catch {
    return null;
  }
}

async function validateRequiredOAuthState(state: string | undefined) {
  if (!state) {
    throw new GhlOAuthRequestError(400, "GoHighLevel OAuth state is required.");
  }

  const payload = tryDecodeEeosStatePayload(state);

  if (!payload) {
    throw new GhlOAuthRequestError(400, "GoHighLevel OAuth state is malformed.");
  }

  const consumed = await consumeOAuthState(state);

  if (!consumed) {
    throw new GhlOAuthRequestError(400, "GoHighLevel OAuth state is expired, missing, or already used.");
  }

  if (
    consumed.organizationId !== payload.tenantId
    || consumed.payload.provider !== "gohighlevel"
    || consumed.payload.tenantId !== payload.tenantId
    || consumed.payload.locationId !== payload.locationId
  ) {
    throw new GhlOAuthRequestError(400, "GoHighLevel OAuth state does not match the authorized organization and location.");
  }

  return payload;
}

function buildProviderErrorMessage(error: string, errorDescription: string | undefined) {
  const details = errorDescription ? `: ${errorDescription}` : "";

  return `GoHighLevel returned OAuth error "${error}"${details}. The authorization was not approved by GoHighLevel, the installing user, or the Marketplace app configuration.`;
}

function renderSuccessPage(res: Response, locationId: string) {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EEOS GoHighLevel Connected</title>
  </head>
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;">
    <main style="display:block;padding:48px;max-width:720px;">
      <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;color:#000000;">EEOS is now connected to GoHighLevel.</h1>
      <p style="margin:0 0 12px;font-size:18px;line-height:1.5;color:#000000;">You can close this window and return to GoHighLevel.</p>
      ${locationId ? `<p style="margin:0;font-size:16px;line-height:1.5;color:#000000;">Connected location: ${escapeHtml(locationId)}</p>` : ""}
    </main>
  </body>
</html>`;

  sendHtml(res, 200, body);
}

function renderErrorPage(res: Response, status: number, message: string) {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EEOS GoHighLevel Connection Error</title>
  </head>
  <body style="margin:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;">
    <main style="display:block;padding:48px;max-width:720px;">
      <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;color:#000000;">GoHighLevel connection failed.</h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:#000000;">${escapeHtml(message)}</p>
    </main>
  </body>
</html>`;

  sendHtml(res, status, body);
}

function sendHtml(res: Response, status: number, body: string) {
  res
    .status(status)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-store")
    .set("Content-Length", String(Buffer.byteLength(body)))
    .send(body);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] || char);
}

/** Refresh an expired GHL access token */
export async function refreshGhlToken(tenantId: string): Promise<boolean> {
  const token = await getGhlToken(tenantId);
  if (!token) return false;

  try {
    const body = new URLSearchParams({
      client_id: getGhlClientId(),
      client_secret: getGhlClientSecret(),
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      user_type: "Location",
    });

    const response = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL] Token refresh failed for ${tenantId}: ${response.status} ${errorText}`);
      await upsertGhlToken({
        tenantId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        refreshFailCount: (token.refreshFailCount ?? 0) + 1,
      });
      return false;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type?: string;
      scope?: string;
    };

    const expiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000); // 5 min buffer

    await upsertGhlToken({
      tenantId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type ?? "Bearer",
      scope: data.scope,
      expiresAt,
      lastRefreshedAt: new Date(),
      refreshFailCount: 0,
    });

    console.log(`[GHL] Token refreshed successfully for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`[GHL] Token refresh error for ${tenantId}:`, error);
    return false;
  }
}

/** Register GHL OAuth routes on the Express app */
export function registerGhlOAuthRoutes(app: Express) {
  app.get("/api/integrations/gohighlevel/session-context", async (req: Request, res: Response) => {
    try {
      const context = await resolveGhlConnectSessionContext(req, getQueryParam(req, "locationId"));
      ensureCsrfCookie(req, res);

      res.status(200).json({
        authenticated: true,
        user: {
          id: context.userId,
          name: context.userName,
          email: context.userEmail,
          role: context.userRole,
        },
        organization: {
          id: context.organizationId,
          name: context.organizationName,
          membershipId: context.membershipId,
        },
        location: {
          id: context.locationId,
          name: context.locationName,
        },
        csrfCookieReady: true,
      });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.get("/api/integrations/gohighlevel/oauth/start", (_req: Request, res: Response) => {
    res.status(405).json({
      error: "method_not_allowed",
      message: "Use POST with a verified EEOS session and CSRF token to start GoHighLevel OAuth.",
    });
  });

  app.post("/api/integrations/gohighlevel/oauth/start", async (req: Request, res: Response) => {
    try {
      const locationId = getQueryParam(req, "locationId");
      const isPreflight = req.header(EEOS_OAUTH_PREFLIGHT_HEADER) === EEOS_OAUTH_PREFLIGHT_VALUE;
      validateCsrf(req);
      const context = await resolveGhlConnectSessionContext(req, locationId);
      const requestedOrganizationId = getQueryParam(req, "organizationId");
      if (requestedOrganizationId && requestedOrganizationId !== context.organizationId) {
        throw new GhlOAuthRequestError(403, "The requested organization is not authorized.");
      }

      if (!getGhlClientId()) {
        res.status(503).json({ error: "GHL integration not configured" });
        return;
      }

      const existingToken = await getGhlToken(context.organizationId);
      if (existingToken?.isActive && existingToken.locationId === context.locationId) {
        throw new GhlOAuthRequestError(409, "This GoHighLevel location is already connected.");
      }

      const state = Buffer.from(JSON.stringify({
        tenantId: context.organizationId,
        locationId: context.locationId,
        nonce: randomBytes(16).toString("hex"),
        ts: Date.now(),
      })).toString("base64url");

      const stateExpiresAt = new Date(Date.now() + 10 * 60_000);
      await persistOAuthState(
        state,
        {
          provider: "gohighlevel",
          tenantId: context.organizationId,
          locationId: context.locationId,
          membershipId: String(context.membershipId),
          userId: String(context.userId),
        },
        stateExpiresAt,
      );

      const authorizationUrl = buildGhlAuthUrl(state);
      if (isPreflight) {
        const invalidatedState = await consumeOAuthState(state);
        if (!invalidatedState) {
          throw new GhlOAuthRequestError(500, "OAuth preflight state could not be safely invalidated.");
        }
      }

      await persistAuditEvent({
        organizationId: context.organizationId,
        source: "gohighlevel",
        eventType: "oauth.start.allowed",
        locationId: context.locationId,
        metadata: {
          userId: String(context.userId),
          role: context.userRole,
          ...(isPreflight ? { mode: "preflight", stateStatus: "invalidated" } : {}),
        },
      });
      logGhlOAuth("start.authorization_url_created", {
        tenantId: context.organizationId,
        locationId: context.locationId,
        userId: context.userId,
        mode: isPreflight ? "preflight" : "standard",
      });

      if (isPreflight) {
        res.status(200).json({
          success: true,
          provider: "gohighlevel",
          authorizationUrl,
          state: {
            created: true,
            status: "invalidated",
            expiresAt: stateExpiresAt.toISOString(),
          },
        });
        return;
      }

      res.status(200).json({ authorizationUrl });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  /**
   * GET /api/ghl/auth
   * Generates GHL OAuth authorization URL and redirects the browser to it.
   * The tenantId (user's openId) is encoded in the state parameter.
   */
  app.get("/api/ghl/auth", async (req: Request, res: Response) => {
    logGhlOAuth("legacy_start.denied", { method: req.method, statusCode: 410 });
    res.status(410).json({
      error: "gone",
      message: "This OAuth start route is no longer available.",
    });
  });

  /**
   * GET /api/ghl/callback
   * GHL redirects here after user authorizes. Exchanges code for tokens
   * and stores them in the ghl_tokens table.
   */
  const handleGhlOAuthCallback = async (req: Request, res: Response) => {
    res.once("finish", () => {
      logGhlOAuth("callback_response_finished", {
        path: req.path,
        statusCode: res.statusCode,
        contentType: res.getHeader("content-type") || null,
        contentLength: res.getHeader("content-length") || null,
      });
    });

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");

    logGhlOAuth("callback_received", {
      path: req.path,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasError: Boolean(error),
      hasErrorDescription: Boolean(errorDescription),
    });

    let stateValidation: Awaited<ReturnType<typeof validateRequiredOAuthState>>;
    try {
      stateValidation = await validateRequiredOAuthState(state);
    } catch (err) {
      logGhlOAuthError("callback_failed", err, { path: req.path });
      renderErrorPage(res, 400, err instanceof GhlOAuthRequestError ? err.message : "OAuth state validation failed.");
      return;
    }

    if (error) {
      const message = buildProviderErrorMessage(error, errorDescription);

      logGhlOAuth("callback_failed", {
        reason: "provider_error",
        error,
        hasErrorDescription: Boolean(errorDescription),
      });
      renderErrorPage(res, 400, message);
      return;
    }

    if (!code) {
      logGhlOAuth("callback_failed", { reason: "missing_params" });
      renderErrorPage(res, 400, "Missing GoHighLevel OAuth authorization code.");
      return;
    }

    try {
      const tenantId = stateValidation.tenantId;
      logGhlOAuth("state_validated", {
        tenantId,
        locationId: stateValidation.locationId,
        validated: true,
      });

      const redirectUri = getApprovedRedirectUri();
      logGhlOAuth("token_exchange_started", { tenantId, redirectUri, variablesPresent: getGhlConfigPresence() });
      const tokenData = await exchangeCodeForTokens(code, redirectUri);
      logGhlOAuth("token_exchange_succeeded", {
        tenantId,
        locationId: readTokenLocationId(tokenData) || null,
        companyId: readTokenCompanyId(tokenData) || null,
        userType: readTokenUserType(tokenData),
      });

      const expiresAt = new Date(Date.now() + (tokenData.expires_in - 300) * 1000);
      const locationId = readTokenLocationId(tokenData);
      const companyId = readTokenCompanyId(tokenData);
      const userType = readTokenUserType(tokenData);
      const scopes = tokenData.scope?.split(/[,\s]+/).filter(Boolean) || [];
      logGhlOAuth("token_payload_normalized", {
        tenantId,
        hasLocationId: Boolean(locationId),
        hasCompanyId: Boolean(companyId),
        userType,
        scopeCount: scopes.length,
        expiresAt: expiresAt.toISOString(),
      });

      if (!locationId) {
        throw new Error("GoHighLevel token response did not include a location ID.");
      }
      if (locationId !== stateValidation.locationId) {
        throw new Error("GoHighLevel OAuth location does not match the authorized state.");
      }

      logGhlOAuth("token_storage_started", { tenantId, locationId });
      await upsertGhlTokenRecord({
        membershipId: tenantId,
        operationalDivisionId: locationId,
        locationId,
        encryptedPayload: encryptTokenPayload({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || "Bearer",
          expiresAt: expiresAt.toISOString(),
          scopes,
          locationId,
          companyId,
          userType,
        }),
        expiresAt: expiresAt.toISOString(),
        scopes,
      });
      logGhlOAuth("token_storage_succeeded", { tenantId, locationId });

      logGhlOAuth("audit_event_started", { tenantId, locationId });
      await persistAuditEvent({
        organizationId: tenantId,
        source: "gohighlevel",
        eventType: "oauth.connected",
        locationId: locationId || null,
        metadata: { companyId, userType, scopes },
      });
      logGhlOAuth("audit_event_succeeded", { tenantId, locationId });

      logGhlOAuth("callback_success_page_started", { tenantId, locationId });
      renderSuccessPage(res, locationId);
    } catch (err) {
      logGhlOAuthError("callback_failed", err, { path: req.path });
      renderErrorPage(res, 400, err instanceof GhlOAuthRequestError ? err.message : "GoHighLevel connection could not be completed.");
    }
  };

  app.get(APPROVED_GHL_CALLBACK_PATH, handleGhlOAuthCallback);
  app.get("/api/ghl/callback", handleGhlOAuthCallback);

  /**
   * GET /api/ghl/status
   * Returns the GHL connection status for the current tenant.
   * Used by the ConnectGHL page to show live connection state.
   */
  app.get("/api/ghl/status", async (req: Request, res: Response) => {
    try {
      const requestedLocation = getQueryParam(req, "locationId");
      const context = await resolveGhlConnectSessionContext(req, requestedLocation, false);
      const requestedTenant = getQueryParam(req, "tenantId");
      if (requestedTenant && requestedTenant !== context.organizationId) {
        throw new GhlOAuthRequestError(403, "The requested organization is not authorized.");
      }

      const token = await getGhlToken(context.organizationId);
      if (!token || !token.isActive || token.locationId !== context.locationId) {
        res.status(200).json({
          connected: false,
          provider: "gohighlevel",
          locationId: context.locationId,
          revoked: Boolean(token && !token.isActive),
        });
        return;
      }

      res.status(200).json({
        connected: true,
        provider: "gohighlevel",
        locationId: context.locationId,
        connectedAt: token.connectedAt,
        expiresAt: token.expiresAt,
        revoked: false,
        scopes: token.scope?.split(/[,\s]+/).filter(Boolean) ?? [],
      });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });
}

async function resolveGhlConnectSessionContext(
  req: Request,
  locationId: string | undefined,
  requireOwner = true,
): Promise<GhlConnectSessionContext> {
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;

  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    throw new GhlOAuthRequestError(401, "Authentication is required before connecting GoHighLevel.");
  }

  const organizationContext = await resolveOrganizationAuthorizationContext(user, locationId);

  if (
    user.role === "admin"
    && (!organizationContext || organizationContext.role !== "ORGANIZATION_OWNER")
  ) {
    logGhlOAuth("start.denied", { userId: user.id, role: "PLATFORM_ADMIN", reason: "support_context_required" });
    throw new GhlOAuthRequestError(403, "Platform administrators require an approved audited support context.");
  }

  if (!organizationContext) {
    throw new GhlOAuthRequestError(403, "No active EEOS organization and location are available for this user.");
  }

  if (requireOwner && organizationContext.role !== "ORGANIZATION_OWNER") {
    const role = organizationContext.role;
    logGhlOAuth("start.denied", {
      userId: user.id,
      organizationId: organizationContext.organizationId,
      locationId: organizationContext.selectedLocationId,
      role,
      reason: "role_not_allowed",
    });
    await persistAuditEvent({
      organizationId: organizationContext.organizationId!,
      source: "gohighlevel",
      eventType: "oauth.start.denied",
      locationId: organizationContext.selectedLocationId,
      metadata: { userId: String(user.id), role, reason: "role_not_allowed" },
    });
    throw new GhlOAuthRequestError(403, "Organization owner access is required to connect GoHighLevel.");
  }

  return {
    userId: user.id,
    userName: user.name || "EEOS user",
    userEmail: user.email || "Email unavailable",
    userRole: organizationContext.role,
    organizationId: organizationContext.organizationId!,
    organizationName: organizationContext.organizationName!,
    membershipId: Number(organizationContext.membershipId),
    locationId: organizationContext.selectedLocationId,
    locationName: organizationContext.selectedLocationName,
  };
}

class GhlOAuthRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "GhlOAuthRequestError";
  }
}

function sendOAuthStartError(res: Response, error: unknown) {
  const statusCode = error instanceof GhlOAuthRequestError ? error.statusCode : 500;
  const message = error instanceof GhlOAuthRequestError ? error.message : "GoHighLevel OAuth could not be started.";

  logGhlOAuthError("start.failed", error, { statusCode });
  res.status(statusCode).json({
    error: statusCode === 401 ? "unauthorized" : statusCode === 403 ? "forbidden" : "oauth_start_failed",
    message,
  });
}

function ensureCsrfCookie(req: Request, res: Response) {
  const secure = isSecureRequest(req);
  res.cookie(EEOS_CSRF_COOKIE, randomBytes(32).toString("base64url"), {
    httpOnly: false,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 10 * 60 * 1000,
  });
}

function validateCsrf(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const cookieToken = cookies[EEOS_CSRF_COOKIE];
  const headerToken = req.header("x-eeos-csrf-token");

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    throw new GhlOAuthRequestError(403, "A valid EEOS CSRF token is required before connecting GoHighLevel.");
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") {
    return true;
  }

  const forwardedProto = req.header("x-forwarded-proto");

  return Boolean(forwardedProto?.split(",").some((proto) => proto.trim().toLowerCase() === "https"));
}
