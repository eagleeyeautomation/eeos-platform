import { describe, expect, it, vi } from "vitest";
import {
  assertSnapshotProviderMethod,
  buildGhlOperationsSnapshot,
  GHL_SNAPSHOT_OPERATION_CONTRACTS,
  GHL_SNAPSHOT_LIMITS,
  snapshotProviderGet,
} from "./ghl-operations-snapshot";

const input = {
  organizationId: "1",
  organizationName: "PRN Staffers Inc.",
  locationId: "rJH8XytyAfEQSoOTQeuZ",
  locationName: "PRN Staffers CSC",
};

const token = {
  accessToken: "provider-access-secret",
  refreshToken: "provider-refresh-secret",
  tokenType: "Bearer",
  expiresAt: "2027-01-01T00:00:00.000Z",
  scopes: ["contacts.readonly", "opportunities.readonly", "locations.readonly"],
  locationId: input.locationId,
};

function provider(path: string) {
  if (path.startsWith("/opportunities/pipelines")) {
    return Promise.resolve({
      pipelines: [{
        id: "pipeline-private-id",
        name: "Recruiting",
        locationId: input.locationId,
        stages: [{ id: "stage-private-id", name: "New" }],
      }],
    });
  }
  if (path.startsWith("/contacts/")) {
    return Promise.resolve({
      count: 1,
      contacts: [{
        id: "contact-private-id",
        locationId: input.locationId,
        dateAdded: "2026-07-28T00:00:00.000Z",
        name: "Private Person",
        phone: "555-0100",
        email: "private@example.com",
      }],
    });
  }
  return Promise.resolve({
    meta: { total: 1 },
    opportunities: [{
      id: "opportunity-private-id",
      name: "Private opportunity title",
      locationId: input.locationId,
      status: "open",
      pipelineId: "pipeline-private-id",
      pipelineStageId: "stage-private-id",
      createdAt: "2026-07-28T00:00:00.000Z",
    }],
  });
}

