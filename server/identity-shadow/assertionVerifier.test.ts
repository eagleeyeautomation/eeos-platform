import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertOuterResponseMatchesClaims, CoreIdentityAssertionVerifier, parseTrustedAssertionJwks,
} from "./assertionVerifier";

const now = new Date("2026-07-21T12:00:00Z");
const seconds = now.getTime() / 1_000;
const request = { requestId: "request_1234567890", method: "POST" as const, path: "/internal/v1/session/validate" as const,
  bodySha256: "a".repeat(64), nonce: "nonce_1234567890123456" };
const claims = { schemaVersion: "v1", authenticated: true, iss: "eeos-identity-service", aud: "eeos-core-platform", sub: "1",
  iat: seconds, nbf: seconds, exp: seconds + 60, jti: request.requestId, sessionVersion: "0", userId: "1",
  organizationId: "10", membershipId: "20", subaccountId: "30", platformRole: "admin", membershipRole: "owner",
  authorizedGhlLocationId: "loc-a", authorizedSubaccountIds: ["30"], displayName: "User", email: null,
  expiresAt: "2026-07-21T12:01:00.000Z", scope: ["identity:validated"], request };

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: JWK;
let otherPublicJwk: JWK;
beforeAll(async () => {
  const first = await generateKeyPair("ES256", { extractable: true });
  const second = await generateKeyPair("ES256", { extractable: true });
  privateKey = first.privateKey; otherPrivateKey = second.privateKey;
  publicJwk = { ...await exportJWK(first.publicKey), kid: "ephemeral-one", alg: "ES256", use: "sig" };
  otherPublicJwk = { ...await exportJWK(second.publicKey), kid: "ephemeral-two", alg: "ES256", use: "sig" };
});

const token = (payload: Record<string, unknown> = claims, options: { key?: CryptoKey; kid?: string; alg?: "ES256" } = {}) =>
  new SignJWT(payload).setProtectedHeader({ alg: options.alg ?? "ES256", typ: "JWT", ...(options.kid === "" ? {} : { kid: options.kid ?? "ephemeral-one" }) })
    .sign(options.key ?? privateKey);
const verifier = (keys: JWK[] = [publicJwk]) => new CoreIdentityAssertionVerifier({ keys }, () => now);

describe("Core Identity response assertion verifier", () => {
  it("verifies complete v1 claims and selects the matching key during rotation", async () => {
    await expect(verifier([otherPublicJwk, publicJwk]).verify(await token(), request)).resolves.toMatchObject({
      schemaVersion: "v1", authenticated: true, authorizedSubaccountIds: ["30"], displayName: "User",
    });
  });

  it.each([
    ["missing kid", () => token(claims, { kid: "" }), "missing_kid"],
    ["unknown kid", () => token(claims, { kid: "unknown" }), "unknown_kid"],
    ["wrong key", () => token(claims, { key: otherPrivateKey }), "invalid_signature"],
    ["wrong issuer", () => token({ ...claims, iss: "other" }), "invalid_issuer"],
    ["wrong audience", () => token({ ...claims, aud: "other" }), "invalid_audience"],
    ["expired", () => token({ ...claims, exp: seconds - 1, expiresAt: "2026-07-21T11:59:59.000Z" }), "expired_assertion"],
    ["missing expiration", () => { const { exp: _exp, ...rest } = claims; return token(rest); }, "missing_expiration"],
    ["missing version", () => { const { schemaVersion: _version, ...rest } = claims; return token(rest); }, "invalid_contract"],
    ["wrong version", () => token({ ...claims, schemaVersion: "v2" }), "invalid_contract"],
    ["invalid claims", () => token({ ...claims, userId: "not-an-id" }), "invalid_claims"],
  ] as const)("rejects %s", async (_label, build, category) => {
    await expect(verifier().verify(await build(), request)).rejects.toMatchObject({ category });
  });

  it("rejects duplicate kid, malformed tokens, unsupported algorithms, and invalid keys", async () => {
    await expect(verifier([publicJwk, { ...publicJwk }]).verify(await token())).rejects.toMatchObject({ category: "duplicate_kid" });
    await expect(verifier().verify("not-a-jwt")).rejects.toMatchObject({ category: "malformed_assertion" });
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none", kid: "ephemeral-one" })).toString("base64url")}.${Buffer.from("{}").toString("base64url")}.`;
    await expect(verifier().verify(unsigned)).rejects.toMatchObject({ category: "unsupported_algorithm" });
    await expect(verifier([{ kty: "RSA", kid: "ephemeral-one" }]).verify(await token())).rejects.toMatchObject({ category: "invalid_trusted_jwks" });
    const hs = await new SignJWT(claims).setProtectedHeader({ alg: "HS256", kid: "ephemeral-one" })
      .sign(new TextEncoder().encode("ephemeral-test-secret-with-sufficient-length"));
    await expect(verifier().verify(hs)).rejects.toMatchObject({ category: "unsupported_algorithm" });
    const rsa = await generateKeyPair("RS256");
    const rs = await new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "ephemeral-one" }).sign(rsa.privateKey);
    await expect(verifier().verify(rs)).rejects.toMatchObject({ category: "unsupported_algorithm" });
  });

  it("rejects malformed and empty trusted JWKS without exposing it", () => {
    expect(() => parseTrustedAssertionJwks("{")).toThrowError(expect.objectContaining({ category: "invalid_trusted_jwks" }));
    expect(() => parseTrustedAssertionJwks('{"keys":[]}')).toThrowError(expect.objectContaining({ category: "invalid_trusted_jwks" }));
  });

  it("rejects mismatched outer compatibility fields", async () => {
    const verified = await verifier().verify(await token(), request);
    const outer = { ...claims, displayName: "Changed" };
    expect(() => assertOuterResponseMatchesClaims(outer, verified)).toThrowError(expect.objectContaining({ category: "assertion_response_mismatch" }));
  });
});
