import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readGhlConnectionRecord, upsertGhlTokenRecord } from "./db/runtimePersistence";
import {
  decryptGhlTokenPayload,
  encryptGhlTokenPayload,
  getValidGhlToken,
  loadGhlConnection,
  safeGhlConnectionStatus,
  storeGhlConnectionToken,
  verifyGhlLocationIdentity,
  type GhlTokenPayload,
} from "./ghl-token-store";

vi.mock("./db/runtimePersistence", () => ({
  readGhlConnectionRecord: vi.fn(),
  upsertGhlTokenRecord: vi.fn(),
}));

const readRecordMock = vi.mocked(readGhlConnectionRecord);
const upsertRecordMock = vi.mocked(upsertGhlTokenRecord);

const payload = (overrides: Partial<GhlTokenPayload> = {}): GhlTokenPayload => ({
  accessToken: "access-secret",
  refreshToken: "refresh-secret",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  scopes: ["locations.readonly"],
  locationId: "location-south-carolina",
  companyId: "company-private",
  userType: "Location",
  ...overrides,
});

function record(token = payload()) {
  return {
    organizationId: "100",
    provider: "gohighlevel",
    operationalDivisionId: "location-south-carolina",
    locationId: "location-south-carolina",
    encryptedTokenPayload: encryptGhlTokenPayload(token),
    tokenExpiresAt: token.expiresAt,
    scopes: token.scopes,
    connectedAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
  };
}

describe("authoritative GoHighLevel PostgreSQL token store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EEOS_TOKEN_VAULT_KEY = "test-only-vault-key-with-enough-entropy";
    process.env.GHL_CLIENT_ID = "authorized-client-id";
    process.env.GHL_CLIENT_SECRET = "client-secret";
  });

  afterEach(() => {
    delete process.env.EEOS_TOKEN_VAULT_KEY;
    delete process.env.GHL_CLIENT_ID;
    delete process.env.GHL_CLIENT_SECRET;
    vi.unstubAllGlobals();
  });

  it("loads the exact PostgreSQL organization/provider/location binding", async () => {
    readRecordMock.mockResolvedValue(record());
    await expect(loadGhlConnection("100", "location-south-carolina")).resolves.toMatchObject({
      organizationId: "100",
      provider: "gohighlevel",
      locationId: "location-south-carolina",
    });
    expect(readRecordMock).toHaveBeenCalledWith("100", "gohighlevel", "location-south-carolina");
  });

  it("rejects unsupported providers and returned binding mismatches", async () => {
    await expect(loadGhlConnection("100", "location-south-carolina", "other")).rejects.toThrow("Unsupported");
    readRecordMock.mockResolvedValue({ ...record(), organizationId: "999" });
    await expect(loadGhlConnection("100", "location-south-carolina")).rejects.toThrow("binding mismatch");
  });

  it("encrypts at rest, decrypts only in memory, and rejects location mismatches", async () => {
    const encrypted = encryptGhlTokenPayload(payload());
    expect(encrypted).not.toContain("access-secret");
    expect(encrypted).not.toContain("refresh-secret");
    expect(decryptGhlTokenPayload(encrypted)).toMatchObject({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
    });
    await expect(storeGhlConnectionToken({
      organizationId: "100",
      operationalDivisionId: "location-south-carolina",
      locationId: "location-south-carolina",
      payload: payload({ locationId: "other-location" }),
    })).rejects.toThrow("location binding mismatch");
  });

  it("returns safe connection metadata without tokens, keys, scopes, or raw location IDs", async () => {
    readRecordMock.mockResolvedValue(record());
    const status = await safeGhlConnectionStatus("100", "location-south-carolina");
    expect(status).toMatchObject({
      connected: true,
      provider: "gohighlevel",
      organizationId: "100",
      maskedLocationId: "loca…lina",
      refreshAvailable: true,
    });
    const serialized = JSON.stringify(status);
    expect(serialized).not.toMatch(/access-secret|refresh-secret|company-private|locations\.readonly|EEOS_TOKEN_VAULT_KEY/);
    expect(serialized).not.toContain("location-south-carolina");
  });

  it("reuses an unexpired token without a network request or write", async () => {
    readRecordMock.mockResolvedValue(record());
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getValidGhlToken("100", "location-south-carolina")).resolves.toMatchObject({
      accessToken: "access-secret",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsertRecordMock).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refreshes and atomically persists rotated encrypted tokens", async () => {
    readRecordMock.mockResolvedValue(record(payload({ expiresAt: new Date(Date.now() - 1_000).toISOString() })));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "rotated-access",
        refresh_token: "rotated-refresh",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "locations.readonly",
        locationId: "location-south-carolina",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      getValidGhlToken("100", "location-south-carolina"),
      getValidGhlToken("100", "location-south-carolina"),
    ]);
    expect(first.accessToken).toBe("rotated-access");
    expect(second.accessToken).toBe("rotated-access");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(upsertRecordMock).toHaveBeenCalledOnce();
    const stored = upsertRecordMock.mock.calls[0][0];
    expect(stored.encryptedPayload).not.toMatch(/rotated-access|rotated-refresh/);
    expect(decryptGhlTokenPayload(stored.encryptedPayload)).toMatchObject({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      locationId: "location-south-carolina",
    });
  });

  it("fails closed on refresh failure without overwriting the usable record or logging secrets", async () => {
    readRecordMock.mockResolvedValue(record(payload({ expiresAt: new Date(Date.now() - 1_000).toISOString() })));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);
    await expect(getValidGhlToken("100", "location-south-carolina")).rejects.toThrow("HTTP 401");
    expect(upsertRecordMock).not.toHaveBeenCalled();
    expect(JSON.stringify([...errorSpy.mock.calls, ...logSpy.mock.calls])).not.toMatch(/access-secret|refresh-secret|client-secret/);
  });

  it("performs one exact read-only location request and returns only minimal identity", async () => {
    readRecordMock.mockResolvedValue(record());
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        location: {
          id: "location-south-carolina",
          name: "South Carolina",
          companyId: "company-private",
          address: "must-not-return",
          email: "must-not-return@example.com",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await verifyGhlLocationIdentity("100", "location-south-carolina");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/locations/location-south-carolina",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toMatchObject({
      provider: "gohighlevel",
      organizationId: "100",
      maskedLocationId: "loca…lina",
      locationName: "South Carolina",
      accountContext: "location",
    });
    expect(JSON.stringify(result)).not.toMatch(/company-private|must-not-return|access-secret|refresh-secret/);
    expect(upsertRecordMock).not.toHaveBeenCalled();
  });

  it("rejects a cross-location provider response", async () => {
    readRecordMock.mockResolvedValue(record());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ location: { id: "location-delaware", name: "Delaware" } }),
    }));
    await expect(verifyGhlLocationIdentity("100", "location-south-carolina")).rejects.toThrow("cross-location");
  });
});
