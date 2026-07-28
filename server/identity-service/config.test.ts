import { describe, expect, it } from "vitest";
import { loadIdentityServiceConfig } from "./config";

const redisConfig = (overrides: NodeJS.ProcessEnv = {}) => loadIdentityServiceConfig({
  IDENTITY_SERVICE_ENV: "test",
  IDENTITY_SERVICE_REPLAY_STORE: "redis",
  ...overrides,
});

describe("Identity Service Redis configuration", () => {
  it("accepts the legacy EEOS Redis variable pair first", () => {
    const config = redisConfig({
      UPSTASH_REDIS_REST_URL: "https://legacy.example",
      UPSTASH_REDIS_REST_TOKEN: "legacy-token",
      UPSTASH_REDIS_REST_KV_REST_API_URL: "https://integration.example",
      UPSTASH_REDIS_REST_KV_REST_API_TOKEN: "integration-token",
    });

    expect(config.redisRestUrl).toBe("https://legacy.example");
    expect(config.redisRestToken).toBe("legacy-token");
  });

  it("accepts the standard Vercel Upstash integration variable pair", () => {
    const config = redisConfig({
      UPSTASH_REDIS_REST_KV_REST_API_URL: "https://integration.example",
      UPSTASH_REDIS_REST_KV_REST_API_TOKEN: "integration-token",
    });

    expect(config.redisRestUrl).toBe("https://integration.example");
    expect(config.redisRestToken).toBe("integration-token");
  });

  it("skips a malformed legacy pair in favor of a valid integration pair", () => {
    const config = redisConfig({
      UPSTASH_REDIS_REST_URL: "not-a-url",
      UPSTASH_REDIS_REST_TOKEN: "legacy-token",
      UPSTASH_REDIS_REST_KV_REST_API_URL: "https://integration.example",
      UPSTASH_REDIS_REST_KV_REST_API_TOKEN: "integration-token",
    });

    expect(config.redisRestUrl).toBe("https://integration.example");
    expect(config.redisRestToken).toBe("integration-token");
  });

  it.each([
    ["no Redis variables", {}],
    ["legacy URL without token", { UPSTASH_REDIS_REST_URL: "https://legacy.example" }],
    ["legacy token without URL", { UPSTASH_REDIS_REST_TOKEN: "legacy-token" }],
    ["integration URL without token", {
      UPSTASH_REDIS_REST_KV_REST_API_URL: "https://integration.example",
    }],
    ["integration token without URL", {
      UPSTASH_REDIS_REST_KV_REST_API_TOKEN: "integration-token",
    }],
    ["malformed URL", {
      UPSTASH_REDIS_REST_URL: "not-a-url",
      UPSTASH_REDIS_REST_TOKEN: "legacy-token",
    }],
    ["values split across naming conventions", {
      UPSTASH_REDIS_REST_URL: "https://legacy.example",
      UPSTASH_REDIS_REST_KV_REST_API_TOKEN: "integration-token",
    }],
  ])("rejects %s", (_label, variables) => {
    expect(() => redisConfig(variables)).toThrow(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for the redis replay store.",
    );
  });
});
