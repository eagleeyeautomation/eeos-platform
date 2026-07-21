import type { IncomingMessage, ServerResponse } from "http";
import identityServiceHandler from "../../../server/identity-service/vercel";

function restoreIdentityServicePath(req: IncomingMessage) {
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const path = url.searchParams.get("path");
  if (path === null) return;
  url.searchParams.delete("path");
  req.url = `/${path}${url.search}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  restoreIdentityServicePath(req);
  return identityServiceHandler(req, res);
}
