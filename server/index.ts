import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  assertRuntimeStateStorageConfig,
  closeDatabasePool,
  databaseHealthCheck,
  getRuntimeStateStorageMode,
  waitForDatabase,
} from "./db/postgres";
import { registerGoHighLevelRoutes } from "./integrations/gohighlevel";
import { registerOAuthProviderRoutes } from "./oauth/provider";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  assertRuntimeStateStorageConfig();

  if (process.env.DATABASE_URL) {
    await waitForDatabase();
  }

  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);
  app.use(configureCors);
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      },
    }),
  );

  app.get("/health", async (_req, res) => {
    try {
      const database = await databaseHealthCheck();

      res.status(database.configured && !database.reachable ? 503 : 200).json({
        ok: !database.configured || database.reachable,
        service: "eeos-backend",
        runtimeStateProvider: getRuntimeStateStorageMode(),
        database,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        service: "eeos-backend",
        database: { configured: Boolean(process.env.DATABASE_URL), reachable: false },
        message: error instanceof Error ? error.message : "Health check failed.",
      });
    }
  });

  registerGoHighLevelRoutes(app);
  registerOAuthProviderRoutes(app);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT || 3000);

  server.listen(port, "0.0.0.0", () => {
    logServer("info", "server.started", { port, host: "0.0.0.0", runtimeStateProvider: getRuntimeStateStorageMode() });
  });

  const shutdown = async (signal: string) => {
    logServer("info", "server.shutdown.started", { signal });
    server.close(async () => {
      await closeDatabasePool();
      logServer("info", "server.shutdown.complete", { signal });
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

function configureCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.header("origin");
  const allowedOrigins = readAllowedOrigins();

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-EEOS-CSRF-Token, X-EEOS-Webhook-Secret, X-GHL-Signature, X-HighLevel-Signature",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(origin && !allowedOrigins.has(origin) ? 403 : 204).end();
    return;
  }

  next();
}

function readAllowedOrigins() {
  return new Set(
    (process.env.EEOS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
}

function logServer(level: "info" | "error", event: string, metadata: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    event,
    service: "eeos-backend",
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

startServer().catch((error) => {
  logServer("error", "server.start.failed", { message: error instanceof Error ? error.message : "Unknown startup error." });
  process.exit(1);
});
