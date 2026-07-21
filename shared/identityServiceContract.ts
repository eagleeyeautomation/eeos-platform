import { z } from "zod";

export const IDENTITY_CONTRACT_VERSION = "v1" as const;
export const IDENTITY_MAX_PAYLOAD_BYTES = 16_384;
export const IDENTITY_ASSERTION_MAX_LIFETIME_SECONDS = 60;
export const SERVICE_REQUEST_MAX_LIFETIME_SECONDS = 30;
export const IDENTITY_CLOCK_SKEW_SECONDS = 30;
export const IDENTITY_ASSERTION_ISSUER = "eeos-identity-service" as const;
export const IDENTITY_ASSERTION_AUDIENCE = "eeos-core-platform" as const;
export const SERVICE_REQUEST_ISSUER = "eeos-core-platform" as const;
export const SERVICE_REQUEST_AUDIENCE = "eeos-identity-service" as const;

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const identifier = z.string().min(1).max(128);
const requestIdentifier = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const nonce = z.string().regex(/^[A-Za-z0-9_-]{22,128}$/);
const timestamp = z.string().datetime({ offset: true });
const decimalId = z.string().regex(/^[1-9][0-9]*$/).max(19).refine(
  (value) => BigInt(value) <= BigInt("9223372036854775807"),
  "Database ID exceeds signed bigint range.",
);
const nullableId = decimalId.nullable();

export const platformRoleSchema = z.enum(["user", "admin"]);
export const membershipRoleSchema = z.enum(["owner", "executive", "analyst", "viewer"]);
export const membershipStatusSchema = z.enum(["active", "suspended", "cancelled", "trial"]);
export const identityResourceTypeSchema = z.enum(["organization", "membership", "subaccount", "ghl_location"]);
export const identityActionSchema = z.enum([
  "organization:read",
  "membership:read",
  "subaccount:read",
  "ghl:connect",
  "ghl:refresh",
  "ghl:disconnect",
  "ghl:status",
]);

const ACTIONS_BY_RESOURCE = {
  organization: new Set(["organization:read"]),
  membership: new Set(["membership:read"]),
  subaccount: new Set(["subaccount:read"]),
  ghl_location: new Set(["ghl:connect", "ghl:refresh", "ghl:disconnect", "ghl:status"]),
} as const;

export const sessionValidationRequestSchema = strictObject({
  schemaVersion: z.literal(IDENTITY_CONTRACT_VERSION),
  requestId: requestIdentifier,
  timestamp,
  nonce,
  requestedGhlLocationId: identifier.optional(),
});

export const sessionValidationResponseSchema = strictObject({
  schemaVersion: z.literal(IDENTITY_CONTRACT_VERSION),
  authenticated: z.literal(true),
  userId: decimalId,
  organizationId: nullableId,
  membershipId: nullableId,
  subaccountId: nullableId,
  platformRole: platformRoleSchema,
  membershipRole: membershipRoleSchema.nullable(),
  authorizedGhlLocationId: identifier.nullable(),
  authorizedSubaccountIds: z.array(decimalId).max(100),
  displayName: z.string().min(1).max(256).nullable(),
  email: z.string().max(320).nullable(),
  sessionVersion: z.string().regex(/^[0-9]+$/).max(20),
  assertion: z.string().min(32).max(8192),
  expiresAt: timestamp,
}).superRefine((value, context) => {
  const scoped = [value.organizationId, value.membershipId, value.subaccountId, value.membershipRole];
  const hasSomeScope = scoped.some((field) => field !== null);
  const hasAllScope = scoped.every((field) => field !== null);
  if (hasSomeScope && !hasAllScope) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Scoped identity fields must be present together." });
  }
  if (value.authorizedGhlLocationId !== null && !hasAllScope) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "An authorized location requires complete identity scope." });
  }
});

export const authorizationCheckRequestSchema = strictObject({
  schemaVersion: z.literal(IDENTITY_CONTRACT_VERSION),
  identityAssertion: z.string().min(32).max(8192),
  resourceType: identityResourceTypeSchema,
  resourceId: identifier,
  action: identityActionSchema,
  requestId: requestIdentifier,
  timestamp,
  nonce,
}).superRefine((value, context) => {
  if (value.resourceType !== "ghl_location" && !decimalId.safeParse(value.resourceId).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["resourceId"], message: "Database resource IDs must be decimal strings." });
  }
  if (!ACTIONS_BY_RESOURCE[value.resourceType].has(value.action as never)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["action"], message: "Action is not valid for resource type." });
  }
});

