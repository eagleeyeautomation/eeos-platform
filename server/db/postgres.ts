import { Pool, type PoolClient } from "pg";

type RuntimeStateStorageMode = "filesystem" | "postgres";

let pool: Pool | null = null;

export function getRuntimeStateStorageMode(env: NodeJS.ProcessEnv = process.env): RuntimeStateStorageMode {
  const appEnv = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();
  const provider = (env.EEOS_RUNTIME_STATE_PROVIDER || "").toLowerCase();
  const persistentEnvironment = appEnv === "staging" || appEnv === "production" || Boolean(env.RAILWAY_ENVIRONMENT);

  if (provider === "filesystem" && persistentEnvironment) {
    return "postgres";
  }

  if (provider === "postgres" || persistentEnvironment) {
    return "postgres";
  }

  return "filesystem";
}

export function assertRuntimeStateStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = getRuntimeStateStorageMode(env);

  if (mode === "postgres" && !env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for staging and production runtime persistence.");
  }

  if (mode === "postgres" && env.GHL_TOKEN_VAULT_FILE) {
    throw new Error("GHL_TOKEN_VAULT_FILE is local-development only and must not be set in staging or production.");
  }
}

export function createDatabasePool(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DATABASE_URL) {
    return null;
  }

  const sslEnabled = readBoolean(env.DATABASE_SSL, true);
  const connectionTimeoutMillis = readNumber(env.DATABASE_CONNECTION_TIMEOUT_MS, 5_000);
  const queryTimeoutMillis = readNumber(env.DATABASE_QUERY_TIMEOUT_MS, 5_000);

  const createdPool = new Pool({
    connectionString: env.DATABASE_URL,
    max: readNumber(env.DATABASE_POOL_MAX, 10),
    idleTimeoutMillis: readNumber(env.DATABASE_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMillis,
    query_timeout: queryTimeoutMillis,
    statement_timeout: queryTimeoutMillis,
    ssl: sslEnabled ? { rejectUnauthorized: readBoolean(env.DATABASE_SSL_REJECT_UNAUTHORIZED, false) } : false,
  });

  createdPool.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        component: "database",
        event: "postgres.pool_error",
        error: sanitizeDatabaseError(error),
      }),
    );
  });

  return createdPool;
}

export function getDatabasePool() {
  if (!pool) {
    pool = createDatabasePool();
  }

  return pool;
}

export async function closeDatabasePool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}

export async function withDatabase<T>(callback: (client: PoolClient) => Promise<T>) {
  const activePool = getDatabasePool();

  if (!activePool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const client = await activePool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  return withDatabase(async (client) => {
    await client.query("BEGIN");

    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function waitForDatabase(maxAttempts = 5) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await databaseHealthCheck();
      return;
    } catch (error) {
      lastError = error;
      await sleep(Math.min(1_000 * attempt, 5_000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Database connection failed.");
}

export async function databaseHealthCheck() {
  const activePool = getDatabasePool();

  if (!activePool) {
    return { configured: false, reachable: false };
  }

  const result = await activePool.query<{ ok: number }>("select 1 as ok");

  return { configured: true, reachable: result.rows[0]?.ok === 1 };
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown database error.";
  }

  return error.message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@");
}
