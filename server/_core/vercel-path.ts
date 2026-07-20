import type { IncomingMessage } from "http";

export function restoreExpressApiPath(req: IncomingMessage) {
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