describe("controlled GoHighLevel operations snapshot", () => {
  it("aggregates only counts and safe pipeline metadata for the exact binding", async () => {
    const result = await buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet: provider,
      now: () => new Date("2026-07-29T00:00:00.000Z"),
    });
    expect(result).toMatchObject({
      organizationId: "1",
      organizationName: "PRN Staffers Inc.",
      location: { name: "PRN Staffers CSC", maskedProviderLocationId: "rJH8…QeuZ" },
      provider: "gohighlevel",
      connection: { connected: true, healthy: true },
      contacts: { total: 1, createdLast7Days: 1, createdLast30Days: 1 },
      opportunities: {
        openTotal: 1,
        createdLast7Days: 1,
        createdLast30Days: 1,
        byStage: [{
          pipelineIdentifier: expect.stringMatching(/^pipeline_[a-f0-9]{12}$/),
          pipelineName: "Recruiting",
          stageIdentifier: expect.stringMatching(/^stage_[a-f0-9]{12}$/),
          stageName: "New",
          count: 1,
        }],
      },
      partial: false,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(
      /Private Person|555-0100|private@example\.com|Private opportunity title|contact-private-id|opportunity-private-id|pipeline-private-id|stage-private-id|provider-access-secret|provider-refresh-secret/,
    );
  });

  it("loads the token for the exact PostgreSQL-backed organization and location", async () => {
    const getToken = vi.fn().mockResolvedValue(token);
    await buildGhlOperationsSnapshot(input, { getToken, providerGet: provider });
    expect(getToken).toHaveBeenCalledWith("1", input.locationId);
  });

  it("requires the existing read scopes before calling the provider", async () => {
    const providerGet = vi.fn();
    await expect(buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue({ ...token, scopes: ["contacts.readonly"] }),
      providerGet,
    })).rejects.toMatchObject({ code: "scope_missing" });
    expect(providerGet).not.toHaveBeenCalled();
  });

  it("rejects token and provider cross-location responses", async () => {
    await expect(buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue({ ...token, locationId: "other-location" }),
      providerGet: provider,
    })).rejects.toMatchObject({ code: "binding_mismatch" });

    await expect(buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet: async (path) => path.startsWith("/opportunities/pipelines")
        ? { pipelines: [] }
        : path.startsWith("/contacts/")
          ? { contacts: [{ id: "x", locationId: "other-location" }] }
          : { opportunities: [] },
    })).rejects.toMatchObject({ code: "binding_mismatch" });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects provider method %s", (method) => {
    expect(() => assertSnapshotProviderMethod(method)).toThrow("GET requests only");
  });

  it("permits only GET provider requests on the fixed origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ contacts: [] }),
    });
    await snapshotProviderGet("contacts-list", "/contacts/?locationId=safe", "secret", fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "https://services.leadconnectorhq.com" }),
      expect.objectContaining({ method: "GET" }),
    );
    await expect(snapshotProviderGet("contacts-list", "https://example.com/contacts", "secret", fetchMock))
      .rejects.toThrow("Unapproved");
  });

  it("bounds pagination and labels a truncated result partial", async () => {
    let contactPages = 0;
    const result = await buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet: async (path) => {
        if (path.startsWith("/opportunities/pipelines")) return { pipelines: [] };
        if (path.startsWith("/contacts/")) {
          contactPages += 1;
          return {
            count: 999,
            contacts: Array.from({ length: GHL_SNAPSHOT_LIMITS.pageSize }, (_, index) => ({
              id: `contact-${contactPages}-${index}`,
              locationId: input.locationId,
              dateAdded: "2020-01-01T00:00:00.000Z",
            })),
          };
        }
        return { opportunities: [] };
      },
    });
    expect(contactPages).toBe(GHL_SNAPSHOT_LIMITS.maxPages);
    expect(result.partial).toBe(true);
    expect(result.contacts.total).toBe(999);
  });

  it("deduplicates concurrent snapshot jobs for one organization and location", async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const providerGet = vi.fn(async (path: string) => {
      await barrier;
      return provider(path);
    });
    const first = buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet,
    });
    const second = buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet,
    });
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(providerGet).toHaveBeenCalledTimes(3);
  });

  it("retries bounded transient GET failures and respects Retry-After", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "0" }),
        json: async () => ({ error: "RateLimited", message: "Try again" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ count: 0 }) });
    await expect(snapshotProviderGet("contacts-list", "/contacts/?locationId=safe", "secret", fetchMock))
      .resolves.toEqual({ count: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])("does not retry authorization failure HTTP %s", async (status) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: new Headers(),
      json: async () => ({ error: "Unauthorized", message: "Authorization failed" }),
    });
    await expect(snapshotProviderGet("contacts-list", "/contacts/?locationId=safe", "secret", fetchMock))
      .rejects.toMatchObject({ code: "reauthorization_required" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("never invokes a provider write or starts synchronization", async () => {
    const providerGet = vi.fn(provider);
    await buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet,
    });
    expect(providerGet.mock.calls.every(([path]) =>
      path.startsWith("/contacts/")
      || path.startsWith("/opportunities/search")
      || path.startsWith("/opportunities/pipelines"))).toBe(true);
  });

  it("uses exact endpoint-specific paths, versions, authorization, and query contracts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });
    await snapshotProviderGet(
      "pipelines-list",
      "/opportunities/pipelines?locationId=location-safe",
      "provider-secret",
      fetchMock,
    );
    await snapshotProviderGet(
      "opportunities-search",
      "/opportunities/search?locationId=location-safe&status=open&limit=20",
      "provider-secret",
      fetchMock,
    );
    await snapshotProviderGet(
      "contacts-list",
      "/contacts/?locationId=location-safe&limit=20",
      "provider-secret",
      fetchMock,
    );
    expect(fetchMock.mock.calls.map(([url, init]) => ({
      path: (url as URL).pathname,
      query: (url as URL).search,
      version: (init as RequestInit).headers && ((init as RequestInit).headers as Record<string, string>).Version,
      authorization: (init as RequestInit).headers && ((init as RequestInit).headers as Record<string, string>).Authorization,
      method: (init as RequestInit).method,
    }))).toEqual([
      {
        path: "/opportunities/pipelines",
        query: "?locationId=location-safe",
        version: "v3",
        authorization: "Bearer provider-secret",
        method: "GET",
      },
      {
        path: "/opportunities/search",
        query: "?locationId=location-safe&status=open&limit=20",
        version: "v3",
        authorization: "Bearer provider-secret",
        method: "GET",
      },
      {
        path: "/contacts/",
        query: "?locationId=location-safe&limit=20",
        version: "2021-07-28",
        authorization: "Bearer provider-secret",
        method: "GET",
      },
    ]);
  });

  it("rejects mixed, unsupported, undefined, and empty request parameters", async () => {
    const fetchMock = vi.fn();
    await expect(snapshotProviderGet(
      "pipelines-list",
      "/opportunities/pipelines?locationId=safe&status=open",
      "secret",
      fetchMock,
    )).rejects.toThrow("Unsupported");
    await expect(snapshotProviderGet(
      "contacts-list",
      "/contacts/?locationId=safe&pipelineId=other",
      "secret",
      fetchMock,
    )).rejects.toThrow("Unsupported");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(GHL_SNAPSHOT_OPERATION_CONTRACTS["opportunities-search"].allowedQuery)
      .toEqual(new Set(["locationId", "status", "limit", "page", "startAfter", "startAfterId"]));
    expect(GHL_SNAPSHOT_OPERATION_CONTRACTS["opportunities-search"].allowedQuery)
      .not.toContain("location_id");
  });

  it("reconstructs opportunities pagination with only the documented cursor pair", async () => {
    const providerGet = vi.fn(async (path: string) => {
      if (path.startsWith("/opportunities/pipelines")) return { pipelines: [] };
      if (path.startsWith("/contacts/")) return { contacts: [] };
      if (path.includes("startAfter=")) return { opportunities: [] };
      return {
        opportunities: Array.from({ length: GHL_SNAPSHOT_LIMITS.pageSize }, (_, index) => ({
          id: `opportunity-${index}`,
          locationId: input.locationId,
          status: "open",
        })),
        meta: {
          nextPageUrl: `https://services.leadconnectorhq.com/opportunities/search?q=&location_id=${input.locationId}&pipeline_id=&startAfter=1625203104328&startAfterId=opaque-opportunity-id&limit=20&page=1`,
        },
      };
    });
    await buildGhlOperationsSnapshot(input, {
      getToken: vi.fn().mockResolvedValue(token),
      providerGet,
    });
    expect(providerGet).toHaveBeenCalledWith(
      `/opportunities/search?locationId=${input.locationId}&status=open&limit=20&startAfter=1625203104328&startAfterId=opaque-opportunity-id`,
      token.accessToken,
    );
    const paginatedPath = providerGet.mock.calls
      .map(([path]) => path)
      .find((path) => path.includes("startAfter="));
    expect(paginatedPath).not.toMatch(/[?&](?:q|location_id|pipeline_id)=/);
  });

  it("redacts opaque contacts pagination identifiers from diagnostics", async () => {
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });
    await snapshotProviderGet(
      "contacts-list",
      "/contacts/?locationId=location-safe&limit=20&startAfter=123456&startAfterId=opaque-contact-id",
      "provider-secret",
      fetchMock,
    );
    const log = JSON.stringify(infoSpy.mock.calls);
    expect(log).toContain("[redacted-pagination]");
    expect(log).not.toMatch(/123456|opaque-contact-id|provider-secret/);
  });

  it("identifies and redacts a pipelines HTTP 400 without retrying", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "x-request-id": "safe-trace-1" }),
      json: async () => ({
        error: "BadRequest",
        message: "Invalid Version for rJH8XytyAfEQSoOTQeuZ private@example.com Bearer provider-secret",
        contact: { name: "Private Person", phone: "555-0100" },
      }),
    });
    await expect(snapshotProviderGet(
      "pipelines-list",
      `/opportunities/pipelines?locationId=${input.locationId}`,
      "provider-secret",
      fetchMock,
    )).rejects.toMatchObject({
      operation: "pipelines-list",
      providerErrorCode: "BadRequest",
      message: expect.stringContaining("Invalid Version"),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const log = JSON.stringify(errorSpy.mock.calls);
    expect(log).toContain("pipelines-list");
    expect(log).toContain("/opportunities/pipelines");
    expect(log).toContain("safe-trace-1");
    expect(log).toContain("rJH8…QeuZ");
    expect(log).not.toMatch(/rJH8XytyAfEQSoOTQeuZ|private@example\.com|Private Person|555-0100|provider-secret/);
  });

  it.each([500, 503])("keeps HTTP %s retries bounded", async (status) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: new Headers({ "retry-after": "0" }),
      json: async () => ({ error: "Transient", message: "Try again" }),
    });
    await expect(snapshotProviderGet("contacts-list", "/contacts/?locationId=safe", "secret", fetchMock))
      .rejects.toMatchObject({ code: "provider_unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(GHL_SNAPSHOT_LIMITS.maxRetries + 1);
  });
});
