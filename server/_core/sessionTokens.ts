import { createHash, randomBytes } from "crypto";
import type { Request } from "express";

export const AUTH_TOKEN_BYTES = 32;

export function createOpaqueToken() {
  return randomBytes(AUTH_TOKEN_BYTES).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readClientIp(req: Request) {
  // Express resolves req.ip using the application's explicit trust-proxy policy.
  // Reading X-Forwarded-For directly would let callers influence rate-limit keys.
  return req.ip || req.socket.remoteAddress || null;
}

export function readUserAgent(req: Request) {
  return req.header("user-agent")?.slice(0, 2048) || null;
}
