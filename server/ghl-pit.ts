/**
 * EEOS — GoHighLevel Private Integration Token (PIT) Flow
 *
 * Mission Zero: Validate EEOS against live PRN Staffers operations
 * using Private Integration Tokens before the OAuth Marketplace App
 * is published.
 *
 * Architecture:
 *   - Each Subaccount (GHL location) has its own Private Integration Token
 *   - Tokens are stored encrypted in the ghl_tokens table
 *   - The tenantId is the GHL locationId (canonical subaccount identifier)
 *   - After Mission Zero succeeds, the same connection model is packaged
 *     into the official EEA OAuth Marketplace App
 *
 * Routes:
 *   POST /api/ghl/pit/connect   — validate and store a PIT for a subaccount
 *   POST /api/ghl/pit/verify    — verify a stored PIT is still valid
 *   DELETE /api/ghl/pit/disconnect — remove a PIT for a subaccount
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import type { Express, Request, Response } from "express";
import { upsertGhlToken, getGhlToken, upsertSubaccount } from "./db";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

interface PitConnectBody {
  /** The GHL location ID for this subaccount */
  locationId: string;
  /** The Private Integration Token from the GHL location settings */
  privateToken: string;
  /** Human-readable name for this subaccount, e.g. "Delaware" */
  subaccountName: string;
  /** The EEOS membership ID this subaccount belongs to */
  membershipId?: number;
}

/**
 * Validate a Private Integration Token by calling the GHL API.
 * Returns location details if valid, throws if invalid.
 */
async function validatePitToken(locationId: string, token: string): Promise<{
  id: string;
  name: string;
  companyId?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}> {
  const url = `${GHL_API_BASE}/locations/${locationId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error("Invalid token — GHL returned 401 Unauthorized. Check the Private Integration Token.");
    }
    if (response.status === 404) {
      throw new Error(`Location ${locationId} not found. Verify the Location ID.`);
    }
    throw new Error(`GHL API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as { location?: { id: string; name: string; companyId?: string; timezone?: string } };
  const location = data.location ?? (data as { id: string; name: string; companyId?: string; timezone?: string });

  if (!location?.id) {
    throw new Error("Unexpected GHL API response — could not extract location details.");
  }

  return location;
}

