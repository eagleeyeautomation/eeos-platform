import { describe, expect, it } from "vitest";
import { AUTH_RATE_LIMIT_WINDOW_MS, consumeSensitiveRouteLimit } from "./firstPartyAuth";

describe("authentication sensitive-route limiter", () => {
  it("enforces the configured threshold and recovers after the fixed window", () => {
    const key = `phase-one-unit-${Math.random()}`;
    const startedAt = 1_000_000;
    expect(consumeSensitiveRouteLimit(key, 2, startedAt)).toBe(false);
    expect(consumeSensitiveRouteLimit(key, 2, startedAt + 1)).toBe(false);
    expect(consumeSensitiveRouteLimit(key, 2, startedAt + 2)).toBe(true);
    expect(consumeSensitiveRouteLimit(key, 2, startedAt + AUTH_RATE_LIMIT_WINDOW_MS)).toBe(false);
  });
});
