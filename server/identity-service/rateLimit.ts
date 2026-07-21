export type RateLimitDecision = { allowed: boolean; retryAfterSeconds?: number };
export type IdentityRateLimiter = { consume(key: string, nowMs?: number): RateLimitDecision };

/** Local/test implementation only; it is not horizontally safe. */
export class InMemoryFixedWindowRateLimiter implements IdentityRateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  constructor(private readonly limit = 120, private readonly windowMs = 60_000) {}

  consume(key: string, nowMs = Date.now()): RateLimitDecision {
    const existing = this.windows.get(key);
    if (!existing || nowMs - existing.startedAt >= this.windowMs) {
      this.windows.set(key, { startedAt: nowMs, count: 1 });
      return { allowed: true };
    }
    existing.count += 1;
    if (existing.count <= this.limit) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (nowMs - existing.startedAt)) / 1000)) };
  }
}
