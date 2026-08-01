import type { Request, Response } from "express";
import { resolveOrganizationAuthorizationContext } from "./authorization";
import { canonicalBusinessMemoryId } from "./business-memory";
import { hasValidSessionCsrf } from "./_core/csrf";
import { sdk } from "./_core/sdk";

type Dependencies = {
  authenticateRequest: typeof sdk.authenticateRequest;
  resolveOrganizationContext: typeof resolveOrganizationAuthorizationContext;
  validateCsrf: typeof hasValidSessionCsrf;
  configuredLocationId: string | undefined;
};

export async function authorizePrnRoute(
  req: Request,
  res: Response,
  options: { write?: boolean } = {},
  overrides: Partial<Dependencies> = {},
) {
  const dependencies: Dependencies = {
    authenticateRequest: sdk.authenticateRequest.bind(sdk),
    resolveOrganizationContext: resolveOrganizationAuthorizationContext,
    validateCsrf: hasValidSessionCsrf,
    configuredLocationId: process.env.GHL_PRN_SOUTH_CAROLINA_LOCATION_ID,
    ...overrides,
  };

  let user;
  try {
    user = await dependencies.authenticateRequest(req);
  } catch {
    res.status(401).json({ ok: false, error: "Authentication is required." });
    return null;
  }

  if (!dependencies.configuredLocationId) {
    res.status(503).json({ ok: false, error: "The authorized location service is unavailable." });
    return null;
  }

  const context = await dependencies.resolveOrganizationContext(user, dependencies.configuredLocationId);
  if (
    !context?.organizationId
    || !context.membershipId
    || context.selectedLocationId !== dependencies.configuredLocationId
    || !context.authorizedLocationIds.includes(dependencies.configuredLocationId)
  ) {
    res.status(403).json({ ok: false, error: "Organization and location access is not authorized." });
    return null;
  }

  if (options.write && context.role === "READ_ONLY") {
    res.status(403).json({ ok: false, error: "Write access is not authorized." });
    return null;
  }
  if (options.write && !dependencies.validateCsrf(req)) {
    res.status(403).json({ ok: false, error: "A valid EEOS CSRF token is required." });
    return null;
  }

  return {
    user,
    organizationId: context.organizationId,
    locationId: context.selectedLocationId,
    role: context.role,
    businessId: canonicalBusinessMemoryId(context.organizationId, context.selectedLocationId),
  };
}
