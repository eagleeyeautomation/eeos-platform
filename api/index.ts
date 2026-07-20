import "dotenv/config";
import type { IncomingMessage } from "http";
// Generated during `pnpm run build` and explicitly included in the Vercel function bundle.
// @ts-ignore
import app from "../dist/serverless-app.js";
import { restoreExpressApiPath } from "../server/_core/vercel-path";

export default function handler(req: IncomingMessage, res: Parameters<typeof app>[1]) {
  restoreExpressApiPath(req);
  return app(req, res);
}
