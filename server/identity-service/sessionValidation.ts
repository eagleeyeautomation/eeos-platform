import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { importPKCS8, jwtVerify, SignJWT } from "jose";
import {
  IDENTITY_ASSERTION_AUDIENCE, IDENTITY_ASSERTION_ISSUER, IDENTITY_ASSERTION_MAX_LIFETIME_SECONDS,
  sessionValidationResponseSchema, type SessionValidationRequest, type SessionValidationResponse,
} from "../../shared/identityServiceContract.js";
import { IdentityServiceError } from "./errors.js";
import type { SessionIdentityAdapter } from "./mysqlSessionAdapter.js";
import type { RequestBinding } from "./security.js";

export type BrowserSession = { openId: string; appId: string; name: string };
export interface BrowserSessionVerifier { verify(token: string): Promise<BrowserSession>; }
export class Hs256BrowserSessionVerifier implements BrowserSessionVerifier {
  constructor(private readonly secret: string) {}
  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(this.secret), { algorithms: ["HS256"] });
      for (const key of ["openId", "appId", "name"] as const) if (typeof payload[key] !== "string" || payload[key].length === 0) throw new Error("missing claim");
      return { openId: payload.openId as string, appId: payload.appId as string, name: payload.name as string };
    } catch (error) {
      const expired = typeof error === "object" && error !== null && "code" in error && error.code === "ERR_JWT_EXPIRED";
      throw new IdentityServiceError(401, expired ? "IDENTITY_SESSION_EXPIRED" : "IDENTITY_SESSION_INVALID", "Session is not valid.");
    }
  }
}

export interface IdentityAssertionSigner { sign(input: Omit<SessionValidationResponse, "assertion">, binding: RequestBinding): Promise<string>; }
export class Es256IdentityAssertionSigner implements IdentityAssertionSigner {
  private key?: ReturnType<typeof importPKCS8>;
  constructor(private readonly privateKey: string, private readonly keyId: string, private readonly nowSeconds = () => Math.floor(Date.now() / 1000)) {}
  async sign(input: Omit<SessionValidationResponse, "assertion">, binding: RequestBinding) {
    const now = this.nowSeconds();
    const key = await (this.key ??= importPKCS8(this.privateKey.replace(/\\n/g, "\n"), "ES256"));
    return new SignJWT({ sessionVersion: input.sessionVersion, userId: input.userId,
      organizationId: input.organizationId, membershipId: input.membershipId, subaccountId: input.subaccountId,
      platformRole: input.platformRole, membershipRole: input.membershipRole, scope: ["identity:validated"], request: binding })
      .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: this.keyId })
      .setIssuer(IDENTITY_ASSERTION_ISSUER).setAudience(IDENTITY_ASSERTION_AUDIENCE).setSubject(input.userId)
      .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + IDENTITY_ASSERTION_MAX_LIFETIME_SECONDS)
      .setJti(binding.requestId).sign(key);
  }
  async ready() {
    try { await (this.key ??= importPKCS8(this.privateKey.replace(/\\n/g, "\n"), "ES256")); return true; }
    catch { return false; }
  }
}

function sessionToken(req: Request) {
  const cookie = req.headers.cookie ? parseCookieHeader(req.headers.cookie).app_session_id : undefined;
  if (cookie) return cookie;
  const fallback = req.header("x-eeos-session-authorization");
  return fallback?.startsWith("Bearer ") && fallback.length > 7 ? fallback.slice(7) : undefined;
}

export class SessionValidationService {
  constructor(private readonly sessions: BrowserSessionVerifier, private readonly identities: SessionIdentityAdapter,
    private readonly signer: IdentityAssertionSigner, private readonly now = () => new Date()) {}
  async validate(req: Request, body: SessionValidationRequest, binding: RequestBinding): Promise<SessionValidationResponse> {
    const token = sessionToken(req);
    if (!token) throw new IdentityServiceError(401, "IDENTITY_SESSION_MISSING", "Session is not valid.");
    const session = await this.sessions.verify(token);
    const context = await this.identities.resolve(session.openId);
    if (!context) throw new IdentityServiceError(401, "IDENTITY_USER_NOT_FOUND", "Session is not valid.");
    const selected = body.requestedGhlLocationId ? context.scopes.find((scope) => scope.ghlLocationId === body.requestedGhlLocationId) : undefined;
    if (body.requestedGhlLocationId && !selected) throw new IdentityServiceError(403, "IDENTITY_LOCATION_UNAUTHORIZED", "Requested location is not authorized.");
    const expiresAt = new Date(this.now().getTime() + IDENTITY_ASSERTION_MAX_LIFETIME_SECONDS * 1_000).toISOString();
    const unsigned = {
      schemaVersion: "v1" as const, authenticated: true as const, userId: String(context.user.id),
      organizationId: selected ? String(selected.organizationId) : null,
      membershipId: selected ? String(selected.membershipId) : null,
      subaccountId: selected ? String(selected.subaccountId) : null,
      platformRole: context.user.role, membershipRole: selected?.membershipRole ?? null,
      authorizedGhlLocationId: selected?.ghlLocationId ?? null,
      authorizedSubaccountIds: context.scopes.map((scope) => String(scope.subaccountId)),
      displayName: context.user.name, email: context.user.email, sessionVersion: "0", expiresAt,
    };
    const assertion = await this.signer.sign(unsigned, binding);
    return sessionValidationResponseSchema.parse({ ...unsigned, assertion });
  }
}
