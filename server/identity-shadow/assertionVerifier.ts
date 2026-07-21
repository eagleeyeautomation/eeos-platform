import { decodeProtectedHeader, importJWK, jwtVerify, type JSONWebKeySet, type JWK } from "jose";
import {
  IDENTITY_ASSERTION_AUDIENCE, IDENTITY_ASSERTION_ISSUER, identityAssertionClaimsSchema,
  type IdentityAssertionClaims,
} from "../../shared/identityServiceContract";

export type IdentityAssertionErrorCategory =
  | "missing_assertion" | "malformed_assertion" | "missing_kid" | "unknown_kid" | "duplicate_kid"
  | "unsupported_algorithm" | "invalid_signature" | "invalid_issuer" | "invalid_audience"
  | "expired_assertion" | "missing_expiration" | "invalid_contract" | "invalid_claims"
  | "invalid_trusted_jwks" | "assertion_response_mismatch";

export class IdentityAssertionVerificationError extends Error {
  constructor(readonly category: IdentityAssertionErrorCategory) { super("Identity response assertion is not valid."); }
}

export function parseTrustedAssertionJwks(value: string): JSONWebKeySet {
  try {
    const parsed = JSON.parse(value) as JSONWebKeySet;
    if (!parsed || !Array.isArray(parsed.keys) || parsed.keys.length === 0) throw new Error("empty");
    return parsed;
  } catch { throw new IdentityAssertionVerificationError("invalid_trusted_jwks"); }
}

export class CoreIdentityAssertionVerifier {
  constructor(private readonly jwks: JSONWebKeySet, private readonly now = () => new Date()) {}

  async verify(compact: string, expectedRequest?: IdentityAssertionClaims["request"]): Promise<IdentityAssertionClaims> {
    if (!compact) throw new IdentityAssertionVerificationError("missing_assertion");
    let header: ReturnType<typeof decodeProtectedHeader>;
    try { header = decodeProtectedHeader(compact); }
    catch { throw new IdentityAssertionVerificationError("malformed_assertion"); }
    if (header.alg !== "ES256") throw new IdentityAssertionVerificationError("unsupported_algorithm");
    if (typeof header.kid !== "string" || header.kid.length === 0) throw new IdentityAssertionVerificationError("missing_kid");
    const matches = this.jwks.keys.filter((key) => key.kid === header.kid);
    if (matches.length === 0) throw new IdentityAssertionVerificationError("unknown_kid");
    if (matches.length > 1) throw new IdentityAssertionVerificationError("duplicate_kid");
    const jwk = matches[0] as JWK;
    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || (jwk.alg !== undefined && jwk.alg !== "ES256")
      || (jwk.use !== undefined && jwk.use !== "sig")) {
      throw new IdentityAssertionVerificationError("invalid_trusted_jwks");
    }
    let key: Awaited<ReturnType<typeof importJWK>>;
    try { key = await importJWK(jwk, "ES256"); }
    catch { throw new IdentityAssertionVerificationError("invalid_trusted_jwks"); }
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(compact, key, {
        algorithms: ["ES256"], issuer: IDENTITY_ASSERTION_ISSUER, audience: IDENTITY_ASSERTION_AUDIENCE,
        requiredClaims: ["exp"], currentDate: this.now(),
      }));
    } catch (error) { throw mapJoseError(error); }
    let parsed: ReturnType<typeof identityAssertionClaimsSchema.safeParse>;
    try { parsed = identityAssertionClaimsSchema.safeParse(payload); }
    catch { throw new IdentityAssertionVerificationError("invalid_claims"); }
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path[0]);
      if (fields.includes("schemaVersion")) throw new IdentityAssertionVerificationError("invalid_contract");
      if (fields.includes("exp")) throw new IdentityAssertionVerificationError("missing_expiration");
      throw new IdentityAssertionVerificationError("invalid_claims");
    }
    if (Date.parse(parsed.data.expiresAt) / 1_000 !== parsed.data.exp) {
      throw new IdentityAssertionVerificationError("invalid_claims");
    }
    if (expectedRequest && JSON.stringify(parsed.data.request) !== JSON.stringify(expectedRequest)) {
      throw new IdentityAssertionVerificationError("invalid_claims");
    }
    return parsed.data;
  }
}

export function assertOuterResponseMatchesClaims(
  outer: Record<string, unknown>, claims: IdentityAssertionClaims,
) {
  const fields = ["schemaVersion", "authenticated", "userId", "organizationId", "membershipId", "subaccountId",
    "platformRole", "membershipRole", "authorizedGhlLocationId", "authorizedSubaccountIds", "displayName", "email",
    "sessionVersion", "expiresAt"] as const;
  for (const field of fields) {
    if (JSON.stringify(outer[field]) !== JSON.stringify(claims[field])) {
      throw new IdentityAssertionVerificationError("assertion_response_mismatch");
    }
  }
}

function mapJoseError(error: unknown): IdentityAssertionVerificationError {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "ERR_JWT_EXPIRED") return new IdentityAssertionVerificationError("expired_assertion");
  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
    const claim = typeof error === "object" && error !== null && "claim" in error ? String(error.claim) : "";
    if (claim === "iss") return new IdentityAssertionVerificationError("invalid_issuer");
    if (claim === "aud") return new IdentityAssertionVerificationError("invalid_audience");
    if (claim === "exp") return new IdentityAssertionVerificationError("missing_expiration");
  }
  if (code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") return new IdentityAssertionVerificationError("invalid_signature");
  if (code === "ERR_JWS_INVALID" || code === "ERR_JWT_INVALID") return new IdentityAssertionVerificationError("malformed_assertion");
  return new IdentityAssertionVerificationError("invalid_signature");
}
