import { createHash } from "crypto";
import { promises as fs } from "fs";
import { createServer } from "http";
import path from "path";
import { describe, expect, it } from "vitest";
import { createIdentityServiceApp } from "./app";
import { loadIdentityServiceConfig } from "./config";
import { createMappedIdentityError } from "./errors";
import { sanitizeIdentityLogFields, type IdentityLogger } from "./logging";
import { InMemoryFixedWindowRateLimiter } from "./rateLimit";
import {
  ContractServiceAssertionVerifier,
  InMemoryReplayStore,
  type DecodedServiceAssertion,
  type ServiceAssertionDecoder,
} from "./security";

const now = 1_784_654_400;
const requestId = "request_1234567890";
const nonce = "nonce_1234567890123456";
const sessionBody = { schemaVersion: "v1", requestId, timestamp: "2026-07-21T12:00:00.000Z", nonce };
const authorizationBody = {
  schemaVersion: "v1", identityAssertion: "identity-assertion-value-123456789",
  resourceType: "ghl_location", resourceId: "location-sc", action: "ghl:connect",
  requestId, timestamp: "2026-07-21T12:00:00.000Z", nonce,
};

class FixtureDecoder implements ServiceAssertionDecoder {
  constructor(private readonly assertions: Record<string, DecodedServiceAssertion>) {}
  async decode(token: string) {
    const assertion = this.assertions[token];
    if (!assertion) throw new Error("unknown assertion");
    return assertion;
  }
}

function serviceAssertion(body: unknown, pathName: "/internal/v1/session/validate" | "/internal/v1/authorization/check", overrides: Record<string, unknown> = {}) {
  const bodyText = JSON.stringify(body);
  const request = {
    requestId, method: "POST", path: pathName,
    bodySha256: createHash("sha256").update(bodyText).digest("hex"), nonce,
  };
  const claims = {
    iss: "eeos-core-platform", aud: "eeos-identity-service", sub: "eeos-core-platform",
    iat: now, nbf: now, exp: now + 30, jti: `service_${pathName.includes("session") ? "session" : "authorize"}_1234`, request,
    ...overrides,
  };
  return { bodyText, decoded: { header: { alg: "ES256", typ: "JWT", kid: "test-key" }, claims } };
}

const testConfig = loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "test", IDENTITY_SERVICE_PORT: "0" });

