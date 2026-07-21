import "dotenv/config";
import type { IncomingMessage } from "http";
// Generated during `pnpm run build` and explicitly included in the Vercel function bundle.
// @ts-ignore
import app from "../dist/serverless-app.js";

function restoreExpressApiPath(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  const originalUrl = req.url || "/";
  const url = new URL(originalUrl, `https://${host}`);
  const path = url.searchParams.get("path");

  if (!path) {
    return;
  }

  url.searchParams.delete("path");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  req.url = `/api${normalizedPath}${url.search}`;
}

export default function handler(req: IncomingMessage, res: Parameters<typeof app>[1]) {
  restoreExpressApiPath(req);
  return app(req, res);
}
