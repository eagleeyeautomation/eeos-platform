import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { IdentityErrorResponse } from "../../shared/identityServiceContract";
import type { IdentityLogger } from "./logging";
import { getIdentityRequestId } from "./middleware";

export type IdentityErrorCode = IdentityErrorResponse["error"]["code"];

export class IdentityServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: IdentityErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "IdentityServiceError";
  }
}

const ERROR_DEFINITIONS: Partial<Record<IdentityErrorCode, { status: number; message: string; retryable: boolean }>> = {
  IDENTITY_REQUEST_INVALID: { status: 400, message: "Identity request is invalid.", retryable: false },
  IDENTITY_SERVICE_AUTH_INVALID: { status: 401, message: "Service authentication is not valid.", retryable: false },
  IDENTITY_SERVICE_ASSERTION_EXPIRED: { status: 401, message: "Service assertion is not valid.", retryable: false },
  IDENTITY_SERVICE_ASSERTION_REPLAYED: { status: 401, message: "Service assertion is not valid.", retryable: false },
  IDENTITY_SESSION_MISSING: { status: 401, message: "Session is not valid.", retryable: false },
  IDENTITY_SESSION_INVALID: { status: 401, message: "Session is not valid.", retryable: false },
  IDENTITY_SESSION_EXPIRED: { status: 401, message: "Session is not valid.", retryable: false },
  IDENTITY_USER_NOT_FOUND: { status: 401, message: "Session is not valid.", retryable: false },
  IDENTITY_LOCATION_UNAUTHORIZED: { status: 403, message: "Requested location is not authorized.", retryable: false },
  IDENTITY_DATABASE_UNAVAILABLE: { status: 503, message: "Identity database is not available.", retryable: true },
  IDENTITY_RATE_LIMITED: { status: 429, message: "Identity request rate limit exceeded.", retryable: true },
  IDENTITY_SERVICE_UNAVAILABLE: { status: 503, message: "Identity service is not available.", retryable: true },
  IDENTITY_TIMEOUT: { status: 504, message: "Identity request timed out.", retryable: true },
  IDENTITY_INTERNAL_ERROR: { status: 500, message: "Identity service encountered an unexpected error.", retryable: false },
};

export function createMappedIdentityError(code: keyof typeof ERROR_DEFINITIONS) {
  const definition = ERROR_DEFINITIONS[code];
  if (!definition) throw new Error("Identity error mapping is not defined.");
  return new IdentityServiceError(definition.status, code, definition.message, definition.retryable);
}

export function identityErrorHandler(logger: IdentityLogger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const normalized = normalizeIdentityError(error);
    const requestId = getIdentityRequestId(req);
    logger.log(normalized.status >= 500 ? "error" : "warn", "request.failed", {
      requestId,
      endpoint: req.path,
      method: req.method,
      status: normalized.status,
      errorCode: normalized.code,
    });
    if (res.headersSent) return;
    res.status(normalized.status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        requestId,
        retryable: normalized.retryable,
      },
    } satisfies IdentityErrorResponse);
  };
}

function normalizeIdentityError(error: unknown) {
  if (error instanceof IdentityServiceError) return error;
  if (error instanceof ZodError) {
    return new IdentityServiceError(400, "IDENTITY_REQUEST_INVALID", "Identity request is invalid.");
  }
  if (isBodyParserError(error, "entity.too.large")) {
    return new IdentityServiceError(400, "IDENTITY_REQUEST_INVALID", "Identity request is invalid.");
  }
  if (isBodyParserError(error, "entity.parse.failed")) {
    return new IdentityServiceError(400, "IDENTITY_REQUEST_INVALID", "Identity request is invalid.");
  }
  return new IdentityServiceError(500, "IDENTITY_INTERNAL_ERROR", "Identity service encountered an unexpected error.");
}

function isBodyParserError(error: unknown, type: string): error is { type: string } {
  return typeof error === "object" && error !== null && "type" in error && (error as { type?: unknown }).type === type;
}
