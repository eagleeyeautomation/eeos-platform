/**
 * GoHighLevel OAuth Flow
 * GET /api/ghl/auth      — generates GHL authorization URL and redirects
 * GET /api/ghl/callback  — exchanges auth code for tokens, stores in DB
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every token stored here feeds the IE pipeline with accurate, fresh data.
 */

import { randomBytes } from "crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { hasValidSessionCsrf, issueSessionCsrfToken } from "./_core/csrf";
import { sdk } from "./_core/sdk";
import {
  listOwnerOrganizationLocations,
  resolveOrganizationAuthorizationContext,
} from "./authorization";
import {
  createVerifiedGhlSubaccount,
  deleteVerifiedGhlSubaccount,
  getAllSubaccountsByMembership,
  getSubaccountByGhlLocationId,
} from "./db";
import {
  consumeOAuthState,
  persistAuditEvent,
  persistOAuthState,
  readLatestCompletedSnapshot,
  readLatestSnapshotHistory,
} from "./db/runtimePersistence";
import {
  safeGhlConnectionStatus,
  maskGhlLocationId,
  storeGhlConnectionToken,
  storeGhlConnectionTokenWithAudit,
  verifyGhlLocationIdentity,
  verifyGhlLocationWithAccessToken,
} from "./ghl-token-store";
import {
  buildGhlOperationsSnapshot,
  GhlSnapshotError,
} from "./ghl-operations-snapshot";

