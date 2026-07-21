import { describe, expect, it, vi } from "vitest";
import { ShadowClientError, type IdentityShadowClient, type ShadowServiceResult } from "./client";
import type { ComparableIdentityResult } from "./comparison";
import { loadIdentityShadowConfig } from "./config";
import { InMemoryIdentityShadowMetrics } from "./metrics";
import { IdentityShadowRunner, normalizeIdentityError, type ShadowRunInput, type ShadowTelemetryEvent } from "./observer";

const authoritative: ComparableIdentityResult = { category: "AUTHENTICATED", authenticated: true, userId: "1", platformRole: "admin",
  organizationId: null, membershipId: null, subaccountId: null, authorizedSubaccountIds: ["30", "30"],
  authorizedGhlLocationId: null, displayName: "Sensitive Name", email: "sensitive@example.test", sessionVersion: "0", errorCategory: null };
const response = { schemaVersion: "v1" as const, authenticated: true as const, userId: "1", organizationId: null,
  membershipId: null, subaccountId: null, platformRole: "admin" as const, membershipRole: null, authorizedGhlLocationId: null,
  authorizedSubaccountIds: ["30", "30"], displayName: "Sensitive Name", email: "sensitive@example.test", sessionVersion: "0",
  expiresAt: "2026-07-21T12:01:00.000Z", iss: "eeos-identity-service" as const, aud: "eeos-core-platform" as const,
  sub: "1", iat: 1, nbf: 1, exp: 2, jti: "request_1234567890", scope: ["identity:validated" as const],
  request: { requestId: "request_1234567890", method: "POST" as const, path: "/internal/v1/session/validate" as const,
    bodySha256: "a".repeat(64), nonce: "nonce_1234567890123456" } };
const complete = { enabled: true, complete: true, serviceUrl: "https://identity.example.test", clientId: "client",
  requestPrivateKey: "key", requestKeyId: "kid", trustedAssertionJwks: { keys: [{ kty: "EC" }] },
  fingerprintKey: "fingerprint-key", timeoutMs: 100, sampleRate: 1 };
const input = (overrides: Partial<ShadowRunInput> = {}): ShadowRunInput => ({ requestId: "request_1234567890", endpointCategory: "api_trpc",
  eligible: true, session: { cookie: "never-log-session" }, authoritative: async () => authoritative, ...overrides });
const client = (result: ShadowServiceResult = { kind: "success", value: response }): IdentityShadowClient => ({ validate: vi.fn(async () => result) });

