import { describe, expect, it } from "vitest";
import { AuthenticationRateLimiter, MemoryRateLimitStore, rateLimitIdentity, resolveUpstashRateLimitConfig, type RateLimitStore } from "./distributedRateLimit";

describe("distributed authentication throttling", () => {
  it("shares limits across simulated instances and survives an instance restart", async () => {
    const shared = new MemoryRateLimitStore();
    const first = new AuthenticationRateLimiter(shared);
    const second = new AuthenticationRateLimiter(shared);
    const input = { route: "login", network: "198.51.100.1", account: "person@example.test", limit: 2, windowSeconds: 60 };
    expect((await first.consume(input)).allowed).toBe(true);
    expect((await second.consume(input)).allowed).toBe(true);
    expect((await new AuthenticationRateLimiter(shared).consume(input)).allowed).toBe(false);
  });

  it("recovers after the fixed window", async () => {
    let now = 0; const store = new MemoryRateLimitStore(() => now); const limiter = new AuthenticationRateLimiter(store);
    const input = { route: "login", network: "n", account: "a", limit: 1, windowSeconds: 10 };
    expect((await limiter.consume(input)).allowed).toBe(true);
    expect((await limiter.consume(input)).allowed).toBe(false);
    now = 10_001; expect((await limiter.consume(input)).allowed).toBe(true);
  });

  it("combines network and account signals", async () => {
    const limiter = new AuthenticationRateLimiter(new MemoryRateLimitStore());
    const base = { route: "login", limit: 2, windowSeconds: 60 };
    await limiter.consume({ ...base, network: "network-a", account: "account-a" });
    await limiter.consume({ ...base, network: "network-a", account: "account-b" });
    expect((await limiter.consume({ ...base, network: "network-a", account: "account-c" })).allowed).toBe(false);
    expect((await limiter.consume({ ...base, network: "network-b", account: "account-a" })).allowed).toBe(true);
    expect((await limiter.consume({ ...base, network: "network-c", account: "account-a" })).allowed).toBe(false);
  });

  it("fails closed for privileged authentication and degrades locally otherwise", async () => {
    const broken: RateLimitStore = { consume: async () => { throw new Error("unavailable"); } };
    const limiter = new AuthenticationRateLimiter(broken);
    const input = { route: "mfa", network: "n", account: "a", limit: 1, windowSeconds: 60 };
    expect(await limiter.consume({ ...input, failClosed: true })).toMatchObject({ allowed: false, degraded: true });
    expect(await limiter.consume(input)).toMatchObject({ allowed: true, degraded: true });
  });

  it("uses irreversible non-secret Redis key material", () => {
    expect(rateLimitIdentity("Sensitive@Example.test")).toMatch(/^[a-f0-9]{64}$/);
    expect(rateLimitIdentity("Sensitive@Example.test")).not.toContain("Sensitive");
  });

  it("accepts the current Vercel Marketplace Redis variable convention", () => {
    expect(resolveUpstashRateLimitConfig({
      KV_REST_API_URL: "https://redis.example.test",
      KV_REST_API_TOKEN: "token",
    })).toEqual({ url: "https://redis.example.test", token: "token" });
  });

  it("does not enable the shared store with an incomplete credential pair", () => {
    expect(resolveUpstashRateLimitConfig({ KV_REST_API_URL: "https://redis.example.test" })).toBeUndefined();
    expect(resolveUpstashRateLimitConfig({ KV_REST_API_TOKEN: "token" })).toBeUndefined();
  });
});
