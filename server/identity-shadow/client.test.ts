import { createHash } from "crypto";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { describe, expect, it, vi } from "vitest";
import { HttpIdentityShadowClient } from "./client";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgHnjxw5HoUp1BbWC2
V0crba4CjwcGlCF+YvNgPwdXP4ihRANCAAQefC8aopwrhF1SXKADZ5zi77JOzUmf
SSPGYQZh9k3eULzUzEH9uTPRsrV+jGu39W0vUpAfLQOv4W9fu6BtK832
-----END PRIVATE KEY-----`;
const publicJwk = { kty: "EC", x: "HnwvGqKcK4RdUlygA2ec4u-yTs1Jn0kjxmEGYfZN3lA", y: "vNTMQf25M9GytX6Ma7f1bS9SkB8tA6_hb1-7oG0rzfY", crv: "P-256" };
const config = { serviceUrl: "https://identity.example.test", clientId: "eeos-core-platform", requestPrivateKey: privateKey,
  requestKeyId: "c5-test-key", timeoutMs: 50 };
const input = { requestId: "request_1234567890", requestedGhlLocationId: "loc-a", session: { cookie: "session-secret" } };
const validResponse = { schemaVersion: "v1", authenticated: true, userId: "1", organizationId: "10", membershipId: "20",
  subaccountId: "30", platformRole: "admin", membershipRole: "owner", authorizedGhlLocationId: "loc-a",
  authorizedSubaccountIds: ["30"], displayName: "User", email: null, sessionVersion: "0",
  assertion: "identity-assertion-value-1234567890", expiresAt: "2026-07-21T12:01:00.000Z" };
const response = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers });

describe("Core Platform Identity Service shadow client", () => {
  it("sends a bound ES256 assertion and keeps the session out of JSON", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body); const headers = new Headers(init?.headers);
      expect(body).not.toContain("session-secret");
      expect(headers.get("cookie")).toBe("app_session_id=session-secret");
      expect(headers.get("x-eeos-session-authorization")).toBeNull();
      const assertion = headers.get("authorization")!.slice(7);
      expect(decodeProtectedHeader(assertion)).toMatchObject({ alg: "ES256", typ: "JWT", kid: "c5-test-key" });
      const key = await importJWK(publicJwk, "ES256");
      const { payload } = await jwtVerify(assertion, key, { issuer: "eeos-core-platform", audience: "eeos-identity-service",
        currentDate: new Date("2026-07-21T12:00:00Z") });
      expect(payload.sub).toBe("eeos-core-platform");
      expect(payload.request).toMatchObject({ requestId: input.requestId, method: "POST", path: "/internal/v1/session/validate",
        bodySha256: createHash("sha256").update(body).digest("hex") });
      return response(validResponse);
    });
    await expect(new HttpIdentityShadowClient(config, fetcher as typeof fetch, () => new Date("2026-07-21T12:00:00Z")).validate(input))
      .resolves.toEqual({ kind: "success", value: validResponse });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the transitional session header only when cookie is absent", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("cookie")).toBeNull();
      expect(headers.get("x-eeos-session-authorization")).toBe("Bearer bearer-secret");
      expect(String(init?.body)).not.toContain("bearer-secret");
      return response(validResponse);
    });
    await new HttpIdentityShadowClient(config, fetcher as typeof fetch).validate({ ...input, session: { bearer: "bearer-secret" } });
  });

  it.each([[503, "HTTP_503"], [500, "HTTP_500"]])("maps HTTP %s to a shadow error", async (status, category) => {
    const client = new HttpIdentityShadowClient(config, (async () => response({ error: "safe" }, status)) as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category });
  });

  it("normalizes frozen 401 and 403 identity errors for semantic comparison", async () => {
    for (const [status, code] of [[401, "IDENTITY_USER_NOT_FOUND"], [403, "IDENTITY_LOCATION_UNAUTHORIZED"]] as const) {
      const body = { error: { code, message: "Identity request failed.", requestId: input.requestId, retryable: false } };
      await expect(new HttpIdentityShadowClient(config, (async () => response(body, status)) as typeof fetch).validate(input))
        .resolves.toEqual({ kind: "identity_error", category: code });
    }
  });

  it.each([
    ["malformed JSON", new Response("{", { status: 200 }), "RESPONSE_INVALID"],
    ["unknown field", response({ ...validResponse, unknown: true }), "RESPONSE_INVALID"],
    ["oversized", new Response("x".repeat(16_385), { status: 200 }), "RESPONSE_OVERSIZED"],
  ])("rejects %s", async (_label, serverResponse, category) => {
    const client = new HttpIdentityShadowClient(config, (async () => serverResponse) as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category });
  });

  it("aborts at the hard deadline and never retries", async () => {
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    await expect(new HttpIdentityShadowClient({ ...config, timeoutMs: 5 }, fetcher as typeof fetch).validate(input))
      .rejects.toMatchObject({ category: "TIMEOUT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fails closed when service assertion signing fails", async () => {
    const client = new HttpIdentityShadowClient({ ...config, requestPrivateKey: "not-a-key" }, vi.fn() as typeof fetch);
    await expect(client.validate(input)).rejects.toMatchObject({ category: "ASSERTION_SIGNING_FAILED" });
  });
});
