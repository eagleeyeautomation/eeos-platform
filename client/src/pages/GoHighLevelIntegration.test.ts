import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getGhlConnectionPresentation,
  loadGhlOperationsSnapshot,
  loadGhlConnectionStatus,
  resolveSelectedOwnerLocation,
  verifyGhlLocation,
} from "./GoHighLevelIntegration";

describe("GoHighLevel owner connection status", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the explicitly selected authorized location for the OAuth connection flow", () => {
    const locations = [
      {
        organization: { id: "1", name: "PRN Staffers Inc." },
        provider: "gohighlevel",
        location: { id: "loc-sc", name: "South Carolina" },
        connection: { connected: true, lastVerifiedAt: null },
        snapshot: { status: "complete" as const, generatedAt: null },
      },
      {
        organization: { id: "1", name: "PRN Staffers Inc." },
        provider: "gohighlevel",
        location: { id: "loc-de", name: "Delaware" },
        connection: { connected: false, lastVerifiedAt: null },
        snapshot: { status: "not_available" as const, generatedAt: null },
      },
    ];

    expect(resolveSelectedOwnerLocation(
      locations,
      "1:gohighlevel:loc-de",
    )?.location).toEqual({ id: "loc-de", name: "Delaware" });
  });

  it("loads the exact organization and South Carolina status with session credentials and no cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        connected: true,
        provider: "gohighlevel",
        organizationId: "1",
        maskedLocationId: "rJH8…QeuZ",
        tokenExpiresAt: "2026-07-29T18:00:00.000Z",
        tokenExpired: false,
        refreshAvailable: true,
        connectedAt: "2026-07-28T18:00:00.000Z",
        lastVerifiedAt: "2026-07-29T12:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadGhlConnectionStatus({
      organizationId: "1",
      locationId: "rJH8XytyAfEQSoOTQeuZ",
    })).resolves.toMatchObject({
      connected: true,
      organizationId: "1",
      maskedLocationId: "rJH8…QeuZ",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ghl/status?tenantId=1&locationId=rJH8XytyAfEQSoOTQeuZ",
      {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    expect(JSON.stringify(await (await fetchMock.mock.results[0].value).json())).not.toMatch(
      /accessToken|refreshToken|clientSecret|vault/i,
    );
    expect(getGhlConnectionPresentation({
      connected: true,
      provider: "gohighlevel",
      organizationId: "1",
      maskedLocationId: "rJH8…QeuZ",
      tokenExpiresAt: "2026-07-29T18:00:00.000Z",
      tokenExpired: false,
      refreshAvailable: true,
      connectedAt: "2026-07-28T18:00:00.000Z",
      lastVerifiedAt: "2026-07-29T12:00:00.000Z",
    }, "South Carolina")).toEqual({
      label: "South Carolina Connected",
      showConnect: false,
    });
  });

  it("performs only the protected minimal location identity read", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        provider: "gohighlevel",
        organizationId: "1",
        maskedLocationId: "rJH8…QeuZ",
        locationName: "South Carolina",
        accountContext: "location",
        verifiedAt: "2026-07-29T12:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyGhlLocation({
      organizationId: "1",
      locationId: "rJH8XytyAfEQSoOTQeuZ",
    })).resolves.toMatchObject({
      success: true,
      locationName: "South Carolina",
      maskedLocationId: "rJH8…QeuZ",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ghl/verify-location?tenantId=1&locationId=rJH8XytyAfEQSoOTQeuZ",
      {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("requests a protected no-cache aggregate snapshot without provider credentials", async () => {
    const response = {
      organizationId: "1",
      organizationName: "PRN Staffers Inc.",
      location: { name: "PRN Staffers CSC", maskedProviderLocationId: "rJH8…QeuZ" },
      provider: "gohighlevel",
      connection: { connected: true, healthy: true },
      contacts: { total: 9, createdLast7Days: 1, createdLast30Days: 3 },
      opportunities: { openTotal: 2, createdLast7Days: 0, createdLast30Days: 1, byStage: [] },
      generatedAt: "2026-07-29T12:00:00.000Z",
      partial: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => response });
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadGhlOperationsSnapshot({
      organizationId: "1",
      organization: "PRN Staffers Inc.",
      role: "ORGANIZATION_OWNER",
      location: "PRN Staffers CSC",
      locationId: "rJH8XytyAfEQSoOTQeuZ",
      csrfToken: "session-bound-csrf",
    })).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ghl/operations-snapshot?organizationId=1&locationId=rJH8XytyAfEQSoOTQeuZ",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: expect.objectContaining({ "x-eeos-csrf-token": "session-bound-csrf" }),
      }),
    );
    expect(JSON.stringify(response)).not.toMatch(/accessToken|refreshToken|email|phone|contactId/i);
  });

  it("rejects provider failures instead of presenting false zero metrics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "provider_unavailable" }),
    }));
    await expect(loadGhlOperationsSnapshot({
      organizationId: "1",
      organization: "PRN Staffers Inc.",
      role: "ORGANIZATION_OWNER",
      location: "PRN Staffers CSC",
      locationId: "rJH8XytyAfEQSoOTQeuZ",
      csrfToken: "session-bound-csrf",
    })).rejects.toThrow("Provider unavailable");
  });
});
