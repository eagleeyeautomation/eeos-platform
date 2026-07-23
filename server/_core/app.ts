import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerFirstPartyAuthRoutes } from "./firstPartyAuth";
import { registerStorageProxy } from "./storageProxy";
import { registerGhlOAuthRoutes } from "../ghl-oauth";
import { registerGhlWebhookRoutes } from "../ghl-webhook";
import { registerGhlPitRoutes } from "../ghl-pit";
import { registerOAuthProviderRoutes, sendOpenIdConfiguration } from "../oauth/provider";
import { registerPrnPrivateGhlRoutes } from "../prn-private-ghl";
import { registerBusinessMemoryRoutes } from "../business-memory";
import { registerAthenaRoutes } from "../athena";
import { registerAthenaLearningRoutes } from "../athena-learning";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getCoreReadiness } from "./startup";

export function createEeosApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads.
  // NOTE: GHL webhook route uses its own raw body parser for HMAC verification.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/.well-known/openid-configuration", sendOpenIdConfiguration);

  registerStorageProxy(app);
  registerFirstPartyAuthRoutes(app);
  registerGhlOAuthRoutes(app);
  registerGhlPitRoutes(app);
  registerGhlWebhookRoutes(app);
  registerOAuthProviderRoutes(app);
  registerBusinessMemoryRoutes(app);
  registerAthenaRoutes(app);
  registerAthenaLearningRoutes(app);
  registerPrnPrivateGhlRoutes(app);

  app.get("/health/live", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "eeos-platform",
      timestamp: new Date().toISOString(),
    });
  });

  const readiness = async (_req: express.Request, res: express.Response) => {
    const result = await getCoreReadiness();
    res.status(result.ready ? 200 : 503).json({
      status: result.ready ? "ready" : "not_ready",
      service: "eeos-platform",
      checks: {
        configuration: result.configuration,
        mysql: result.mysql,
        postgres: result.postgres,
      },
      timestamp: new Date().toISOString(),
    });
  };

  app.get("/health/ready", readiness);
  app.get("/health", readiness);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
