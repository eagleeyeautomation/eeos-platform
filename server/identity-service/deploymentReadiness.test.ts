import { createServer } from "http";
import { describe, expect, it, vi } from "vitest";
import { createIdentityServiceApp } from "./app";
import { loadIdentityServiceConfig } from "./config";
import {
  createReplayStore,
  MemoryReplayStore,
  RedisReplayStore,
  type ReplayStore,
} from "./replayStore";
import { validateIdentityServiceStartup } from "./startup";
import identityServiceHandler, { loadIdentityServiceApplication } from "./vercel";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgHnjxw5HoUp1BbWC2
V0crba4CjwcGlCF+YvNgPwdXP4ihRANCAAQefC8aopwrhF1SXKADZ5zi77JOzUmf
SSPGYQZh9k3eULzUzEH9uTPRsrV+jGu39W0vUpAfLQOv4W9fu6BtK832
-----END PRIVATE KEY-----`;
const jwks = JSON.stringify({ keys: [{ kty: "EC", x: "HnwvGqKcK4RdUlygA2ec4u-yTs1Jn0kjxmEGYfZN3lA",
  y: "vNTMQf25M9GytX6Ma7f1bS9SkB8tA6_hb1-7oG0rzfY", crv: "P-256", alg: "ES256", use: "sig", kid: "test-key" }] });

async function readiness(dependencies: Parameters<typeof createIdentityServiceApp>[1]) {
  const config = loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "test", IDENTITY_SERVICE_PORT: "0" });
  const server = createServer(createIdentityServiceApp(config, dependencies));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start.");
  try { return (await fetch(`http://127.0.0.1:${address.port}/health/ready`)).status; }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

const readyDependencies = () => ({
  assertionVerifier: { operational: () => true, verify: vi.fn() },
  sessionValidationService: {} as never,
  identityAdapter: { resolve: vi.fn(), ready: vi.fn().mockResolvedValue(true), close: vi.fn() },
  replayStore: { consume: vi.fn(), ready: vi.fn().mockResolvedValue(true), productionSafe: () => true } satisfies ReplayStore,
  signerReadiness: { ready: vi.fn().mockResolvedValue(true) },
});

describe("Identity Service deployment readiness", () => {
  it("exports one lazy Vercel handler and reuses the initialized Express application", async () => {
    expect(identityServiceHandler).toBeTypeOf("function");
    const env = { IDENTITY_SERVICE_ENV: "test", IDENTITY_SERVICE_PORT: "0" };
    expect(loadIdentityServiceApplication(env)).toBe(loadIdentityServiceApplication(env));
    await expect(loadIdentityServiceApplication(env)).resolves.toBeTypeOf("function");
  });

  it("uses memory by default and selects Redis only when explicitly requested", () => {
    expect(createReplayStore()).toBeInstanceOf(MemoryReplayStore);
    expect(createReplayStore("memory")).toBeInstanceOf(MemoryReplayStore);
    expect(createReplayStore("redis")).toBeInstanceOf(RedisReplayStore);
    expect(() => loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "test", IDENTITY_SERVICE_REPLAY_STORE: "redis" }))
      .toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it("consumes memory replay IDs once and expires old entries", async () => {
    let now = 100;
    const store = new MemoryReplayStore(() => now);
    await expect(store.consume("assertion-one", 110)).resolves.toBe(true);
    await expect(store.consume("assertion-one", 110)).resolves.toBe(false);
    now = 141;
    await expect(store.consume("assertion-one", 150)).resolves.toBe(true);
    await expect(store.ready()).resolves.toBe(true);
    expect(store.productionSafe()).toBe(false);
  });

  it("uses atomic Redis NX/EX semantics without creating a connection", async () => {
    const client = { set: vi.fn().mockResolvedValue("OK"), ping: vi.fn().mockResolvedValue("PONG") };
    const store = new RedisReplayStore(client, () => 100);
    await expect(store.consume("assertion-two", 130)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith("eeos:identity:replay:assertion-two", "1", { nx: true, ex: 30 });
    await expect(store.ready()).resolves.toBe(true);
  });

  it("validates immutable contract, JWKS, and signing-key configuration without checking runtime dependencies", async () => {
    const config = loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "test", IDENTITY_SERVICE_CONTRACT_VERSION: "v1",
      IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS: jwks, IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY: privateKey,
      IDENTITY_SERVICE_ASSERTION_KEY_ID: "test-key" });
    await expect(validateIdentityServiceStartup(config)).resolves.toBeUndefined();
    await expect(validateIdentityServiceStartup({ ...config, contractVersion: "v2" })).rejects.toThrow(/CONTRACT_VERSION/);
    await expect(validateIdentityServiceStartup({ ...config, trustedClientJwks: "{}" })).rejects.toThrow(/contains no keys/);
    await expect(validateIdentityServiceStartup({ ...config, assertionKeyId: undefined })).rejects.toThrow(/configured together/);
  });

  it("returns ready only when replay, signer, verifier, and MySQL are available", async () => {
    expect(await readiness(readyDependencies())).toBe(200);
    const replayUnavailable = readyDependencies();
    replayUnavailable.replayStore.ready = vi.fn().mockResolvedValue(false);
    expect(await readiness(replayUnavailable)).toBe(503);
    const signerUnavailable = readyDependencies();
    signerUnavailable.signerReadiness.ready = vi.fn().mockResolvedValue(false);
    expect(await readiness(signerUnavailable)).toBe(503);
    const mysqlUnavailable = readyDependencies();
    mysqlUnavailable.identityAdapter.ready = vi.fn().mockResolvedValue(false);
    expect(await readiness(mysqlUnavailable)).toBe(503);
  });

  it("reports production-ready with a configured atomic Redis replay client", async () => {
    const config = loadIdentityServiceConfig({ IDENTITY_SERVICE_ENV: "production", IDENTITY_SERVICE_REPLAY_STORE: "redis",
      IDENTITY_SERVICE_EXPECTED_AUDIENCE: "eeos-identity-service", IDENTITY_SERVICE_EXPECTED_ISSUER: "eeos-core-platform",
      IDENTITY_SERVICE_EXPECTED_CLIENT_ID: "eeos-core-platform", IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS: jwks,
      IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY: privateKey, IDENTITY_SERVICE_ASSERTION_KEY_ID: "test-key",
      LEGACY_MYSQL_DATABASE_URL: "mysql://test.invalid/database", JWT_SECRET: "test-session-secret",
      UPSTASH_REDIS_REST_URL: "https://redis.invalid", UPSTASH_REDIS_REST_TOKEN: "test-token" });
    const redisClient = { set: vi.fn().mockResolvedValue("OK"), ping: vi.fn().mockResolvedValue("PONG") };
    const dependencies = readyDependencies();
    const server = createServer(createIdentityServiceApp(config, { ...dependencies, replayStore: undefined, redisClient }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start.");
    try {
      expect((await fetch(`http://127.0.0.1:${address.port}/health/ready`)).status).toBe(200);
      expect(redisClient.ping).toHaveBeenCalledOnce();
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});
