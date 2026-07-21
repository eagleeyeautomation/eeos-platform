import { describe, expect, it } from "vitest";
import { compareIdentityResults, safeFingerprint, stableSample, type ComparableIdentityResult } from "./comparison";

const base = (): ComparableIdentityResult => ({ category: "AUTHENTICATED", authenticated: true, userId: "1", platformRole: "admin",
  organizationId: "10", membershipId: "20", subaccountId: "30", authorizedSubaccountIds: ["30", "31"],
  authorizedGhlLocationId: "loc-a", displayName: "User", email: "user@example.test", sessionVersion: "0", errorCategory: null });

describe("identity shadow normalization", () => {
  it.each([
    ["userId", "2"], ["platformRole", "user"], ["organizationId", "11"], ["membershipId", "21"],
    ["subaccountId", "31"], ["authorizedSubaccountIds", ["31", "30"]], ["authorizedGhlLocationId", "loc-b"],
    ["displayName", null], ["email", null], ["sessionVersion", "1"], ["errorCategory", "IDENTITY_USER_NOT_FOUND"],
  ] as const)("does not mask a %s mismatch", (field, value) => {
    expect(compareIdentityResults(base(), { ...base(), [field]: value })).toContain(field);
  });

  it("preserves duplicate and ordering differences", () => {
    expect(compareIdentityResults(base(), { ...base(), authorizedSubaccountIds: ["30", "31", "31"] }))
      .toEqual(["authorizedSubaccountIds"]);
  });

  it("uses deterministic request-derived sampling", () => {
    expect(stableSample("request_1234567890", 0)).toBe(false);
    expect(stableSample("request_1234567890", 1)).toBe(true);
    expect(stableSample("request_1234567890", 0.5)).toBe(stableSample("request_1234567890", 0.5));
    expect(new Set(Array.from({ length: 40 }, (_, i) => stableSample(`request_partial_${i}`, 0.5)))).toEqual(new Set([true, false]));
  });

  it("produces keyed fingerprints without exposing result values", () => {
    const fingerprint = safeFingerprint(base(), "test-fingerprint-key");
    expect(fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(fingerprint).not.toContain("loc-a");
  });
});
