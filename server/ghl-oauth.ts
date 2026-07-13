/**
 * GoHighLevel OAuth Flow
 * GET /api/ghl/auth      — generates GHL authorization URL and redirects
 * GET /api/ghl/callback  — exchanges auth code for tokens, stores in DB
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every token stored here feeds the IE pipeline with accurate, fresh data.
 */

import { createCipheriv, createHash, randomBytes } from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { upsertGhlToken, getGhlToken } from "./db";
import { consumeOAuthState, persistAuditEvent, persistOAuthState, upsertGhlTokenRecord } from "./db/runtimePersistence";

const GHL_AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const APPROVED_GHL_CALLBACK_PATH = "/api/integrations/eea/oauth/callback";
const APPROVED_GHL_CALLBACK_URL = "https://eeos-platform-production.up.railway.app/api/integrations/eea/oauth/callback";

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

/** Build the GHL OAuth authorization URL */
function buildGhlAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: getApprovedRedirectUri(),
    client_id: ENV.ghlClientId,
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
    client_id: ENV.ghlClientId,
    client_secret: ENV.ghlClientSecret,
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
  return ENV.ghlRedirectUri || APPROVED_GHL_CALLBACK_URL;
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

function decodeStatePayload(state: string) {
  const stateBody = state.includes(".") ? state.slice(0, state.indexOf(".")) : state;
  const decoded = JSON.parse(Buffer.from(stateBody, "base64url").toString()) as Record<string, unknown>;

  return {
    tenantId: typeof decoded.tenantId === "string" ? decoded.tenantId : "unknown",
    nonce: typeof decoded.nonce === "string" ? decoded.nonce : undefined,
  };
}

async function validateOAuthState(state: string) {
  const payload = decodeStatePayload(state);
  const consumed = await consumeOAuthState(state);

  if (!consumed) {
    throw new Error("GoHighLevel OAuth state is expired, missing, or already used.");
  }

  return payload;
}

function renderSuccessPage(res: Response, locationId: string) {
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>EEOS GoHighLevel Connected</title></head>
  <body>
    <main style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px;">
      <h1>EEOS is now connected to GoHighLevel.</h1>
      ${locationId ? `<p>Connected location: ${escapeHtml(locationId)}</p>` : ""}
    </main>
  </body>
</html>`);
}

function renderErrorPage(res: Response, status: number, message: string) {
  res.status(status).send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>EEOS GoHighLevel Connection Error</title></head>
  <body>
    <main style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px;">
      <h1>GoHighLevel connection failed.</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>`);
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
      client_id: ENV.ghlClientId,
      client_secret: ENV.ghlClientSecret,
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
  /**
   * GET /api/ghl/auth
   * Generates GHL OAuth authorization URL and redirects the browser to it.
   * The tenantId (user's openId) is encoded in the state parameter.
   */
  app.get("/api/ghl/auth", async (req: Request, res: Response) => {
    if (!ENV.ghlClientId) {
      res.status(503).json({ error: "GHL integration not configured" });
      return;
    }

    // Use user session or generate a state token
    const tenantId = (req as Request & { user?: { openId?: string } }).user?.openId
      || getQueryParam(req, "tenantId")
      || "anonymous";

    const state = Buffer.from(JSON.stringify({
      tenantId,
      nonce: Math.random().toString(36).slice(2),
      ts: Date.now(),
    })).toString("base64url");

    await persistOAuthState(state, { tenantId }, new Date(Date.now() + 10 * 60_000));

    const authUrl = buildGhlAuthUrl(state);
    console.log(`[GHL] Redirecting tenant ${tenantId} to GHL OAuth`);
    res.redirect(302, authUrl);
  });

  /**
   * GET /api/ghl/callback
   * GHL redirects here after user authorizes. Exchanges code for tokens
   * and stores them in the ghl_tokens table.
   */
  const handleGhlOAuthCallback = async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");

    logGhlOAuth("callback_received", {
      path: req.path,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasError: Boolean(error),
    });

    if (error) {
      logGhlOAuth("callback_failed", { reason: "provider_error", error, errorDescription });
      renderErrorPage(res, 400, errorDescription || error);
      return;
    }

    if (!code || !state) {
      logGhlOAuth("callback_failed", { reason: "missing_params" });
      renderErrorPage(res, 400, "Missing GoHighLevel OAuth code or state.");
      return;
    }

    try {
      const statePayload = await validateOAuthState(state);
      const tenantId = statePayload.tenantId;
      logGhlOAuth("state_validated", { tenantId });

      const redirectUri = getApprovedRedirectUri();
      logGhlOAuth("token_exchange_started", { tenantId, redirectUri });
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

      if (!locationId) {
        throw new Error("GoHighLevel token response did not include a location ID.");
      }

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

      await persistAuditEvent({
        organizationId: tenantId,
        source: "gohighlevel",
        eventType: "oauth.connected",
        locationId: locationId || null,
        metadata: { companyId, userType, scopes },
      });

      logGhlOAuth("token_storage_succeeded", { tenantId, locationId: locationId || null });
      renderSuccessPage(res, locationId);
    } catch (err) {
      logGhlOAuthError("callback_failed", err, { path: req.path });
      renderErrorPage(res, 400, err instanceof Error ? err.message : "Token exchange failed.");
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
    const tenantId = getQueryParam(req, "tenantId");
    if (!tenantId) {
      res.json({ connected: false, reason: "no_tenant" });
      return;
    }

    const token = await getGhlToken(tenantId);
    if (!token || !token.isActive) {
      res.json({ connected: false, reason: "not_connected" });
      return;
    }

    const isExpired = token.expiresAt < new Date();
    res.json({
      connected: true,
      locationId: token.locationId,
      companyId: token.companyId,
      isExpired,
      expiresAt: token.expiresAt,
      webhookRegistered: token.webhookRegistered,
      connectedAt: token.connectedAt,
    });
  });
}
