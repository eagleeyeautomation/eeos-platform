import { createHash } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { ContractServiceAssertionVerifier, InMemoryReplayStore, JwksServiceAssertionDecoder } from "./security";

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgHnjxw5HoUp1BbWC2
V0crba4CjwcGlCF+YvNgPwdXP4ihRANCAAQefC8aopwrhF1SXKADZ5zi77JOzUmf
SSPGYQZh9k3eULzUzEH9uTPRsrV+jGu39W0vUpAfLQOv4W9fu6BtK832
-----END PRIVATE KEY-----`;
const jwks = JSON.stringify({ keys: [{ kty: "EC", x: "HnwvGqKcK4RdUlygA2ec4u-yTs1Jn0kjxmEGYfZN3lA",
  y: "vNTMQf25M9GytX6Ma7f1bS9SkB8tA6_hb1-7oG0rzfY", crv: "P-256", alg: "ES256", use: "sig", kid: "c4-test-key" }] });
const now = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ schemaVersion: "v1", requestId: "request_1234567890", timestamp: "2026-07-21T12:00:00.000Z", nonce: "nonce_1234567890123456" });
const binding = { requestId: "request_1234567890", method: "POST" as const, path: "/internal/v1/session/validate" as const,
  bodySha256: createHash("sha256").update(body).digest("hex"), nonce: "nonce_1234567890123456" };

async function token(subject = "eeos-core-platform", kid = "c4-test-key") {
  const key = await importPKCS8(privateKey, "ES256");
  return new SignJWT({ request: binding }).setProtectedHeader({ alg: "ES256", typ: "JWT", kid })
    .setIssuer("eeos-core-platform").setAudience("eeos-identity-service").setSubject(subject)
    .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + 30).setJti("service_request_1234").sign(key);
}

describe("real Core Platform service assertion verification", () => {
  it("verifies ES256 JWKS, issuer, audience, client, temporal, binding, kid, and replay", async () => {
    const verifier = new ContractServiceAssertionVerifier(
      new JwksServiceAssertionDecoder(jwks, "eeos-core-platform", "eeos-identity-service", "eeos-core-platform"),
      new InMemoryReplayStore(() => now), () => now,
    );
    await expect(verifier.verify(await token(), binding)).resolves.toEqual({ assertionId: "service_request_1234", clientId: "eeos-core-platform" });
    await expect(verifier.verify(await token(), binding)).rejects.toMatchObject({ status: 401, code: "IDENTITY_SERVICE_ASSERTION_REPLAYED" });
  });

  it("fails closed for an untrusted client and unknown kid", async () => {
    const decoder = new JwksServiceAssertionDecoder(jwks, "eeos-core-platform", "eeos-identity-service", "eeos-core-platform");
    const verifier = new ContractServiceAssertionVerifier(decoder, new InMemoryReplayStore(() => now), () => now);
    await expect(verifier.verify(await token("other-client"), binding)).rejects.toMatchObject({ status: 401, code: "IDENTITY_SERVICE_AUTH_INVALID" });
    await expect(verifier.verify(await token("eeos-core-platform", "other-key"), binding)).rejects.toMatchObject({ status: 401, code: "IDENTITY_SERVICE_AUTH_INVALID" });
  });
});
