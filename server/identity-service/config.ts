import { z } from "zod";
import {
  IDENTITY_CONTRACT_VERSION,
  SERVICE_REQUEST_AUDIENCE,
  SERVICE_REQUEST_ISSUER,
} from "../../shared/identityServiceContract.js";

const environmentSchema = z.enum(["local", "development", "test", "preview", "staging", "production"]);
const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export type IdentityServiceConfig = {
  host: string;
  port: number;
  environment: z.infer<typeof environmentSchema>;
  logLevel: z.infer<typeof logLevelSchema>;
  expectedAudience: string;
  expectedIssuer: string;
  expectedClientId: string;
  trustedClientJwks?: string;
  assertionPrivateKey?: string;
  assertionKeyId?: string;
  legacyMysqlDatabaseUrl?: string;
  sessionSecret?: string;
  mysqlConnectionTimeoutMs: number;
  identityAdapterConfigured: boolean;
  contractVersion: string;
  replayStoreProvider: "memory" | "redis";
};

export function loadIdentityServiceConfig(env: NodeJS.ProcessEnv = process.env): IdentityServiceConfig {
  const environment = environmentSchema.parse(env.IDENTITY_SERVICE_ENV ?? env.NODE_ENV ?? "development");
  const replayStoreProvider = z.enum(["memory", "redis"]).parse(env.IDENTITY_SERVICE_REPLAY_STORE ?? "memory");
  const securityRequired = ["preview", "staging", "production"].includes(environment);
  const required = (name: string, value: string | undefined) => {
    if (securityRequired && !value) throw new Error(`${name} is required for ${environment}.`);
    return value;
  };

  const port = Number(env.IDENTITY_SERVICE_PORT ?? "3100");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("IDENTITY_SERVICE_PORT is invalid.");
  const expectedAudience = required("IDENTITY_SERVICE_EXPECTED_AUDIENCE", env.IDENTITY_SERVICE_EXPECTED_AUDIENCE)
    ?? SERVICE_REQUEST_AUDIENCE;
  const expectedIssuer = required("IDENTITY_SERVICE_EXPECTED_ISSUER", env.IDENTITY_SERVICE_EXPECTED_ISSUER)
    ?? SERVICE_REQUEST_ISSUER;
  if (expectedAudience !== SERVICE_REQUEST_AUDIENCE) throw new Error("IDENTITY_SERVICE_EXPECTED_AUDIENCE does not match contract v1.");
  if (expectedIssuer !== SERVICE_REQUEST_ISSUER) throw new Error("IDENTITY_SERVICE_EXPECTED_ISSUER does not match contract v1.");
  const expectedClientId = required("IDENTITY_SERVICE_EXPECTED_CLIENT_ID", env.IDENTITY_SERVICE_EXPECTED_CLIENT_ID)
    ?? SERVICE_REQUEST_ISSUER;
  const mysqlConnectionTimeoutMs = Number(env.IDENTITY_SERVICE_MYSQL_CONNECTION_TIMEOUT_MS ?? "5000");
  if (!Number.isInteger(mysqlConnectionTimeoutMs) || mysqlConnectionTimeoutMs < 100 || mysqlConnectionTimeoutMs > 30_000) {
    throw new Error("IDENTITY_SERVICE_MYSQL_CONNECTION_TIMEOUT_MS is invalid.");
  }
  const legacyMysqlDatabaseUrl = required("LEGACY_MYSQL_DATABASE_URL", env.LEGACY_MYSQL_DATABASE_URL);
  const sessionSecret = required("JWT_SECRET", env.JWT_SECRET);

  return {
    host: env.IDENTITY_SERVICE_HOST ?? "127.0.0.1",
    port,
    environment,
    logLevel: logLevelSchema.parse(env.IDENTITY_SERVICE_LOG_LEVEL ?? "info"),
    expectedAudience,
    expectedIssuer,
    expectedClientId,
    trustedClientJwks: required("IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS", env.IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS),
    assertionPrivateKey: required("IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY", env.IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY),
    assertionKeyId: required("IDENTITY_SERVICE_ASSERTION_KEY_ID", env.IDENTITY_SERVICE_ASSERTION_KEY_ID),
    legacyMysqlDatabaseUrl,
    sessionSecret,
    mysqlConnectionTimeoutMs,
    identityAdapterConfigured: Boolean(legacyMysqlDatabaseUrl && sessionSecret),
    contractVersion: env.IDENTITY_SERVICE_CONTRACT_VERSION ?? IDENTITY_CONTRACT_VERSION,
    replayStoreProvider,
  };
}
