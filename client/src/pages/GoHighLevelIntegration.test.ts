import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getGhlConnectionPresentation,
  loadGhlConnectionStatus,
  verifyGhlLocation,
} from "./GoHighLevelIntegration";

describe("GoHighLevel owner connection status", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