/** Register Private Integration Token routes on the Express app */
export function registerGhlPitRoutes(app: Express) {
  /**
   * POST /api/ghl/pit/connect
   * Validates a Private Integration Token and stores it for a subaccount.
   *
   * Body: { locationId, privateToken, subaccountName, membershipId? }
   *
   * This is the Mission Zero connection method. After OAuth Marketplace App
   * is published, this route remains available for admin/manual connections.
   */
  app.post("/api/ghl/pit/connect", async (req: Request, res: Response) => {
    const { locationId, privateToken, subaccountName, membershipId } = req.body as PitConnectBody;

    if (!locationId || !privateToken || !subaccountName) {
      res.status(400).json({
        success: false,
        error: "locationId, privateToken, and subaccountName are required",
      });
      return;
    }

    try {
      console.log(`[GHL PIT] Validating token for location ${locationId} (${subaccountName})`);

      // Validate the token against the GHL API
      const locationData = await validatePitToken(locationId, privateToken);

      // Store the token — PIT tokens don't expire but we set a far-future date
      // to keep the schema consistent. The refreshToken field stores the PIT itself
      // since PITs are long-lived and don't use the OAuth refresh flow.
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10); // 10 years

      await upsertGhlToken({
        tenantId: locationId,
        locationId,
        companyId: locationData.companyId,
        accessToken: privateToken,
        refreshToken: privateToken, // PIT is used directly as both access and refresh
        tokenType: "Bearer",
        scope: "private_integration",
        expiresAt: farFuture,
        lastRefreshedAt: new Date(),
        refreshFailCount: 0,
        isActive: true,
        webhookRegistered: false,
        connectedAt: new Date(),
      });

      // Upsert the subaccount record
      if (membershipId) {
        await upsertSubaccount({
          membershipId,
          ghlLocationId: locationId,
          ghlCompanyId: locationData.companyId,
          name: subaccountName,
          timezone: locationData.timezone ?? "America/New_York",
          isActive: true,
          ieEnabled: true,
          connectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`[GHL PIT] Connected: ${subaccountName} (${locationId})`);

      res.json({
        success: true,
        locationId,
        locationName: locationData.name,
        subaccountName,
        companyId: locationData.companyId,
        connectedAt: new Date().toISOString(),
        tokenType: "private_integration",
        message: `Successfully connected ${subaccountName} using Private Integration Token`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[GHL PIT] Connection failed for ${locationId}:`, message);
      res.status(400).json({
        success: false,
        error: message,
        locationId,
        subaccountName,
      });
    }
  });

  /**
   * POST /api/ghl/pit/verify
   * Verifies a stored PIT is still valid by calling the GHL API.
   * Used by the ConnectGHL page to show live connection health.
   */
  app.post("/api/ghl/pit/verify", async (req: Request, res: Response) => {
    const { locationId } = req.body as { locationId: string };

    if (!locationId) {
      res.status(400).json({ success: false, error: "locationId is required" });
      return;
    }

    try {
      const token = await getGhlToken(locationId);
      if (!token || !token.isActive) {
        res.json({ success: false, valid: false, reason: "not_connected" });
        return;
      }

      // Re-validate the stored token
      const locationData = await validatePitToken(locationId, token.accessToken);

      res.json({
        success: true,
        valid: true,
        locationId,
        locationName: locationData.name,
        companyId: locationData.companyId,
        connectedAt: token.connectedAt,
        tokenType: "private_integration",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[GHL PIT] Verify failed for ${locationId}:`, message);
      res.json({
        success: false,
        valid: false,
        reason: "token_invalid",
        error: message,
      });
    }
  });

  /**
   * DELETE /api/ghl/pit/disconnect
   * Deactivates a PIT connection for a subaccount.
   * Does NOT delete the record — marks isActive = false for audit trail.
   */
  app.delete("/api/ghl/pit/disconnect", async (req: Request, res: Response) => {
    const { locationId } = req.body as { locationId: string };

    if (!locationId) {
      res.status(400).json({ success: false, error: "locationId is required" });
      return;
    }

    try {
      const token = await getGhlToken(locationId);
      if (!token) {
        res.json({ success: true, message: "No connection found to disconnect" });
        return;
      }

      // Mark as inactive
      await upsertGhlToken({
        tenantId: locationId,
        locationId: token.locationId ?? locationId,
        companyId: token.companyId ?? undefined,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenType: token.tokenType ?? "Bearer",
        scope: token.scope ?? undefined,
        expiresAt: token.expiresAt,
        isActive: false,
        refreshFailCount: token.refreshFailCount ?? 0,
      });

      console.log(`[GHL PIT] Disconnected: ${locationId}`);
      res.json({ success: true, locationId, message: "Subaccount disconnected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[GHL PIT] Disconnect failed for ${locationId}:`, message);
      res.status(500).json({ success: false, error: message });
    }
  });

  /**
   * GET /api/ghl/pit/status/:locationId
   * Returns the connection status for a specific subaccount.
   */
  app.get("/api/ghl/pit/status/:locationId", async (req: Request, res: Response) => {
    const { locationId } = req.params;

    try {
      const token = await getGhlToken(locationId);
      if (!token || !token.isActive) {
        res.json({ connected: false, locationId });
        return;
      }

      res.json({
        connected: true,
        locationId,
        companyId: token.companyId,
        connectedAt: token.connectedAt,
        tokenType: "private_integration",
        webhookRegistered: token.webhookRegistered,
      });
    } catch (error) {
      res.status(500).json({ connected: false, error: "Status check failed" });
    }
  });
}
