import { describe, expect, it } from "vitest";
import { evaluateRecentMfa, RECENT_MFA_WINDOW_MS } from "./recentMfa";

describe("recent MFA authorization", () => {
  const now = Date.parse("2026-08-03T15:00:00.000Z");

  it("passes immediately after MFA and at the configured boundary", () => {
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now), recentAuthAt: new Date(now) }, now).allowed).toBe(true);
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now), recentAuthAt: new Date(now - RECENT_MFA_WINDOW_MS) }, now).allowed).toBe(true);
  });

  it("fails outside the configured window", () => {
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now), recentAuthAt: new Date(now - RECENT_MFA_WINDOW_MS - 1) }, now)).toMatchObject({ allowed: false, reason: "expired" });
  });

  it("preserves serialized date values", () => {
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now).toISOString() as never, recentAuthAt: new Date(now).toISOString() as never }, now)).toMatchObject({ allowed: true, reason: "ok" });
  });

  it("fails closed for missing or invalid timestamps", () => {
    expect(evaluateRecentMfa({ mfaVerifiedAt: null, recentAuthAt: new Date(now) }, now).reason).toBe("missing_mfa");
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now), recentAuthAt: null }, now).reason).toBe("missing_recent_auth");
    expect(evaluateRecentMfa({ mfaVerifiedAt: new Date(now), recentAuthAt: "invalid" as never }, now).reason).toBe("invalid_recent_auth");
  });
});
