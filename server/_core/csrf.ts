import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { sdk } from "./sdk";

const EEOS_CSRF_COOKIE = "eeos_csrf";

function deriveSessionCsrfToken(req: Request) {
  const sessionToken = sdk.readSessionToken(req);
  const signingSecret = process.env.JWT_SECRET;
  if (!sessionToken || !signingSecret) return "";

  return createHmac("sha256", signingSecret)
    .update("eeos:gohighlevel:oauth:csrf:")
    .update(sessionToken)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueSessionCsrfToken(req: Request, res: Response) {
  const csrfToken = deriveSessionCsrfToken(req);
  if (!csrfToken) return null;

  res.cookie(EEOS_CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    path: "/",
    sameSite: req.secure || req.header("x-forwarded-proto") === "https" ? "none" : "lax",
    secure: req.secure || req.header("x-forwarded-proto") === "https",
    maxAge: 10 * 60 * 1000,
  });
  return csrfToken;
}

export function hasValidSessionCsrf(req: Request) {
  const headerToken = req.header("x-eeos-csrf-token");
  const expectedToken = deriveSessionCsrfToken(req);
  return Boolean(headerToken && expectedToken && safeEqual(headerToken, expectedToken));
}
