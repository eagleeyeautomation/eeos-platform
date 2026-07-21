import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import type { Express } from "express";
import { createIdentityServiceApp } from "./app";
import { loadIdentityServiceConfig } from "./config";
import { validateIdentityServiceStartup } from "./startup";

let application: Promise<Express> | undefined;

export function loadIdentityServiceApplication(env: NodeJS.ProcessEnv = process.env) {
  return application ??= (async () => {
    const config = loadIdentityServiceConfig(env);
    await validateIdentityServiceStartup(config);
    return createIdentityServiceApp(config);
  })();
}

export default async function identityServiceHandler(req: IncomingMessage, res: ServerResponse) {
  const app = await loadIdentityServiceApplication();
  return app(req, res);
}
