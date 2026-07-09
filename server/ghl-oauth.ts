/**
 * GoHighLevel OAuth Flow
 * GET /api/ghl/auth      — generates GHL authorization URL and redirects
 * GET /api/ghl/callback  — exchanges auth code for tokens, stores in DB
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 * Every token stored here feeds the IE pipeline with accurate, fresh data.
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { upsertGhlToken, getGhlToken } from "./db";

const GHL_AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Build the GHL OAuth authorization URL */
function buildGhlAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: ENV.ghlRedirectUri || `${process.env.VITE_FRONTEND_FORGE_API_URL || ""}/api/ghl/callback`,
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
    companyId?: string;
    userId?: string;
  }>;
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
  app.get("/api/ghl/auth", (req: Request, res: Response) => {
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

    const authUrl = buildGhlAuthUrl(state);
    console.log(`[GHL] Redirecting tenant ${tenantId} to GHL OAuth`);
    res.redirect(302, authUrl);
  });

  /**
   * GET /api/ghl/callback
   * GHL redirects here after user authorizes. Exchanges code for tokens
   * and stores them in the ghl_tokens table.
   */
  app.get("/api/ghl/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.warn(`[GHL] OAuth denied: ${error}`);
      res.redirect(302, `/oauth-failure?provider=gohighlevel&error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(302, `/oauth-failure?provider=gohighlevel&error=missing_params`);
      return;
    }

    try {
      // Decode state to get tenantId
      let tenantId = "unknown";
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        tenantId = decoded.tenantId || "unknown";
      } catch {
        console.warn("[GHL] Could not decode state, using fallback tenantId");
      }

      const redirectUri = ENV.ghlRedirectUri || `${req.protocol}://${req.get("host")}/api/ghl/callback`;
      const tokenData = await exchangeCodeForTokens(code, redirectUri);

      const expiresAt = new Date(Date.now() + (tokenData.expires_in - 300) * 1000);

      await upsertGhlToken({
        tenantId,
        locationId: tokenData.locationId,
        companyId: tokenData.companyId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || "Bearer",
        scope: tokenData.scope,
        expiresAt,
        lastRefreshedAt: new Date(),
        refreshFailCount: 0,
        isActive: true,
        connectedAt: new Date(),
      });

      console.log(`[GHL] OAuth complete for tenant ${tenantId}, location ${tokenData.locationId}`);
      res.redirect(302, `/oauth-success?provider=gohighlevel&locationId=${tokenData.locationId || ""}`);
    } catch (err) {
      console.error("[GHL] OAuth callback error:", err);
      res.redirect(302, `/oauth-failure?provider=gohighlevel&error=token_exchange_failed`);
    }
  });

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
