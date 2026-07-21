import { describe, expect, it } from "vitest";
import {
  authorizationCheckRequestSchema,
  authorizationDeniedResponseSchema,
  identityErrorResponseSchema,
  parseBoundedContract,
  sessionValidationResponseSchema,
  validateIdentityAssertion,
  validateServiceRequestAssertion,
  type ReplayStore,
} from "../../shared/identityServiceContract";

const now = 1_784_654_400;
const binding = {
  requestId: "request_1234567890",
  method: "POST" as const,
  path: "/internal/v1/session/validate" as const,
  bodySha256: "a".repeat(64),
  nonce: "nonce_1234567890123456",
};
const header = { alg: "ES256", typ: "JWT", kid: "identity-key-1" };
const identityClaims = {
  iss: "eeos-identity-service",
  aud: "eeos-core-platform",
  sub: "1",
  iat: now,
  nbf: now,
  exp: now + 60,
  jti: "assertion_12345678",
  sessionVersion: "1",
  userId: "1",
  organizationId: "10",
  membershipId: "100",
  subaccountId: "1000",
  platformRole: "admin",
  membershipRole: "owner",
  scope: ["identity:validated"],
  request: binding,
};

class MemoryReplayStore implements ReplayStore {
  private readonly consumed = new Set<string>();
  consume(jti: string) {
    if (this.consumed.has(jti)) return false;
    this.consumed.add(jti);
    return true;
  }
}

const validSessionResponse = {
  schemaVersion: "v1",
  authenticated: true,
  userId: "1",
  organizationId: "10",
  membershipId: "100",
  subaccountId: "1000",
  platformRole: "admin",
  membershipRole: "owner",
  authorizedGhlLocationId: "location-sc",
  authorizedSubaccountIds: ["1000"],
  displayName: "Administrator",
  email: "admin@example.test",
  sessionVersion: "1",
  assertion: "signed-identity-assertion-value-1234567890",
  expiresAt: "2026-07-21T12:01:00.000Z",
};

