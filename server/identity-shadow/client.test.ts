import { createHash } from "crypto";
import { decodeProtectedHeader, exportJWK, exportPKCS8, generateKeyPair, importJWK, jwtVerify, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { HttpIdentityShadowClient } from "./client";

let requestPrivateKey: string;
let requestPublicJwk: JWK;
let assertionPrivateKey: CryptoKey;
let assertionPublicJwk: JWK;
beforeAll(async () => {
  const requestPair = await generateKeyPair("ES256", { extractable: true });
  requestPrivateKey = await exportPKCS8(requestPair.privateKey); requestPublicJwk = await exportJWK(requestPair.publicKey);
  const assertionPair = await generateKeyPair("ES256", { extractable: true });
  assertionPrivateKey = assertionPair.privateKey;
  assertionPublicJwk = { ...await exportJWK(assertionPair.publicKey), kid: "ephemeral-identity-key", alg: "ES256", use: "sig" };
});
const config = () => ({ serviceUrl: "https://identity.example.test", clientId: "eeos-core-platform", requestPrivateKey,
  requestKeyId: "c5-test-key", trustedAssertionJwks: { keys: [assertionPublicJwk] }, timeoutMs: 50 });
const input = { requestId: "request_1234567890", requestedGhlLocationId: "loc-a", session: { cookie: "session-secret" } };
const validResponse = { schemaVersion: "v1", authenticated: true, userId: "1", organizationId: "10", membershipId: "20",
  subaccountId: "30", platformRole: "admin", membershipRole: "owner", authorizedGhlLocationId: "loc-a",
  authorizedSubaccountIds: ["30"], displayName: "User", email: null, sessionVersion: "0",
  assertion: "identity-assertion-value-1234567890", expiresAt: "2026-07-21T12:01:00.000Z" };
const response = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers });
async function signedResponse(init?: RequestInit, overrides: Record<string, unknown> = {}) {
  const requestBody = String(init?.body); const request = JSON.parse(requestBody);
  const now = 1_784_635_200;
  const claims = { ...validResponse, assertion: undefined, iss: "eeos-identity-service", aud: "eeos-core-platform", sub: "1",
    iat: now, nbf: now, exp: now + 60, jti: input.requestId, scope: ["identity:validated"],
    request: { requestId: input.requestId, method: "POST", path: "/internal/v1/session/validate",
      bodySha256: createHash("sha256").update(requestBody).digest("hex"), nonce: request.nonce }, ...overrides };
  delete claims.assertion;
  const assertion = await new SignJWT(claims).setProtectedHeader({ alg: "ES256", typ: "JWT", kid: "ephemeral-identity-key" })
    .sign(assertionPrivateKey);
  return response({ ...validResponse, assertion });
}

describe("Core Platform Identity Service shadow client", () => {
  it("sends a bound ES256 assertion and keeps the session out of JSON", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body); const headers = new Headers(init?.headers);
      expect(body).not.toContain("session-secret");
      expect(headers.get("cookie")).toBe("app_session_id=session-secret");
      expect(headers.get("x-eeos-session-authorization")).toBeNull();
      const assertion = headers.get("authorization")!.slice(7);
      expect(decodeProtectedHeader(assertion)).toMatchObject({ alg: "ES256", typ: "JWT", kid: "c5-test-key" });
      const key = await importJWK(requestPublicJwk, "ES256");
      const { payload } = await jwtVerify(assertion, key, { issuer: "eeos-core-platform", audience: "eeos-identity-service",
        currentDate: new Date("2026-07-21T12:00:00Z") });
      expect(payload.sub).toBe("eeos-core-platform");
      expect(payload.request).toMatchObject({ requestId: input.requestId, method: "POST", path: "/internal/v1/session/validate",
        bodySha256: createHash("sha256").update(body).digest("hex") });
      return signedResponse(init);
    });
    const result = await new HttpIdentityShadowClient(config(), fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z")).validate(input);
    expect(result.kind).toBe("success");
    if (result.kind === "success") expect(result.value).toMatchObject({ schemaVersion: "v1", userId: "1" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the transitional session header only when cookie is absent", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("cookie")).toBeNull();
      expect(headers.get("x-eeos-session-authorization")).toBe("Bearer bearer-secret");
      expect(String(init?.body)).not.toContain("bearer-secret");
      return signedResponse(init);
    });
    await new HttpIdentityShadowClient(config(), fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z"))
      .validate({ ...input, session: { bearer: "bearer-secret" } });
  });

  it.each([[503, "HTTP_503"], [500, "HTTP_500"]])("maps HTTP %s to a shadow error", async (status, category) => {
    const client = new HttpIdentityShadowClient(config(), (async () => response({ error: "safe" }, status)) as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category });
  });

  it("normalizes frozen 401 and 403 identity errors for semantic comparison", async () => {
    for (const [status, code] of [[401, "IDENTITY_USER_NOT_FOUND"], [403, "IDENTITY_LOCATION_UNAUTHORIZED"]] as const) {
      const body = { error: { code, message: "Identity request failed.", requestId: input.requestId, retryable: false } };
      await expect(new HttpIdentityShadowClient(config(), (async () => response(body, status)) as typeof fetch).validate(input))
        .resolves.toEqual({ kind: "identity_error", category: code });
    }
  });

  it.each([
    ["malformed JSON", new Response("{", { status: 200 }), "RESPONSE_INVALID"],
    ["oversized", new Response("x".repeat(16_385), { status: 200 }), "RESPONSE_OVERSIZED"],
  ])("rejects %s", async (_label, serverResponse, category) => {
    const client = new HttpIdentityShadowClient(config(), (async () => serverResponse) as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category });
  });

  it("rejects unknown outer response fields after assertion verification", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const valid = await signedResponse(init); return response({ ...await valid.json(), unknown: true });
    });
    await expect(new HttpIdentityShadowClient(config(), fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z")).validate(input))
      .rejects.toMatchObject({ category: "RESPONSE_INVALID" });
  });

  it("aborts at the hard deadline and never retries", async () => {
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    await expect(new HttpIdentityShadowClient({ ...config(), timeoutMs: 5 }, fetcher as typeof fetch).validate(input))
      .rejects.toMatchObject({ category: "TIMEOUT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails closed when service assertion signing fails", async () => {
    const client = new HttpIdentityShadowClient({ ...config(), requestPrivateKey: "not-a-key" }, vi.fn() as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category: "ASSERTION_SIGNING_FAILED" });
  });

  it("rejects a schema-valid outer response whose assertion signature is invalid", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const valid = await signedResponse(init);
      const body = await valid.json();
      const parts = body.assertion.split(".");
      parts[2] = `${parts[2][0] === "a" ? "b" : "a"}${parts[2].slice(1)}`;
      body.assertion = parts.join(".");
      return response(body);
    });
    await expect(new HttpIdentityShadowClient(config(), fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z")).validate(input))
      .rejects.toMatchObject({ category: "invalid_signature" });
  });

  it("rejects outer identity fields that differ from verified signed claims", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const valid = await signedResponse(init); const body = await valid.json(); body.displayName = "Tampered"; return response(body);
    });
    await expect(new HttpIdentityShadowClient(config(), fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z")).validate(input))
      .rejects.toMatchObject({ category: "assertion_response_mismatch" });
  });
});
