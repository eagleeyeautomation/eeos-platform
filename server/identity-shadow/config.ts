import type { JSONWebKeySet } from "jose";
import { parseTrustedAssertionJwks } from "./assertionVerifier";

export type IdentityShadowConfig = {
  enabled: boolean;
  complete: boolean;
  serviceUrl?: string;
  clientId?: string;
  requestPrivateKey?: string;
  requestKeyId?: string;
  trustedAssertionJwks?: JSONWebKeySet;
  fingerprintKey?: string;
  timeoutMs: number;
  sampleRate: number;
};

const boundedNumber = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = value === undefined ? fallback : Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

export function loadIdentityShadowConfig(env: NodeJS.ProcessEnv = process.env): IdentityShadowConfig {
  const enabled = env.IDENTITY_SHADOW_ENABLED === "true";
  const testDefault = env.NODE_ENV === "test" ? 1 : 0;
  const sampleRate = boundedNumber(env.IDENTITY_SHADOW_SAMPLE_RATE, testDefault, 0, 1);
  const timeoutMs = Math.floor(boundedNumber(env.IDENTITY_SHADOW_TIMEOUT_MS, 500, 1, 1_000));
  const serviceUrl = validServiceUrl(env.IDENTITY_SERVICE_URL);
  const clientId = value(env.IDENTITY_SERVICE_CLIENT_ID);
  const requestPrivateKey = value(env.IDENTITY_SERVICE_REQUEST_PRIVATE_KEY);
  const requestKeyId = value(env.IDENTITY_SERVICE_REQUEST_KEY_ID);
  const trustedAssertionJwksValue = value(env.IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS);
  const trustedAssertionJwks = trustedAssertionJwksValue ? parseTrustedAssertionJwks(trustedAssertionJwksValue) : undefined;
  if (enabled && env.NODE_ENV === "production" && !trustedAssertionJwks) {
    throw new Error("IDENTITY_SERVICE_TRUSTED_ASSERTION_JWKS is required when Identity shadow validation is enabled.");
  }
  const fingerprintKey = value(env.IDENTITY_SHADOW_FINGERPRINT_KEY);
  return {
    enabled, serviceUrl, clientId, requestPrivateKey, requestKeyId, trustedAssertionJwks, fingerprintKey, timeoutMs, sampleRate,
    complete: Boolean(serviceUrl && clientId && requestPrivateKey && requestKeyId && trustedAssertionJwks && fingerprintKey),
  };
}

const value = (input: string | undefined) => input && input.trim().length > 0 ? input : undefined;
function validServiceUrl(input: string | undefined) {
  if (!input) return undefined;
  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) ? url.toString().replace(/\/$/, "") : undefined;
  } catch { return undefined; }
}