export const activeStateSchema = strictObject({
  membershipUserActive: z.boolean(),
  subaccountActive: z.boolean().nullable(),
  membershipStatus: membershipStatusSchema.nullable(),
  organizationActive: z.boolean().nullable(),
});

const authorizationDecisionBase = {
  schemaVersion: z.literal(IDENTITY_CONTRACT_VERSION),
  userId: decimalId,
  organizationId: nullableId,
  membershipId: nullableId,
  subaccountId: nullableId,
  resourceType: identityResourceTypeSchema,
  resourceId: identifier,
  action: identityActionSchema,
  platformRole: platformRoleSchema,
  membershipRole: membershipRoleSchema.nullable(),
  activeState: activeStateSchema,
  assertionId: requestIdentifier,
  expiresAt: timestamp,
};

export const authorizationAllowedResponseSchema = strictObject({
  ...authorizationDecisionBase,
  allowed: z.literal(true),
});

export const authorizationDeniedResponseSchema = strictObject({
  ...authorizationDecisionBase,
  allowed: z.literal(false),
  organizationId: z.null(),
  membershipId: z.null(),
  subaccountId: z.null(),
  membershipRole: z.null(),
  activeState: strictObject({
    membershipUserActive: z.literal(false),
    subaccountActive: z.null(),
    membershipStatus: z.null(),
    organizationActive: z.null(),
  }),
});

export const authorizationCheckResponseSchema = z.discriminatedUnion("allowed", [
  authorizationAllowedResponseSchema,
  authorizationDeniedResponseSchema,
]);

export const identityErrorCodeSchema = z.enum([
  "IDENTITY_REQUEST_INVALID",
  "IDENTITY_SERVICE_AUTH_INVALID",
  "IDENTITY_SERVICE_ASSERTION_EXPIRED",
  "IDENTITY_SERVICE_ASSERTION_REPLAYED",
  "IDENTITY_SESSION_MISSING",
  "IDENTITY_SESSION_INVALID",
  "IDENTITY_SESSION_EXPIRED",
  "IDENTITY_SESSION_REVOKED",
  "IDENTITY_USER_NOT_FOUND",
  "IDENTITY_MEMBERSHIP_NOT_FOUND",
  "IDENTITY_ORGANIZATION_NOT_FOUND",
  "IDENTITY_SUBACCOUNT_NOT_FOUND",
  "IDENTITY_LOCATION_UNAUTHORIZED",
  "IDENTITY_AUTHORIZATION_DENIED",
  "IDENTITY_DATABASE_UNAVAILABLE",
  "IDENTITY_SERVICE_UNAVAILABLE",
  "IDENTITY_TIMEOUT",
  "IDENTITY_RESPONSE_INVALID",
  "IDENTITY_RATE_LIMITED",
  "IDENTITY_INTERNAL_ERROR",
]);

export const identityErrorResponseSchema = strictObject({
  error: strictObject({
    code: identityErrorCodeSchema,
    message: z.string().min(1).max(256),
    requestId: requestIdentifier,
    retryable: z.boolean(),
  }),
});

export const assertionHeaderSchema = strictObject({
  alg: z.literal("ES256"),
  typ: z.literal("JWT"),
  kid: z.string().min(1).max(128),
});

const requestBindingSchema = strictObject({
  requestId: requestIdentifier,
  method: z.enum(["POST"]),
  path: z.enum(["/internal/v1/session/validate", "/internal/v1/authorization/check"]),
  bodySha256: z.string().regex(/^[a-f0-9]{64}$/),
  nonce,
});

export const identityAssertionClaimsSchema = strictObject({
  schemaVersion: z.literal(IDENTITY_CONTRACT_VERSION),
  authenticated: z.boolean(),
  iss: z.literal(IDENTITY_ASSERTION_ISSUER),
  aud: z.literal(IDENTITY_ASSERTION_AUDIENCE),
  sub: decimalId,
  iat: z.number().int().nonnegative(),
  nbf: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  jti: requestIdentifier,
  sessionVersion: z.string().regex(/^[0-9]+$/).max(20),
  userId: decimalId,
  organizationId: nullableId,
  membershipId: nullableId,
  subaccountId: nullableId,
  platformRole: platformRoleSchema,
  membershipRole: membershipRoleSchema.nullable(),
  authorizedGhlLocationId: identifier.nullable(),
  authorizedSubaccountIds: z.array(decimalId).max(100),
  displayName: z.string().min(1).max(256).nullable(),
  email: z.string().max(320).nullable(),
  expiresAt: timestamp,
  scope: z.array(identityActionSchema.or(z.literal("identity:validated"))).min(1).max(8),
  request: requestBindingSchema,
});

