import { createHmac } from "crypto";
import type { IdentityAssertionClaims } from "../../shared/identityServiceContract";

export type ShadowResultCategory = "AUTHENTICATED" | "UNAUTHENTICATED" | "UNAUTHORIZED_LOCATION" | "ERROR";
export type ComparableIdentityResult = {
  category: ShadowResultCategory;
  authenticated: boolean;
  userId: string | null;
  platformRole: "user" | "admin" | null;
  organizationId: string | null;
  membershipId: string | null;
  subaccountId: string | null;
  authorizedSubaccountIds: string[];
  authorizedGhlLocationId: string | null;
  displayName: string | null;
  email: string | null;
  sessionVersion: string | null;
  errorCategory: string | null;
};

export const normalizeShadowResponse = (value: IdentityAssertionClaims): ComparableIdentityResult => ({
  category: "AUTHENTICATED", authenticated: value.authenticated, userId: value.userId, platformRole: value.platformRole,
  organizationId: value.organizationId, membershipId: value.membershipId, subaccountId: value.subaccountId,
  authorizedSubaccountIds: [...value.authorizedSubaccountIds], authorizedGhlLocationId: value.authorizedGhlLocationId,
  displayName: value.displayName, email: value.email, sessionVersion: value.sessionVersion, errorCategory: null,
});

export function compareIdentityResults(authoritative: ComparableIdentityResult, shadow: ComparableIdentityResult) {
  const fields = Object.keys(authoritative) as Array<keyof ComparableIdentityResult>;
  return fields.filter((field) => JSON.stringify(authoritative[field]) !== JSON.stringify(shadow[field]));
}

export function safeFingerprint(value: ComparableIdentityResult, key: string) {
  return createHmac("sha256", key).update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function stableSample(requestId: string, rate: number) {
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  const digest = createHmac("sha256", "eeos-identity-shadow-sampling-v1").update(requestId).digest();
  return digest.readUInt32BE(0) / 0x1_0000_0000 < rate;
}
