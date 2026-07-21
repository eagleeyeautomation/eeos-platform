import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { assertRuntimeStateStorageConfig, databaseHealthCheck } from "../db/postgres";
import { assertOAuthSigningConfig } from "../oauth/provider";

const REQUIRED_PRODUCTION_VARIABLES = [
  "DATABASE_URL",
  "POSTGRES_DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "OAUTH_SERVER_URL",
] as const;

export function assertCoreProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  const environment = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();
  if (environment !== "staging" && environment !== "production") return;

  const missing = REQUIRED_PRODUCTION_VARIABLES.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Core configuration error: missing required production environment variables: ${missing.join(", ")}.`);
  }

  assertRuntimeStateStorageConfig(env);
  assertOAuthSigningConfig(env);
}

export type CoreReadinessDependencies = {
  mysqlReady(): Promise<boolean>;
  postgresReady(): Promise<boolean>;
};

const readinessDependencies: CoreReadinessDependencies = {
  async mysqlReady() {
    const database = await getDb();
    if (!database) return false;
    await database.execute(sql`select 1`);
    return true;
  },
  async postgresReady() {
    return (await databaseHealthCheck()).reachable;
  },
};

export async function getCoreReadiness(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: CoreReadinessDependencies = readinessDependencies,
) {
  try {
    assertCoreProductionConfig(env);
  } catch {
    return { ready: false, configuration: false, mysql: false, postgres: false };
  }

  const [mysql, postgres] = await Promise.all([
    dependencyReady(dependencies.mysqlReady),
    dependencyReady(dependencies.postgresReady),
  ]);
  return { ready: mysql && postgres, configuration: true, mysql, postgres };
}

async function dependencyReady(check: () => Promise<boolean>) {
  try {
    return await check();
  } catch {
    return false;
  }
}
