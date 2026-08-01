import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

export type RateLimitDecision = { allowed: boolean; count: number; retryAfterSeconds: number };
export interface RateLimitStore {
  consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision>;
}

const LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Pick<Redis, "eval">) {}
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const result = await this.redis.eval(LUA, [key], [windowSeconds]) as [number, number];
    const count = Number(result[0]);
    return { allowed: count <= limit, count, retryAfterSeconds: Math.max(1, Number(result[1])) };
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();
  constructor(private readonly now = () => Date.now()) {}
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const current = this.entries.get(key);
    const expiresAt = this.now() + windowSeconds * 1000;
    const entry = !current || current.expiresAt <= this.now()
      ? { count: 1, expiresAt }
      : { count: current.count + 1, expiresAt: current.expiresAt };
    this.entries.set(key, entry);
    return { allowed: entry.count <= limit, count: entry.count, retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - this.now()) / 1000)) };
  }
}

export function resolveUpstashRateLimitConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.UPSTASH_REDIS_REST_KV_REST_API_URL
    ?? env.UPSTASH_REDIS_REST_URL
    ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
    ?? env.UPSTASH_REDIS_REST_TOKEN
    ?? env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : undefined;
}

export function createProductionRateLimitStore(env: NodeJS.ProcessEnv = process.env): RateLimitStore | undefined {
  if (env.NODE_ENV === "test") return undefined;
  const config = resolveUpstashRateLimitConfig(env);
  if (!config) return undefined;
  return new UpstashRateLimitStore(new Redis(config));
}

export function rateLimitIdentity(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export class AuthenticationRateLimiter {
  constructor(private readonly store: RateLimitStore | undefined, private readonly fallback = new MemoryRateLimitStore()) {}

  async consume(input: { route: string; network: string; account: string; limit: number; windowSeconds: number; failClosed?: boolean }) {
    const keys = [
      `eeos:auth-limit:v1:${input.route}:network:${rateLimitIdentity(input.network)}`,
      `eeos:auth-limit:v1:${input.route}:account:${rateLimitIdentity(input.account)}`,
    ];
    try {
      if (!this.store) throw new Error("shared rate-limit store unavailable");
      const decisions = await Promise.all(keys.map((key) => this.store!.consume(key, input.limit, input.windowSeconds)));
      return { allowed: decisions.every((decision) => decision.allowed), retryAfterSeconds: Math.max(...decisions.map((decision) => decision.retryAfterSeconds)), degraded: false };
    } catch {
      if (input.failClosed) return { allowed: false, retryAfterSeconds: 60, degraded: true };
      const decisions = await Promise.all(keys.map((key) => this.fallback.consume(key, input.limit, input.windowSeconds)));
      return { allowed: decisions.every((decision) => decision.allowed), retryAfterSeconds: Math.max(...decisions.map((decision) => decision.retryAfterSeconds)), degraded: true };
    }
  }
}
