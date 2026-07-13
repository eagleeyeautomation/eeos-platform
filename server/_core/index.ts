import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerGhlOAuthRoutes } from "../ghl-oauth";
import { registerGhlWebhookRoutes } from "../ghl-webhook";
import { registerGhlPitRoutes } from "../ghl-pit";
import { registerOAuthProviderRoutes, sendOpenIdConfiguration } from "../oauth/provider";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  // NOTE: GHL webhook route uses its own raw body parser for HMAC verification
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/.well-known/openid-configuration", sendOpenIdConfiguration);

  // Register all routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);          // Manus OAuth: /api/oauth/callback
  registerGhlOAuthRoutes(app);       // GHL OAuth: /api/ghl/auth, /api/ghl/callback, /api/ghl/status
  registerGhlPitRoutes(app);         // GHL PIT: /api/ghl/pit/connect, /api/ghl/pit/verify, /api/ghl/pit/disconnect
  registerGhlWebhookRoutes(app);     // GHL Webhooks: /api/webhooks/ghl
  registerOAuthProviderRoutes(app);  // EEOS OAuth Provider: /.well-known/*, /oauth/*

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "eeos-platform",
      timestamp: new Date().toISOString(),
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || 3000);
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
