import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { resolveAuthorizationContext } from "../authorization";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { verifyPassword } from "./passwordAuth";
import { sdk } from "./sdk";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(512),
  returnTo: z.string().optional(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}

function defaultRouteForRole(role: Awaited<ReturnType<typeof resolveAuthorizationContext>>["role"]) {
  return role === "PLATFORM_ADMIN" ? "/admin" : "/executive-home";
}

function invalidLogin(res: Response) {
  res.status(401).json({ success: false, error: "Invalid email or password." });
}

export function registerFirstPartyAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await db.getUserByEmail(email);
    if (!user || user.isActive === false) {
      invalidLogin(res);
      return;
    }

    const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      invalidLogin(res);
      return;
    }

    await db.upsertUser({
      openId: user.openId,
      loginMethod: "eeos",
      lastSignedIn: new Date(),
    });

    const refreshedUser = await db.getUserByOpenId(user.openId);
    if (!refreshedUser) {
      res.status(500).json({ success: false, error: "Unable to create EEOS session." });
      return;
    }

    const authorization = await resolveAuthorizationContext(refreshedUser);
    const fallbackRoute = defaultRouteForRole(authorization.role);
    const redirectTo = safeReturnTo(parsed.data.returnTo, fallbackRoute);
    const sessionToken = await sdk.createSessionToken(refreshedUser.openId, {
      name: refreshedUser.name || refreshedUser.email || "EEOS User",
      expiresInMs: ONE_YEAR_MS,
    });

    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });
    res.status(200).json({ success: true, redirectTo });
  });
}