async function withService<T>(
  assertions: Record<string, DecodedServiceAssertion>,
  callback: (baseUrl: string, logs: Array<{ level: string; event: string; fields?: Record<string, unknown> }>) => Promise<T>,
) {
  const logs: Array<{ level: string; event: string; fields?: Record<string, unknown> }> = [];
  const logger: IdentityLogger = { log: (level, event, fields) => { logs.push({ level, event, fields }); } };
  const verifier = new ContractServiceAssertionVerifier(new FixtureDecoder(assertions), new InMemoryReplayStore(() => now), () => now);
  const server = createServer(createIdentityServiceApp(testConfig, { logger, assertionVerifier: verifier }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start.");
  try { return await callback(`http://127.0.0.1:${address.port}`, logs); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

async function post(baseUrl: string, endpoint: string, bodyText: string, token?: string, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: bodyText,
  });
  return { status: response.status, body: await response.json() as Record<string, any>, headers: response.headers };
}

describe("EEOS Identity Service skeleton", () => {
  it("returns liveness 200 and readiness 503 without dependency details", async () => withService({}, async (baseUrl) => {
    const live = await fetch(`${baseUrl}/health/live`);
    const ready = await fetch(`${baseUrl}/health/ready`);
    expect(live.status).toBe(200);
    expect(await live.json()).toEqual({ status: "ok", service: "eeos-identity-service", version: "v1" });
    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({ status: "not_ready", service: "eeos-identity-service", version: "v1" });
  }));

  it.each([
    ["session", "/internal/v1/session/validate", sessionBody],
    ["authorization", "/internal/v1/authorization/check", authorizationBody],
  ])("valid %s envelope reaches controlled unavailable response", async (_label, endpoint, body) => {
    const assertion = serviceAssertion(body, endpoint as "/internal/v1/session/validate" | "/internal/v1/authorization/check");
    await withService({ valid: assertion.decoded }, async (baseUrl) => {
      const response = await post(baseUrl, endpoint, assertion.bodyText, "valid");
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe("IDENTITY_SERVICE_UNAVAILABLE");
      expect(JSON.stringify(response.body)).not.toContain("allowed");
      expect(JSON.stringify(response.body)).not.toContain("userId");
    });
  });

  it("rejects malformed, unknown, prohibited, and numeric-ID request fields", async () => withService({}, async (baseUrl) => {
    expect((await post(baseUrl, "/internal/v1/session/validate", "{" )).status).toBe(400);
    expect((await post(baseUrl, "/internal/v1/session/validate", JSON.stringify({ ...sessionBody, unknown: true }))).status).toBe(400);
    expect((await post(baseUrl, "/internal/v1/session/validate", JSON.stringify({ ...sessionBody, userId: "1" }))).status).toBe(400);
    const numeric = { ...authorizationBody, resourceType: "organization", resourceId: 10, action: "organization:read" };
    expect((await post(baseUrl, "/internal/v1/authorization/check", JSON.stringify(numeric))).status).toBe(400);
  }));

  it("rejects unsupported and wildcard actions", async () => withService({}, async (baseUrl) => {
    expect((await post(baseUrl, "/internal/v1/authorization/check", JSON.stringify({ ...authorizationBody, action: "ghl:delete" }))).status).toBe(400);
    expect((await post(baseUrl, "/internal/v1/authorization/check", JSON.stringify({ ...authorizationBody, action: "*" }))).status).toBe(400);
  }));

  it("rejects missing service assertion and preserves request ID", async () => withService({}, async (baseUrl) => {
    const response = await post(baseUrl, "/internal/v1/session/validate", JSON.stringify(sessionBody));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("IDENTITY_SERVICE_AUTH_INVALID");
    expect(response.body.error.requestId).toBe(requestId);
  }));

  it.each([
    ["wrong issuer", { iss: "other-service" }, "IDENTITY_SERVICE_AUTH_INVALID"],
    ["wrong audience", { aud: "other-audience" }, "IDENTITY_SERVICE_AUTH_INVALID"],
    ["expired", { iat: now - 100, nbf: now - 100, exp: now - 31 }, "IDENTITY_SERVICE_ASSERTION_EXPIRED"],
  ])("rejects %s", async (_label, override, expectedCode) => {
    const assertion = serviceAssertion(sessionBody, "/internal/v1/session/validate", override);
    await withService({ invalid: assertion.decoded }, async (baseUrl) => {
      const response = await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "invalid");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(expectedCode);
    });
  });

  it("rejects a missing key ID", async () => {
    const assertion = serviceAssertion(sessionBody, "/internal/v1/session/validate");
    assertion.decoded.header = { alg: "ES256", typ: "JWT" };
    await withService({ invalid: assertion.decoded }, async (baseUrl) => {
      expect((await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "invalid")).status).toBe(401);
    });
  });

  it("rejects reused JTI values", async () => {
    const assertion = serviceAssertion(sessionBody, "/internal/v1/session/validate");
    await withService({ valid: assertion.decoded }, async (baseUrl) => {
      expect((await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "valid")).status).toBe(503);
      const replay = await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "valid");
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe("IDENTITY_SERVICE_ASSERTION_REPLAYED");
    });
  });

  it.each([
    ["method", { request: { ...serviceAssertion(sessionBody, "/internal/v1/session/validate").decoded.claims.request, method: "GET" } }],
    ["path", { request: { ...serviceAssertion(sessionBody, "/internal/v1/session/validate").decoded.claims.request, path: "/internal/v1/authorization/check" } }],
    ["body hash", { request: { ...serviceAssertion(sessionBody, "/internal/v1/session/validate").decoded.claims.request, bodySha256: "b".repeat(64) } }],
    ["nonce", { request: { ...serviceAssertion(sessionBody, "/internal/v1/session/validate").decoded.claims.request, nonce: "nonce_abcdefghijklmnop" } }],
  ])("rejects %s binding mismatch", async (_label, override) => {
    const assertion = serviceAssertion(sessionBody, "/internal/v1/session/validate", override);
    await withService({ invalid: assertion.decoded }, async (baseUrl) => {
      const response = await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "invalid");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("IDENTITY_SERVICE_AUTH_INVALID");
    });
  });

  it("rejects oversized payloads", async () => withService({}, async (baseUrl) => {
    const response = await post(baseUrl, "/internal/v1/session/validate", JSON.stringify({ ...sessionBody, padding: "x".repeat(17_000) }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("IDENTITY_REQUEST_INVALID");
  }));

  it("does not log sensitive headers or fields and never returns stack traces", async () => {
    const assertion = serviceAssertion(sessionBody, "/internal/v1/session/validate");
    await withService({ valid: assertion.decoded }, async (baseUrl, logs) => {
      const response = await post(baseUrl, "/internal/v1/session/validate", assertion.bodyText, "valid", { cookie: "app_session_id=never-log-me" });
      const serialized = JSON.stringify(logs);
      expect(serialized).not.toContain("never-log-me");
      expect(serialized).not.toContain("Bearer valid");
      expect(JSON.stringify(response.body)).not.toContain("stack");
    });
    expect(sanitizeIdentityLogFields({ authorization: "secret", cookie: "secret", openId: "secret", safe: "ok" }))
      .toEqual({ authorization: "[redacted]", cookie: "[redacted]", openId: "[redacted]", safe: "ok" });
  });

  it("provides deterministic local rate limiting", () => {
    const limiter = new InMemoryFixedWindowRateLimiter(1, 1_000);
    expect(limiter.consume("client", 0).allowed).toBe(true);
    expect(limiter.consume("client", 1).allowed).toBe(false);
    expect(limiter.consume("client", 1_001).allowed).toBe(true);
  });

  it("centralizes required error status mappings", () => {
    expect(createMappedIdentityError("IDENTITY_REQUEST_INVALID").status).toBe(400);
    expect(createMappedIdentityError("IDENTITY_SERVICE_AUTH_INVALID").status).toBe(401);
    expect(createMappedIdentityError("IDENTITY_SERVICE_ASSERTION_EXPIRED").status).toBe(401);
    expect(createMappedIdentityError("IDENTITY_SERVICE_ASSERTION_REPLAYED").status).toBe(401);
    expect(createMappedIdentityError("IDENTITY_RATE_LIMITED").status).toBe(429);
    expect(createMappedIdentityError("IDENTITY_SERVICE_UNAVAILABLE").status).toBe(503);
    expect(createMappedIdentityError("IDENTITY_TIMEOUT").status).toBe(504);
    expect(createMappedIdentityError("IDENTITY_INTERNAL_ERROR").status).toBe(500);
  });

  it("fails closed on missing production security configuration and never reads DATABASE_URL", () => {
    expect(() => loadIdentityServiceConfig({
      IDENTITY_SERVICE_ENV: "production",
      IDENTITY_SERVICE_REPLAY_STORE: "redis",
      UPSTASH_REDIS_REST_URL: "https://redis.invalid",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    })).toThrow(/IDENTITY_SERVICE_EXPECTED_AUDIENCE/);
    const config = loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "test", DATABASE_URL: "must-not-be-read" });
    expect(config.legacyMysqlDatabaseUrl).toBeUndefined();
    expect(config.identityAdapterConfigured).toBe(false);
  });

  it("has no platform runtime or database constructor imports", async () => {
    const root = path.resolve(import.meta.dirname);
    const files = (await fs.readdir(root)).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    const source = (await Promise.all(files.map((name) => fs.readFile(path.join(root, name), "utf8")))).join("\n");
    for (const prohibited of ["drizzle-orm/mysql2", 'from "pg"', "../db/postgres", "../_core/app", "ghl-oauth", "athena", "business-memory", "intelligence-engine", "ghl-webhook"]) {
      expect(source).not.toContain(prohibited);
    }
  });
});
