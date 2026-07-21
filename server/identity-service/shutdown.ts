import type { Server } from "http";
import type { IdentityLogger } from "./logging";

export type CleanupHook = () => void | Promise<void>;

export function installIdentityServiceShutdown(
  server: Server,
  logger: IdentityLogger,
  cleanupHooks: CleanupHook[] = [],
  timeoutMs = 10_000,
) {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log("info", "shutdown.started", { signal });
    const timer = setTimeout(() => {
      logger.log("error", "shutdown.timeout", { signal });
      process.exitCode = 1;
      server.closeAllConnections?.();
    }, timeoutMs);
    timer.unref();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled(cleanupHooks.map((hook) => hook()));
    clearTimeout(timer);
    logger.log("info", "shutdown.complete", { signal });
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  return shutdown;
}
