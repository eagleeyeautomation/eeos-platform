import "dotenv/config";
import { createServer } from "http";
import { createIdentityServiceApp } from "./app";
import { loadIdentityServiceConfig } from "./config";
import { createIdentityLogger } from "./logging";
import { installIdentityServiceShutdown } from "./shutdown";

import { validateIdentityServiceStartup } from "./startup";

export async function startIdentityService(env: NodeJS.ProcessEnv = process.env) {
  const config = loadIdentityServiceConfig(env);
  await validateIdentityServiceStartup(config);
  const logger = createIdentityLogger(config.logLevel);
  const app = createIdentityServiceApp(config, { logger });
  const server = createServer(app);
  server.listen(config.port, config.host, () => logger.log("info", "service.started", {
    adapterConfigured: config.identityAdapterConfigured,
  }));
  installIdentityServiceShutdown(server, logger);
  return server;
}

if (process.env.NODE_ENV !== "test") {
  void startIdentityService().catch((error) => {
    const logger = createIdentityLogger("info");
    logger.log("error", "service.start_failed", {
      errorCode: "IDENTITY_SERVICE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "Configuration validation failed.",
    });
    process.exitCode = 1;
  });
}
