import { describe, expect, it } from "vitest";
import { assertRuntimeStateStorageConfig, getRuntimeStateStorageMode } from "../../server/db/postgres";

describe("runtime persistence mode", () => {
  it("uses the local filesystem provider only for local development", () => {
    expect(getRuntimeStateStorageMode({ APP_ENV: "development" })).toBe("filesystem");
    expect(getRuntimeStateStorageMode({ NODE_ENV: "test" })).toBe("filesystem");
  });

  it("forces PostgreSQL persistence for staging, production, and Railway", () => {
    expect(getRuntimeStateStorageMode({ APP_ENV: "staging", DATABASE_URL: "postgres://example" })).toBe("postgres");
    expect(getRuntimeStateStorageMode({ NODE_ENV: "production", DATABASE_URL: "postgres://example" })).toBe("postgres");
    expect(getRuntimeStateStorageMode({ RAILWAY_ENVIRONMENT: "staging", DATABASE_URL: "postgres://example" })).toBe("postgres");
  });

  it("rejects filesystem token vault configuration in staging and production", () => {
    expect(() =>
      assertRuntimeStateStorageConfig({
        APP_ENV: "staging",
        DATABASE_URL: "postgres://example",
        GHL_TOKEN_VAULT_FILE: "/tmp/eeos-token-vault.json",
      }),
    ).toThrow(/GHL_TOKEN_VAULT_FILE/);

    expect(() =>
      assertRuntimeStateStorageConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://example",
        GHL_TOKEN_VAULT_FILE: "/tmp/eeos-token-vault.json",
      }),
    ).toThrow(/GHL_TOKEN_VAULT_FILE/);
  });

  it("requires DATABASE_URL when staging or production runtime state is persistent", () => {
    expect(() => assertRuntimeStateStorageConfig({ APP_ENV: "staging" })).toThrow(/DATABASE_URL/);
    expect(() => assertRuntimeStateStorageConfig({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });
});