const GHL_AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const EEOS_OAUTH_PREFLIGHT_HEADER = "x-eeos-oauth-preflight";
const EEOS_OAUTH_PREFLIGHT_VALUE = "verify";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const APPROVED_GHL_CALLBACK_PATH = "/api/integrations/eea/oauth/callback";
const APPROVED_GHL_CALLBACK_URL = "https://eeos-platform-production.up.railway.app/api/integrations/eea/oauth/callback";

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

  if (state.startsWith("eeos_onboarding_")) {
    const consumed = await consumeOAuthState(state);
    if (
      !consumed
      || consumed.payload.mode !== "new_location"
      || consumed.payload.provider !== "gohighlevel"
      || consumed.payload.tenantId !== consumed.organizationId
    ) {
      throw new GhlOAuthRequestError(400, "GoHighLevel OAuth state is expired, missing, or already used.");
    }
    return {
      tenantId: consumed.organizationId,
      locationId: "",
      onboarding: consumed.payload as Record<string, string>,
    };
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

  return { ...payload, onboarding: null };
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

/** Register GHL OAuth routes on the Express app */
export function registerGhlOAuthRoutes(app: Express) {
  app.get("/api/location-management/locations", async (req: Request, res: Response) => {
    try {
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        throw new GhlOAuthRequestError(401, "Authentication is required.");
      }

      const locations = await listOwnerOrganizationLocations(user);
      if (locations.length === 0) {
        throw new GhlOAuthRequestError(403, "An active organization-owner location membership is required.");
      }
      const [statuses, snapshotHistory] = await Promise.all([
        Promise.all(locations.map((location) =>
          safeGhlConnectionStatus(location.organizationId, location.locationId)
        )),
        readLatestSnapshotHistory(locations),
      ]);

      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .set("Pragma", "no-cache")
        .status(200)
        .json({
          locations: locations.map((location, index) => {
            const connection = statuses[index];
            const snapshot = snapshotHistory.get(`${location.organizationId}:${location.locationId}`);
            return {
              organization: {
                id: location.organizationId,
                name: location.organizationName,
              },
              provider: "gohighlevel",
              location: {
                id: location.locationId,
                name: location.locationName,
                city: location.city,
                state: location.state,
              },
              connection: {
                connected: connection.connected,
                lastVerifiedAt: connection.lastVerifiedAt,
              },
              snapshot: snapshot
                ? {
                    status: snapshot.partial ? "partial" : "complete",
                    generatedAt: snapshot.generatedAt,
                  }
                : { status: "not_available", generatedAt: null },
            };
          }),
        });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.post("/api/location-management/locations", async (req: Request, res: Response) => {
    try {
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        throw new GhlOAuthRequestError(401, "Authentication is required.");
      }
      validateCsrf(req);

      const body = parseNewLocationOnboardingBody(req.body);
      const ownerLocations = await listOwnerOrganizationLocations(user);
      const authorizedOrganizationLocations = ownerLocations.filter(
        (location) => location.organizationId === body.organizationId,
      );
      const authorizedMemberships = new Set(
        authorizedOrganizationLocations.map((location) => location.membershipId),
      );

      if (authorizedMemberships.size !== 1) {
        throw new GhlOAuthRequestError(
          403,
          "An active organization-owner membership is required for the requested organization.",
        );
      }

      const membershipId = Number(authorizedOrganizationLocations[0].membershipId);
      if (!Number.isSafeInteger(membershipId) || membershipId <= 0) {
        throw new GhlOAuthRequestError(403, "The organization membership is invalid.");
      }
      const existingLocations = await getAllSubaccountsByMembership(membershipId);
      if (existingLocations.some((location) =>
        location.name === body.name && location.city === body.city && location.state === body.state
      )) {
        throw new GhlOAuthRequestError(409, "This operational location already exists.");
      }

      const state = `eeos_onboarding_${randomBytes(32).toString("base64url")}`;
      const stateExpiresAt = new Date(Date.now() + 10 * 60_000);
      await persistOAuthState(state, {
        mode: "new_location",
        provider: "gohighlevel",
        tenantId: body.organizationId,
        membershipId: String(membershipId),
        userId: String(user.id),
        name: body.name,
        city: body.city,
        state: body.state,
      }, stateExpiresAt);
      await persistAuditEvent({
        organizationId: body.organizationId,
        source: "gohighlevel",
        eventType: "oauth.onboarding.start.allowed",
        metadata: { userId: String(user.id), membershipId: String(membershipId) },
      });

      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .set("Pragma", "no-cache")
        .status(200)
        .json({
          success: true,
          organization: {
            id: body.organizationId,
            name: authorizedOrganizationLocations[0].organizationName,
          },
          provider: "gohighlevel",
          location: { name: body.name, city: body.city, state: body.state },
          authorizationUrl: buildGhlAuthUrl(state),
          state: { expiresAt: stateExpiresAt.toISOString() },
        });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.get("/api/integrations/gohighlevel/session-context", async (req: Request, res: Response) => {
    try {
      const context = await resolveGhlConnectSessionContext(req, getQueryParam(req, "locationId"));
      const csrfToken = issueSessionCsrfToken(req, res);
      if (!csrfToken) {
        throw new GhlOAuthRequestError(403, "A valid EEOS CSRF token is required before connecting GoHighLevel.");
      }

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
        csrfToken,
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

      const existingConnection = await safeGhlConnectionStatus(context.organizationId, context.locationId);
      if (existingConnection.connected) {
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
      if (!stateValidation.onboarding && locationId !== stateValidation.locationId) {
        throw new Error("GoHighLevel OAuth location does not match the authorized state.");
      }

      let createdSubaccountId: number | null = null;
      if (stateValidation.onboarding) {
        const onboarding = stateValidation.onboarding;
        const membershipId = Number(onboarding.membershipId);
        if (!Number.isSafeInteger(membershipId) || membershipId <= 0) {
          throw new Error("GoHighLevel onboarding membership binding is invalid.");
        }
        const [existingBinding, existingLocations, verifiedLocation] = await Promise.all([
          getSubaccountByGhlLocationId(locationId),
          getAllSubaccountsByMembership(membershipId),
          verifyGhlLocationWithAccessToken(locationId, tokenData.access_token),
        ]);
        if (existingBinding) {
          throw new GhlOAuthRequestError(409, "This GoHighLevel location is already bound.");
        }
        if (existingLocations.some((existing) =>
          existing.name === onboarding.name
          && existing.city === onboarding.city
          && existing.state === onboarding.state
        )) {
          throw new GhlOAuthRequestError(409, "This operational location already exists.");
        }
        const created = await createVerifiedGhlSubaccount({
          membershipId,
          providerLocationId: verifiedLocation.id,
          name: onboarding.name,
          city: onboarding.city,
          state: onboarding.state,
        });
        if (!created.created) {
          throw new GhlOAuthRequestError(409, "This GoHighLevel location is already bound.");
        }
        createdSubaccountId = created.id;
      }

      logGhlOAuth("token_storage_started", { tenantId, locationId });
      try {
        const tokenInput = {
          organizationId: tenantId,
          operationalDivisionId: locationId,
          locationId,
          payload: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenType: tokenData.token_type || "Bearer",
            expiresAt: expiresAt.toISOString(),
            scopes,
            locationId,
            companyId,
            userType,
          },
        };
        const connectedAudit = {
          organizationId: tenantId,
          source: "gohighlevel",
          eventType: "oauth.connected",
          locationId,
          metadata: { companyId, userType, scopes, createdSubaccountId },
        };
        if (createdSubaccountId !== null) {
          await storeGhlConnectionTokenWithAudit(tokenInput, connectedAudit);
        } else {
          await storeGhlConnectionToken(tokenInput);
          await persistAuditEvent(connectedAudit);
        }
        logGhlOAuth("token_storage_succeeded", { tenantId, locationId });
      } catch (storageError) {
        if (createdSubaccountId !== null) {
          await deleteVerifiedGhlSubaccount(createdSubaccountId, locationId);
        }
        throw storageError;
      }
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

      res
        .set("Cache-Control", "no-store")
        .status(200)
        .json(await safeGhlConnectionStatus(context.organizationId, context.locationId));
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.get("/api/ghl/verify-location", async (req: Request, res: Response) => {
    try {
      const requestedLocation = getQueryParam(req, "locationId");
      const context = await resolveGhlConnectSessionContext(req, requestedLocation);
      const requestedTenant = getQueryParam(req, "tenantId");
      if (requestedTenant && requestedTenant !== context.organizationId) {
        throw new GhlOAuthRequestError(403, "The requested organization is not authorized.");
      }
      const verification = await verifyGhlLocationIdentity(context.organizationId, context.locationId);
      res
        .set("Cache-Control", "no-store")
        .status(200)
        .json({ success: true, ...verification });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.get("/api/ghl/operations-snapshot/latest", async (req: Request, res: Response) => {
    try {
      const requestedLocation = getQueryParam(req, "locationId");
      const context = await resolveGhlConnectSessionContext(req, requestedLocation);
      const requestedProvider = getQueryParam(req, "provider");
      if (requestedProvider && requestedProvider !== "gohighlevel") {
        throw new GhlOAuthRequestError(403, "The requested provider is not authorized for this snapshot route.");
      }
      const stored = await readLatestCompletedSnapshot(
        context.organizationId,
        context.locationId,
        "gohighlevel",
      );
      const location = {
        name: context.locationName,
        maskedProviderLocationId: maskGhlLocationId(context.locationId),
      };
      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .set("Pragma", "no-cache")
        .status(200)
        .json(stored
          ? {
              status: "available",
              snapshot: {
                organizationId: context.organizationId,
                organizationName: context.organizationName,
                location,
                provider: "gohighlevel",
                connection: { connected: true, healthy: true },
                contacts: {
                  total: stored.aggregate.contacts.total,
                  createdLast7Days: stored.aggregate.contacts.createdLast7Days,
                  createdLast30Days: stored.aggregate.contacts.createdLast30Days,
                },
                opportunities: {
                  openTotal: stored.aggregate.opportunities.openTotal,
                  createdLast7Days: stored.aggregate.opportunities.createdLast7Days,
                  createdLast30Days: stored.aggregate.opportunities.createdLast30Days,
                  byStage: stored.aggregate.opportunities.byStage.map((stage) => ({
                    pipelineIdentifier: stage.pipelineIdentifier,
                    pipelineName: stage.pipelineName,
                    stageIdentifier: stage.stageIdentifier,
                    stageName: stage.stageName,
                    count: stage.count,
                  })),
                },
                generatedAt: stored.generatedAt,
                partial: false,
              },
            }
          : {
              status: "not_available",
              provider: "gohighlevel",
              location,
              message: "No completed snapshot available",
            });
    } catch (error) {
      sendOAuthStartError(res, error);
    }
  });

  app.get("/api/ghl/operations-snapshot", (_req: Request, res: Response) => {
    res
      .set("Cache-Control", "no-store")
      .status(405)
      .json({ error: "method_not_allowed", message: "Use the protected snapshot refresh action." });
  });

  app.post("/api/ghl/operations-snapshot", async (req: Request, res: Response) => {
    try {
      validateCsrf(req);
      const requestedLocation = getQueryParam(req, "locationId");
      const context = await resolveGhlConnectSessionContext(req, requestedLocation);
      const requestedOrganization = getQueryParam(req, "organizationId");
      if (requestedOrganization && requestedOrganization !== context.organizationId) {
        throw new GhlOAuthRequestError(403, "The requested organization is not authorized.");
      }
      const requestedProvider = getQueryParam(req, "provider");
      if (requestedProvider && requestedProvider !== "gohighlevel") {
        throw new GhlOAuthRequestError(403, "The requested provider is not authorized for this snapshot route.");
      }

      const snapshot = await buildGhlOperationsSnapshot({
        organizationId: context.organizationId,
        organizationName: context.organizationName,
        locationId: context.locationId,
        locationName: context.locationName,
      });
      await persistAuditEvent({
        organizationId: context.organizationId,
        source: "gohighlevel",
        eventType: "operations.snapshot.read",
        locationId: context.locationId,
        metadata: {
          userId: String(context.userId),
          role: context.userRole,
          partial: snapshot.partial,
          provider: snapshot.provider,
          generatedAt: snapshot.generatedAt,
          aggregate: {
            contacts: snapshot.contacts,
            opportunities: {
              openTotal: snapshot.opportunities.openTotal,
              createdLast7Days: snapshot.opportunities.createdLast7Days,
              createdLast30Days: snapshot.opportunities.createdLast30Days,
              byStage: snapshot.opportunities.byStage,
            },
          },
        },
      });
      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .set("Pragma", "no-cache")
        .status(200)
        .json(snapshot);
    } catch (error) {
      const statusCode = error instanceof GhlSnapshotError
        ? error.code === "reauthorization_required" ? 401
          : error.code === "scope_missing" || error.code === "binding_mismatch" ? 403
            : 503
        : error instanceof GhlOAuthRequestError ? error.statusCode : 500;
      res
        .set("Cache-Control", "private, no-store, max-age=0")
        .set("Pragma", "no-cache")
        .status(statusCode)
        .json({
          error: error instanceof GhlSnapshotError ? error.code : statusCode === 401 ? "unauthorized" : "snapshot_failed",
          message: error instanceof Error ? redactSecrets(error.message) : "The snapshot could not be generated.",
        });
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

function parseNewLocationOnboardingBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new GhlOAuthRequestError(400, "Valid operational-location metadata is required.");
  }

  const record = body as Record<string, unknown>;
  if (record.provider !== "gohighlevel") {
    throw new GhlOAuthRequestError(400, "The provider must be gohighlevel.");
  }

  const organizationId = parseRequiredMetadataField(record.organizationId, "organizationId", 20);
  if (!/^[1-9]\d*$/.test(organizationId)) {
    throw new GhlOAuthRequestError(400, "A valid organizationId is required.");
  }

  if ("providerLocationId" in record || "locationId" in record) {
    throw new GhlOAuthRequestError(400, "Provider location IDs are supplied and verified by GoHighLevel.");
  }

  const metadata = {
    organizationId,
    name: parseRequiredMetadataField(record.name, "name", 256),
    city: parseRequiredMetadataField(record.city, "city", 128),
    state: parseRequiredMetadataField(record.state, "state", 64),
  };
  if (
    metadata.name !== "PRN Staffers FL"
    || metadata.city !== "Greensboro"
    || metadata.state !== "Florida"
  ) {
    throw new GhlOAuthRequestError(400, "Only the approved PRN Staffers Florida location may be onboarded.");
  }
  return metadata;
}

function parseRequiredMetadataField(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new GhlOAuthRequestError(400, `${field} is required.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new GhlOAuthRequestError(400, `${field} is invalid.`);
  }
  return normalized;
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

function validateCsrf(req: Request) {
  if (!hasValidSessionCsrf(req)) {
    throw new GhlOAuthRequestError(403, "A valid EEOS CSRF token is required before connecting GoHighLevel.");
  }
}
