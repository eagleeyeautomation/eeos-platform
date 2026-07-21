import { createPublicKey, generateKeyPairSync, verify } from "crypto";
import { createServer } from "http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { assertOAuthSigningConfig, registerOAuthProviderRoutes, signJwt } from "./provider";

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  APP_ENV: process.env.APP_ENV,
  EEOS_OAUTH_PRIVATE_KEY_PEM: process.env.EEOS_OAUTH_PRIVATE_KEY_PEM,
};

afterEach(() => {
  restoreEnvironment("NODE_ENV", originalEnvironment.NODE_ENV);
  restoreEnvironment("APP_ENV", originalEnvironment.APP_ENV);
  restoreEnvironment("EEOS_OAUTH_PRIVATE_KEY_PEM", originalEnvironment.EEOS_OAUTH_PRIVATE_KEY_PEM);
});

describe("OAuth signing-key configuration", () => {
  it("rejects a missing production key", () => {
    expect(() => assertOAuthSigningConfig({ NODE_ENV: "production" })).toThrow(
      /EEOS_OAUTH_PRIVATE_KEY_PEM is required/,
    );
  });

  it("rejects a malformed production key", () => {
    expect(() => assertOAuthSigningConfig({
      NODE_ENV: "production",
      EEOS_OAUTH_PRIVATE_KEY_PEM: "not-a-private-key",
    })).toThrow(/not a usable RSA private key/);
  });

  it("accepts a valid configured RSA private key", () => {
    const privateKey = createTestPrivateKey();
    expect(() => assertOAuthSigningConfig({
      NODE_ENV: "production",
      EEOS_OAUTH_PRIVATE_KEY_PEM: privateKey,
    })).not.toThrow();
  });

  it("permits the existing ephemeral fallback outside production", () => {
    expect(() => assertOAuthSigningConfig({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertOAuthSigningConfig({ NODE_ENV: "test" })).not.toThrow();
  });

  it("publishes the public key matching the configured private key", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_ENV;
    process.env.EEOS_OAUTH_PRIVATE_KEY_PEM = createTestPrivateKey();

    const app = express();
    registerOAuthProviderRoutes(app);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("OAuth signing-key test server did not start.");

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/oauth/jwks.json`);
      const body = await response.json() as { keys: JsonWebKey[] };
      const token = signJwt({ sub: "test-user" });
      const [header, payload, signature] = token.split(".");
      const publicKey = createPublicKey({ key: body.keys[0], format: "jwk" });

      expect(response.status).toBe(200);
      expect(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url"))).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

function createTestPrivateKey() {
  return generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
    format: "pem",
    type: "pkcs8",
  }).toString();
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
