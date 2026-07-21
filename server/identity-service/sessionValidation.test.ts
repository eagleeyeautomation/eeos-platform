import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { Hs256BrowserSessionVerifier, SessionValidationService, type BrowserSessionVerifier, type IdentityAssertionSigner } from "./sessionValidation";
import type { SessionIdentityAdapter, SessionIdentityContext } from "./mysqlSessionAdapter";
import { IdentityServiceError } from "./errors";

const request = { schemaVersion: "v1", requestId: "request_1234567890", timestamp: "2026-07-21T12:00:00.000Z", nonce: "nonce_1234567890123456" } as const;
const binding = { requestId: request.requestId, method: "POST" as const, path: "/internal/v1/session/validate" as const,
  bodySha256: "a".repeat(64), nonce: request.nonce };
const signer: IdentityAssertionSigner = { sign: async () => "test-identity-assertion-value-1234567890" };
const browser: BrowserSessionVerifier = { verify: async (token) => {
  if (token !== "valid") throw new IdentityServiceError(401, "IDENTITY_SESSION_INVALID", "Session is not valid.");
  return { openId: "open-1", appId: "app", name: "User" };
} };
const baseContext: SessionIdentityContext = { user: { id: 1, openId: "open-1", name: "User", email: "user@example.test", role: "admin" }, scopes: [
  { organizationId: 10, membershipId: 20, subaccountId: 30, membershipRole: "owner", ghlLocationId: "loc-a", orgName: "Org" },
] };
const req = (cookie?: string, fallback?: string) => ({ headers: { cookie }, header: (name: string) => name === "x-eeos-session-authorization" ? fallback : undefined }) as unknown as Request;
const adapter = (context: SessionIdentityContext | undefined = baseContext): SessionIdentityAdapter => ({ resolve: async () => context, ready: async () => true, close: async () => {} });

describe("read-only session validation adapter", () => {
  it("returns unscoped identity and preserves authorized duplicate subaccounts", async () => {
    const context = { ...baseContext, scopes: [...baseContext.scopes, ...baseContext.scopes] };
    const result = await new SessionValidationService(browser, adapter(context), signer, () => new Date("2026-07-21T12:00:00Z"))
      .validate(req("app_session_id=valid"), request, binding);
    expect(result).toMatchObject({ authenticated: true, userId: "1", platformRole: "admin", organizationId: null,
      membershipId: null, subaccountId: null, membershipRole: null, authorizedGhlLocationId: null,
      authorizedSubaccountIds: ["30", "30"], sessionVersion: "0" });
  });

  it("returns requested location scope and denies an unauthorized location", async () => {
    const service = new SessionValidationService(browser, adapter(), signer);
    await expect(service.validate(req("app_session_id=valid"), { ...request, requestedGhlLocationId: "loc-a" }, binding))
      .resolves.toMatchObject({ organizationId: "10", membershipId: "20", subaccountId: "30", membershipRole: "owner", authorizedGhlLocationId: "loc-a" });
    await expect(service.validate(req("app_session_id=valid"), { ...request, requestedGhlLocationId: "loc-x" }, binding))
      .rejects.toMatchObject({ status: 403, code: "IDENTITY_LOCATION_UNAUTHORIZED" });
  });

  it("returns user-not-found and supports users with no accessible subaccounts", async () => {
    await expect(new SessionValidationService(browser, { ...adapter(), resolve: async () => undefined }, signer).validate(req("app_session_id=valid"), request, binding))
      .rejects.toMatchObject({ status: 401, code: "IDENTITY_USER_NOT_FOUND" });
    const result = await new SessionValidationService(browser, adapter({ ...baseContext, scopes: [] }), signer).validate(req("app_session_id=valid"), request, binding);
    expect(result.authorizedSubaccountIds).toEqual([]);
  });

  it("prefers cookie and uses frozen bearer fallback only when cookie is absent", async () => {
    await expect(new SessionValidationService(browser, adapter(), signer).validate(req("app_session_id=bad", "Bearer valid"), request, binding))
      .rejects.toMatchObject({ code: "IDENTITY_SESSION_INVALID" });
    await expect(new SessionValidationService(browser, adapter(), signer).validate(req(undefined, "Bearer valid"), request, binding))
      .resolves.toMatchObject({ authenticated: true });
  });

  it("preserves adapter failure categories", async () => {
    const unavailable = adapter(); unavailable.resolve = async () => { throw new IdentityServiceError(503, "IDENTITY_DATABASE_UNAVAILABLE", "unavailable", true); };
    await expect(new SessionValidationService(browser, unavailable, signer).validate(req("app_session_id=valid"), request, binding))
      .rejects.toMatchObject({ status: 503, code: "IDENTITY_DATABASE_UNAVAILABLE" });
    const malformed = adapter(); malformed.resolve = async () => { throw new Error("malformed"); };
    await expect(new SessionValidationService(browser, malformed, signer).validate(req("app_session_id=valid"), request, binding)).rejects.toThrow("malformed");
  });

  it("verifies existing HS256 claims, invalid signatures, expiry, and required fields", async () => {
    const verifier = new Hs256BrowserSessionVerifier("secret");
    const key = new TextEncoder().encode("secret");
    const valid = await new SignJWT({ openId: "open-1", appId: "app", name: "User" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(key);
    await expect(verifier.verify(valid)).resolves.toEqual({ openId: "open-1", appId: "app", name: "User" });
    const missing = await new SignJWT({ openId: "open-1", appId: "app" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(key);
    await expect(verifier.verify(missing)).rejects.toMatchObject({ code: "IDENTITY_SESSION_INVALID" });
    const expired = await new SignJWT({ openId: "open-1", appId: "app", name: "User" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(1).sign(key);
    await expect(verifier.verify(expired)).rejects.toMatchObject({ code: "IDENTITY_SESSION_EXPIRED" });
    await expect(verifier.verify(`${valid}x`)).rejects.toMatchObject({ code: "IDENTITY_SESSION_INVALID" });
  });
});
