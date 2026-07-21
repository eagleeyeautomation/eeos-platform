import { createLocalJWKSet, importPKCS8, type JSONWebKeySet } from "jose";
import { IDENTITY_CONTRACT_VERSION } from "../../shared/identityServiceContract";
import type { IdentityServiceConfig } from "./config";

export async function validateIdentityServiceStartup(config: IdentityServiceConfig) {
  if (config.contractVersion !== IDENTITY_CONTRACT_VERSION) {
    throw new Error(`IDENTITY_SERVICE_CONTRACT_VERSION must be ${IDENTITY_CONTRACT_VERSION}.`);
  }
  if (config.trustedClientJwks) {
    const parsed = JSON.parse(config.trustedClientJwks) as JSONWebKeySet;
    if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) throw new Error("IDENTITY_SERVICE_TRUSTED_CLIENT_JWKS contains no keys.");
    createLocalJWKSet(parsed);
  }
  if (config.assertionPrivateKey) {
    await importPKCS8(config.assertionPrivateKey.replace(/\\n/g, "\n"), "ES256");
  }
  if (Boolean(config.assertionPrivateKey) !== Boolean(config.assertionKeyId)) {
    throw new Error("IDENTITY_SERVICE_ASSERTION_PRIVATE_KEY and IDENTITY_SERVICE_ASSERTION_KEY_ID must be configured together.");
  }
}
