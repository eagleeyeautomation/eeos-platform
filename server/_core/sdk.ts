import {
  COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_MS,
  USER_SESSION_ABSOLUTE_TIMEOUT_MS,
} from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { observeIdentityShadow } from "../identity-shadow/observer";
import { createOpaqueToken, hashOpaqueToken, readClientIp, readUserAgent } from "./sessionTokens";

export type AuthenticatedUser = User;

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  readSessionToken(req: Request) {
    return this.parseCookies(req.headers.cookie).get(COOKIE_NAME);
  }

  async createSessionForUser(
    user: Pick<User, "id" | "openId" | "name" | "email">,
    req: Request,
    options: { expiresInMs?: number; mfaVerified?: boolean } = {},
  ) {
    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + (options.expiresInMs ?? USER_SESSION_ABSOLUTE_TIMEOUT_MS));
    await db.createAuthSession({
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
      ipAddress: readClientIp(req),
      userAgent: readUserAgent(req),
      recentAuthAt: new Date(),
      mfaVerifiedAt: options.mfaVerified ? new Date() : null,
    });
    return { token, expiresAt };
  }

  async revokeCurrentSession(req: Request) {
    const token = this.readSessionToken(req);
    if (!token) return;
    await db.revokeAuthSession(hashOpaqueToken(token));
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    return this.authenticateSession(req, false);
  }

  async authenticatePendingMfaRequest(req: Request) {
    return this.authenticateSession(req, true);
  }

  private async authenticateSession(req: Request, allowPendingMfa: boolean) {
    const sessionToken = this.readSessionToken(req);
    if (!sessionToken) {
      throw ForbiddenError("Invalid session cookie");
    }

    const tokenHash = hashOpaqueToken(sessionToken);
    const session = await db.getAuthSessionByTokenHash(tokenHash);
    if (
      !session
      || session.revokedAt
      || session.expiresAt.getTime() <= Date.now()
      || session.lastSeenAt.getTime() + SESSION_IDLE_TIMEOUT_MS <= Date.now()
    ) {
      throw ForbiddenError("Invalid session cookie");
    }

    const userById = await db.getUserById(session.userId);
    if (!userById || userById.isActive === false) {
      throw ForbiddenError("User not found");
    }

    const factor = await db.getMfaFactor(userById.id);
    if (!allowPendingMfa && factor?.enabledAt && !session.mfaVerifiedAt) {
      throw ForbiddenError("MFA challenge required");
    }

    await Promise.all([
      db.touchAuthSession(session.id),
      db.upsertUser({
        openId: userById.openId,
        lastSignedIn: new Date(),
      }),
    ]);

    observeIdentityShadow(req, userById, { cookie: sessionToken });
    return userById;
  }

  async currentSession(req: Request) {
    const token = this.readSessionToken(req);
    return token ? db.getAuthSessionByTokenHash(hashOpaqueToken(token)) : undefined;
  }
}

export const sdk = new SDKServer();