export const serviceRequestAssertionClaimsSchema = strictObject({
  iss: z.literal(SERVICE_REQUEST_ISSUER),
  aud: z.literal(SERVICE_REQUEST_AUDIENCE),
  sub: z.string().min(1).max(128),
  iat: z.number().int().nonnegative(),
  nbf: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  jti: requestIdentifier,
  request: requestBindingSchema,
});

export type ReplayStore = { consume(jti: string, expiresAt: number): boolean };

export function validateIdentityAssertion(
  header: unknown,
  claims: unknown,
  expectedRequest: z.infer<typeof requestBindingSchema>,
  replayStore: ReplayStore,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  assertionHeaderSchema.parse(header);
  const parsed = identityAssertionClaimsSchema.parse(claims);
  validateTemporalClaims(parsed, IDENTITY_ASSERTION_MAX_LIFETIME_SECONDS, nowSeconds);
  validateRequestBinding(parsed.request, expectedRequest);
  if (!replayStore.consume(parsed.jti, parsed.exp + IDENTITY_CLOCK_SKEW_SECONDS)) throw new Error("IDENTITY_SERVICE_ASSERTION_REPLAYED");
  return parsed;
}

export function validateServiceRequestAssertion(
  header: unknown,
  claims: unknown,
  expectedRequest: z.infer<typeof requestBindingSchema>,
  replayStore: ReplayStore,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  assertionHeaderSchema.parse(header);
  const parsed = serviceRequestAssertionClaimsSchema.parse(claims);
  validateTemporalClaims(parsed, SERVICE_REQUEST_MAX_LIFETIME_SECONDS, nowSeconds);
  validateRequestBinding(parsed.request, expectedRequest);
  if (!replayStore.consume(parsed.jti, parsed.exp + IDENTITY_CLOCK_SKEW_SECONDS)) throw new Error("IDENTITY_SERVICE_ASSERTION_REPLAYED");
  return parsed;
}

export function parseBoundedContract<T>(schema: z.ZodType<T>, input: unknown): T {
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > IDENTITY_MAX_PAYLOAD_BYTES) {
    throw new Error("IDENTITY_REQUEST_INVALID");
  }
  return schema.parse(input);
}

function validateTemporalClaims(
  claims: { iat: number; nbf: number; exp: number },
  maximumLifetime: number,
  nowSeconds: number,
) {
  if (claims.exp - claims.iat > maximumLifetime) throw new Error("IDENTITY_SERVICE_ASSERTION_EXPIRED");
  if (claims.iat > nowSeconds + IDENTITY_CLOCK_SKEW_SECONDS) throw new Error("IDENTITY_SERVICE_ASSERTION_EXPIRED");
  if (claims.nbf > nowSeconds + IDENTITY_CLOCK_SKEW_SECONDS) throw new Error("IDENTITY_SERVICE_ASSERTION_EXPIRED");
  if (claims.exp < nowSeconds - IDENTITY_CLOCK_SKEW_SECONDS) throw new Error("IDENTITY_SERVICE_ASSERTION_EXPIRED");
}

function validateRequestBinding(
  actual: z.infer<typeof requestBindingSchema>,
  expected: z.infer<typeof requestBindingSchema>,
) {
  for (const field of ["requestId", "method", "path", "bodySha256", "nonce"] as const) {
    if (actual[field] !== expected[field]) throw new Error("IDENTITY_SERVICE_AUTH_INVALID");
  }
}

export type SessionValidationRequest = z.infer<typeof sessionValidationRequestSchema>;
export type SessionValidationResponse = z.infer<typeof sessionValidationResponseSchema>;
export type IdentityAssertionClaims = z.infer<typeof identityAssertionClaimsSchema>;
export type AuthorizationCheckRequest = z.infer<typeof authorizationCheckRequestSchema>;
export type AuthorizationCheckResponse = z.infer<typeof authorizationCheckResponseSchema>;
export type IdentityErrorResponse = z.infer<typeof identityErrorResponseSchema>;
