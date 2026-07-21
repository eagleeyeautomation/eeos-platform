import { Router, type NextFunction, type Request, type Response } from "express";
import { IdentityServiceError } from "./errors.js";
import {
  serviceAuthenticationMiddleware,
  validateAuthorizationEnvelope,
  validateSessionEnvelope,
} from "./middleware.js";
import type { ServiceAssertionVerifier } from "./security.js";
import { requestBodySha256, type RequestBinding } from "./security.js";
import type { SessionValidationService } from "./sessionValidation.js";
import type { SessionValidationRequest } from "../../shared/identityServiceContract.js";

export function createIdentityInternalRouter(verifier: ServiceAssertionVerifier, sessions?: SessionValidationService) {
  const router = Router();
  const authenticateService = serviceAuthenticationMiddleware(verifier);
  const unavailable = () => {
    throw new IdentityServiceError(503, "IDENTITY_SERVICE_UNAVAILABLE", "Identity service is not available.", true);
  };

  const validateSession = sessions ? async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SessionValidationRequest;
      const binding: RequestBinding = { requestId: body.requestId, method: "POST", path: "/internal/v1/session/validate",
        bodySha256: requestBodySha256(req), nonce: body.nonce };
      res.status(200).json(await sessions.validate(req, body, binding));
    } catch (error) { next(error); }
  } : unavailable;
  router.post("/session/validate", validateSessionEnvelope, authenticateService, validateSession);
  router.post("/authorization/check", validateAuthorizationEnvelope, authenticateService, unavailable);
  return router;
}