describe("identity shadow runner", () => {
  it.each([
    ["disabled", { ...complete, enabled: false }],
    ["incomplete configuration", { ...complete, complete: false }],
    ["sample rate zero", { ...complete, sampleRate: 0 }],
  ])("skips when %s without resolving authoritative shadow context", async (_label, config) => {
    const resolve = vi.fn(async () => authoritative); const service = client();
    await expect(new IdentityShadowRunner(config, service).run(input({ authoritative: resolve }))).resolves.toBe("SHADOW_SKIPPED");
    expect(resolve).not.toHaveBeenCalled(); expect(service.validate).not.toHaveBeenCalled();
  });

  it("samples rate one and records match metrics", async () => {
    const metrics = new InMemoryIdentityShadowMetrics();
    await expect(new IdentityShadowRunner(complete, client(), undefined, metrics).run(input())).resolves.toBe("MATCH");
    expect(metrics.totals).toMatchObject({ eligible: 1, sampled: 1, match: 1, mismatch: 0, error: 0 });
  });

  it("supports deterministic partial sampled and unsampled decisions", async () => {
    const sampled = Array.from({ length: 40 }, (_, i) => ({ ...input(), requestId: `request_partial_${i}` }));
    const outcomes = await Promise.all(sampled.map((item) => new IdentityShadowRunner({ ...complete, sampleRate: 0.5 }, client()).run(item)));
    expect(outcomes).toContain("MATCH"); expect(outcomes).toContain("SHADOW_SKIPPED");
  });

  it.each(["public unauthenticated request", "health endpoint"])("does not shadow an ineligible %s", async () => {
    const service = client();
    await expect(new IdentityShadowRunner(complete, service).run(input({ eligible: false }))).resolves.toBe("SHADOW_SKIPPED");
    expect(service.validate).not.toHaveBeenCalled();
  });

  it.each([
    "valid authenticated", "valid requested location", "inactive membership-user", "missing membership", "missing organization",
    "inactive subaccount", "duplicate membership rows", "no accessible subaccounts",
  ])("matches identical canonical fixture semantics: %s", async () => {
    await expect(new IdentityShadowRunner(complete, client()).run(input())).resolves.toBe("MATCH");
  });

  it.each([
    ["unauthorized location", "IDENTITY_LOCATION_UNAUTHORIZED"],
    ["missing user", "IDENTITY_USER_NOT_FOUND"],
  ])("matches normalized %s errors", async (_label, code) => {
    const normalized = normalizeIdentityError(code);
    await expect(new IdentityShadowRunner(complete, client({ kind: "identity_error", category: code })).run(input({ authoritative: async () => normalized })))
      .resolves.toBe("MATCH");
  });

  it.each([
    ["userId", "2"], ["platformRole", "user"], ["organizationId", "11"], ["membershipId", "21"],
    ["subaccountId", "31"], ["authorizedSubaccountIds", ["31"]], ["authorizedGhlLocationId", "loc-b"],
  ] as const)("reports %s mismatch without values", async (field, value) => {
    const events: ShadowTelemetryEvent[] = [];
    const changed = { ...response, [field]: value } as typeof response;
    const outcome = await new IdentityShadowRunner(complete, client({ kind: "success", value: changed }), { emit: (event) => events.push(event) }).run(input());
    expect(outcome).toBe("MISMATCH"); expect(events[0]?.mismatchFields).toContain(field);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("Sensitive Name"); expect(serialized).not.toContain("sensitive@example.test");
    expect(serialized).not.toContain("never-log-session"); expect(serialized).not.toContain("loc-b");
  });

  it.each(["TIMEOUT", "HTTP_503", "HTTP_401", "RESPONSE_INVALID", "RESPONSE_OVERSIZED", "ASSERTION_SIGNING_FAILED"])
  ("isolates client error %s", async (category) => {
    const failing: IdentityShadowClient = { validate: async () => { throw new ShadowClientError(category); } };
    await expect(new IdentityShadowRunner(complete, failing).run(input())).resolves.toBe("SHADOW_ERROR");
  });

  it("isolates telemetry, metrics, and comparison exceptions", async () => {
    const brokenTelemetry = { emit: () => { throw new Error("telemetry"); } };
    const brokenMetrics = { eligible: () => { throw new Error("metrics"); }, sampled: () => {}, record: () => { throw new Error("metrics"); } };
    await expect(new IdentityShadowRunner(complete, client(), brokenTelemetry, brokenMetrics).run(input())).resolves.toBe("MATCH");
    await expect(new IdentityShadowRunner(complete, client(), brokenTelemetry, brokenMetrics, () => { throw new Error("compare"); }).run(input()))
      .resolves.toBe("SHADOW_ERROR");
  });

  it("never changes the already-produced authoritative result after any shadow failure", async () => {
    const currentResponse = { status: 200, userId: 1 };
    const failing: IdentityShadowClient = { validate: async () => { throw new Error("shadow failed"); } };
    const shadowPromise = new IdentityShadowRunner(complete, failing).run(input());
    expect(currentResponse).toEqual({ status: 200, userId: 1 });
    await expect(shadowPromise).resolves.toBe("SHADOW_ERROR");
    expect(currentResponse).toEqual({ status: 200, userId: 1 });
  });

  it("adds negligible disabled synchronous work and creates no shadow promise", async () => {
    const runner = new IdentityShadowRunner({ ...complete, enabled: false }, client());
    const started = performance.now();
    for (let index = 0; index < 100; index += 1) await runner.run(input());
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("uses safe defaults and never treats DATABASE_URL as shadow configuration", () => {
    const config = loadIdentityShadowConfig({ NODE_ENV: "production", DATABASE_URL: "do-not-read" });
    expect(config).toMatchObject({ enabled: false, complete: false, sampleRate: 0, timeoutMs: 500 });
    expect(loadIdentityShadowConfig({ NODE_ENV: "test" }).sampleRate).toBe(1);
    expect(loadIdentityShadowConfig({ IDENTITY_SHADOW_SAMPLE_RATE: "2" }).sampleRate).toBe(0);
    expect(loadIdentityShadowConfig({ IDENTITY_SHADOW_TIMEOUT_MS: "5000" }).timeoutMs).toBe(500);
    expect(() => loadIdentityShadowConfig({ IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS: "{" })).toThrowError(
      expect.objectContaining({ category: "invalid_trusted_jwks" }),
    );
    expect(loadIdentityShadowConfig({ ...process.env, IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS: '{"keys":[{"kty":"EC"}]}' }))
      .toMatchObject({ trustedAssertionJwks: { keys: [{ kty: "EC" }] } });
    expect(() => loadIdentityShadowConfig({ NODE_ENV: "production", IDENTITY_SHADOW_ENABLED: "true" })).toThrow(
      /IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS/,
    );
  });
});