describe("EEOS Identity Service v1 contract", () => {
  it("accepts a valid session response and decimal-string IDs", () => {
    expect(sessionValidationResponseSchema.parse(validSessionResponse).userId).toBe("1");
  });

  it("rejects missing required fields, unknown fields, and numeric IDs", () => {
    const { assertion: _assertion, ...missing } = validSessionResponse;
    expect(() => sessionValidationResponseSchema.parse(missing)).toThrow();
    expect(() => sessionValidationResponseSchema.parse({ ...validSessionResponse, unexpected: true })).toThrow();
    expect(() => sessionValidationResponseSchema.parse({ ...validSessionResponse, userId: 1 })).toThrow();
  });

  it.each(["passwordHash", "openId", "providerToken"])("rejects prohibited field %s", (field) => {
    expect(() => sessionValidationResponseSchema.parse({ ...validSessionResponse, [field]: "prohibited" })).toThrow();
  });

  it("rejects unsupported, wildcard, and resource-incompatible actions", () => {
    const base = {
      schemaVersion: "v1", identityAssertion: "x".repeat(32), resourceType: "ghl_location",
      resourceId: "location-sc", action: "ghl:connect", requestId: binding.requestId,
      timestamp: "2026-07-21T12:00:00.000Z", nonce: binding.nonce,
    };
    expect(authorizationCheckRequestSchema.parse(base).action).toBe("ghl:connect");
    expect(() => authorizationCheckRequestSchema.parse({ ...base, action: "*" })).toThrow();
    expect(() => authorizationCheckRequestSchema.parse({ ...base, action: "ghl:delete" })).toThrow();
    expect(() => authorizationCheckRequestSchema.parse({ ...base, resourceType: "organization", resourceId: "10", action: "ghl:connect" })).toThrow();
    expect(() => authorizationCheckRequestSchema.parse({ ...base, resourceType: "account" })).toThrow();
  });

  it("rejects oversized payloads", () => {
    expect(() => parseBoundedContract(sessionValidationResponseSchema, { ...validSessionResponse, assertion: "x".repeat(17_000) })).toThrow("IDENTITY_REQUEST_INVALID");
  });

  it("accepts valid assertion claims and rejects missing key IDs", () => {
    expect(validateIdentityAssertion(header, identityClaims, binding, new MemoryReplayStore(), now).userId).toBe("1");
    expect(() => validateIdentityAssertion({ alg: "ES256", typ: "JWT" }, identityClaims, binding, new MemoryReplayStore(), now)).toThrow();
  });

  it("rejects expired, excessive-lifetime, wrong-issuer, and wrong-audience assertions", () => {
    expect(() => validateIdentityAssertion(header, { ...identityClaims, iat: now - 100, nbf: now - 100, exp: now - 31 }, binding, new MemoryReplayStore(), now)).toThrow("IDENTITY_SERVICE_ASSERTION_EXPIRED");
    expect(() => validateIdentityAssertion(header, { ...identityClaims, exp: now + 61 }, binding, new MemoryReplayStore(), now)).toThrow("IDENTITY_SERVICE_ASSERTION_EXPIRED");
    expect(() => validateIdentityAssertion(header, { ...identityClaims, iss: "other" }, binding, new MemoryReplayStore(), now)).toThrow();
    expect(() => validateIdentityAssertion(header, { ...identityClaims, aud: "other" }, binding, new MemoryReplayStore(), now)).toThrow();
  });

  it("rejects clock skew beyond tolerance", () => {
    expect(() => validateIdentityAssertion(header, { ...identityClaims, iat: now + 31, nbf: now + 31, exp: now + 60 }, binding, new MemoryReplayStore(), now)).toThrow("IDENTITY_SERVICE_ASSERTION_EXPIRED");
  });

  it("rejects replayed JTIs", () => {
    const store = new MemoryReplayStore();
    validateIdentityAssertion(header, identityClaims, binding, store, now);
    expect(() => validateIdentityAssertion(header, identityClaims, binding, store, now)).toThrow("IDENTITY_SERVICE_ASSERTION_REPLAYED");
  });

  it.each([
    ["method", { method: "GET" }],
    ["path", { path: "/internal/v1/authorization/check" }],
    ["body hash", { bodySha256: "b".repeat(64) }],
    ["nonce", { nonce: "nonce_abcdefghijklmnop" }],
  ])("rejects %s binding mismatch", (_label, change) => {
    expect(() => validateIdentityAssertion(header, identityClaims, { ...binding, ...change } as typeof binding, new MemoryReplayStore(), now)).toThrow("IDENTITY_SERVICE_AUTH_INVALID");
  });

  it("validates bound Core Platform service-request assertions", () => {
    const claims = { iss: "eeos-core-platform", aud: "eeos-identity-service", sub: "eeos-core-platform", iat: now, nbf: now, exp: now + 30, jti: "service_123456789", request: binding };
    expect(validateServiceRequestAssertion(header, claims, binding, new MemoryReplayStore(), now).sub).toBe("eeos-core-platform");
  });

  it("prevents denied authorization responses from leaking ownership", () => {
    const denied = {
      schemaVersion: "v1", allowed: false, userId: "1", organizationId: null, membershipId: null,
      subaccountId: null, resourceType: "ghl_location", resourceId: "requested-location", action: "ghl:connect",
      platformRole: "user", membershipRole: null,
      activeState: { membershipUserActive: false, subaccountActive: null, membershipStatus: null, organizationActive: null },
      assertionId: "assertion_87654321", expiresAt: "2026-07-21T12:01:00.000Z",
    };
    expect(authorizationDeniedResponseSchema.parse(denied)).toEqual(denied);
    expect(() => authorizationDeniedResponseSchema.parse({ ...denied, organizationId: "20" })).toThrow();
  });

  it("rejects malformed error responses", () => {
    const valid = { error: { code: "IDENTITY_SESSION_EXPIRED", message: "Session is not valid.", requestId: "request_1234567890", retryable: false } };
    expect(identityErrorResponseSchema.parse(valid)).toEqual(valid);
    expect(() => identityErrorResponseSchema.parse({ error: { code: "SQL_ERROR", message: "bad" } })).toThrow();
  });
});
