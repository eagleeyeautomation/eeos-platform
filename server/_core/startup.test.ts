import { generateKeyPairSync } from "crypto";
import { createServer } from "http";
import { describe, expect, it } from "vitest";
import { createEeosApp } from "./app";
import { assertCoreProductionConfig, getCoreReadiness } from "./startup";

const testPrivateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
  format: "pem",
  type: "pkcs8",
}).toString();

const productionConfig = {
  NODE_ENV: "production",
  DATABASE_URL: "mysql://example.invalid/eeos",
  POSTGRES_DATABASE_URL: "postgres://example.invalid/eeos",
  JWT_SECRET: "test-session-secret",
  EEOS_OAUTH_PRIVATE_KEY_PEM: testPrivateKey,
};

describe("Core startup and readiness", () => {
  it("requires every immutable Core production setting", () => {
    expect(() => assertCoreProductionConfig({ NODE_ENV: "production" })).toThrow(
      /DATABASE_URL, POSTGRES_DATABASE_URL, JWT_SECRET/,
    );
    const { EEOS_OAUTH_PRIVATE_KEY_PEM: _omittedKey, ...missingOAuthKey } = productionConfig;
    expect(() => assertCoreProductionConfig(missingOAuthKey)).toThrow(/EEOS_OAUTH_PRIVATE_KEY_PEM is required/);
    expect(() => assertCoreProductionConfig({
      ...productionConfig,
      EEOS_OAUTH_PRIVATE_KEY_PEM: "malformed",
    })).toThrow(/not a usable RSA private key/);
    expect(() => assertCoreProductionConfig(productionConfig)).not.toThrow();
    expect(() => assertCoreProductionConfig({ NODE_ENV: "test" })).not.toThrow();
  });

  it("reports ready only when configuration, MySQL, and PostgreSQL are available", async () => {
    await expect(getCoreReadiness(productionConfig, {
      mysqlReady: async () => true,
      postgresReady: async () => true,
    })).resolves.toEqual({ ready: true, configuration: true, mysql: true, postgres: true });

    await expect(getCoreReadiness(productionConfig, {
      mysqlReady: async () => true,
      postgresReady: async () => false,
    })).resolves.toEqual({ ready: false, configuration: true, mysql: true, postgres: false });

    await expect(getCoreReadiness({ NODE_ENV: "production" }, {
      mysqlReady: async () => true,
      postgresReady: async () => true,
    })).resolves.toEqual({ ready: false, configuration: false, mysql: false, postgres: false });
  });

  it("separates liveness from dependency-backed readiness", async () => {
    const server = createServer(createEeosApp());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Core health test server did not start.");
    try {
      const baseUrl = `http://127.0.0.1:${address.port}`;
      expect((await fetch(`${baseUrl}/health/live`)).status).toBe(200);
      expect((await fetch(`${baseUrl}/health/ready`)).status).toBe(503);
      expect((await fetch(`${baseUrl}/health`)).status).toBe(503);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
