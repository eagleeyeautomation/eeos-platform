import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import {
  authorizationCheckRequestSchema,
  sessionValidationRequestSchema,
} from "../../shared/identityServiceContract.js";
import { IdentityServiceError } from "./errors.js";
import type { IdentityLogger } from "./logging.js";
import type { IdentityRateLimiter } from "./rateLimit.js";
import { requestBodySha256, type RequestBinding, type ServiceAssertionVerifier } from "./security.js";

type IdentityRequest = Request & {
  identity?: { requestId: string; assertionId?: string; clientId?: string };
};

const requestIdPattern = /^[A-Za-z0-9_-]{16,128}$/;

export function correlationMiddleware(req: IdentityRequest, res: Response, next: NextFunction) {
  const headerId = req.header("x-eeos-request-id");
  const requestId = headerId && requestIdPattern.test(headerId) ? headerId : randomUUID();
  req.identity = { requestId };
  res.locals.identityRequestId = requestId;
  res.setHeader("X-EEOS-Request-ID", requestId);
  next();
}

export function adoptBodyRequestId(req: IdentityRequest, res: Response, next: NextFunction) {
  const candidate = typeof req.body?.requestId === "string" ? req.body.requestId : undefined;
  if (candidate && requestIdPattern.test(candidate)) {
    req.identity = { ...(req.identity ?? { requestId: candidate }), requestId: candidate };
    res.locals.identityRequestId = candidate;
    res.setHeader("X-EEOS-Request-ID", candidate);
  }
  next();
}

export function getIdentityRequestId(req: Request) {
  return (req as IdentityRequest).identity?.requestId ?? "unavailable-request-id";
}

export function requestLoggingMiddleware(logger: IdentityLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();
    res.once("finish", () => logger.log("info", "request.complete", {
      requestId: res.locals.identityRequestId ?? getIdentityRequestId(req),
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      latencyMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
    }));
    next();
  };
}

export function rateLimitMiddleware(rateLimiter: IdentityRateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const decision = rateLimiter.consume(`${req.ip}:${req.path}`);
    if (!decision.allowed) {
      if (decision.retryAfterSeconds) res.setHeader("Retry-After", decision.retryAfterSeconds);
      next(new IdentityServiceError(429, "IDENTITY_RATE_LIMITED", "Identity request rate limit exceeded.", true));
      return;
    }
    next();
  };
}

export function validateContractBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const validateSessionEnvelope = validateContractBody(sessionValidationRequestSchema);
export const validateAuthorizationEnvelope = validateContractBody(authorizationCheckRequestSchema);

export function serviceAuthenticationMiddleware(verifier: ServiceAssertionVerifier) {
  return async (req: IdentityRequest, _res: Response, next: NextFunction) => {
    try {
      const authorization = req.header("authorization");
      if (!authorization?.startsWith("Bearer ") || authorization.length <= 7) {
        throw new IdentityServiceError(401, "IDENTITY_SERVICE_AUTH_INVALID", "Service authentication is not valid.");
      }
      const body = req.body as { requestId: string; nonce: string };
      const binding: RequestBinding = {
        requestId: body.requestId,
        method: "POST",
        path: req.originalUrl.split("?", 1)[0] as RequestBinding["path"],
        bodySha256: requestBodySha256(req),
        nonce: body.nonce,
      };
      const verified = await verifier.verify(authorization.slice(7), binding);
      req.identity = { ...(req.identity ?? { requestId: body.requestId }), ...verified };
      next();
    } catch (error) {
      next(error);
    }
  };
}
