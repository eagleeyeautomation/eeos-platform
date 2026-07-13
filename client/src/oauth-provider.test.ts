import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { oauthProviderInternals } from "../../server/oauth/provider";

describe("EEOS OAuth provider internals", () => {
  it("generates a production-style client secret once", () => {
    const { clientSecret } = oauthProviderInternals.generateOAuthClientSecret();

    expect(clientSecret).toMatch(/^eeos_secret_/);
    expect(clientSecret.length).toBeGreaterThan(40);
  });

  it("generates production-style refresh tokens", () => {
    const token = oauthProviderInternals.generateOAuthRefreshToken();

    expect(token).toMatch(/^eeos_refresh_/);
    expect(token.length).toBeGreaterThan(60);
  });

  it("verifies S256 PKCE challenges", () => {
    const verifier = "test-verifier-value";
    const challenge = Buffer.from(awaitDigest(verifier), "hex").toString("base64url");

    expect(oauthProviderInternals.verifyPkce(verifier, challenge)).toBe(true);
    expect(oauthProviderInternals.verifyPkce("bad-verifier", challenge)).toBe(false);
  });

  it("signs RS256 JWTs with three compact parts", () => {
    const token = oauthProviderInternals.signJwt({ sub: "subject", aud: "client" });
    const [header, payload, signature] = token.split(".");

    expect(header).toBeTruthy();
    expect(payload).toBeTruthy();
    expect(signature).toBeTruthy();
    expect(JSON.parse(Buffer.from(header, "base64url").toString("utf8"))).toMatchObject({
      alg: "RS256",
      typ: "JWT",
    });
  });
});

function awaitDigest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
