import { createHash } from "crypto";
import type { Request } from "express";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { validateServiceRequestAssertion } from "../../shared/identityServiceContract";
import { IdentityServiceError } from "./errors";
import { MemoryReplayStore, type ReplayStore } from "./replayStore";

export { MemoryReplayStore, MemoryReplayStore as InMemoryReplayStore } from "./replayStore";

export type RequestBinding = {
  requestId: string;
  method: "POST";
  path: "/internal/v1/session/validate" | "/internal/v1/authorization/check";
  bodySha256: string;
  nonce: string;
};

export type DecodedServiceAssertion = { header: unknown; claims: unknown };
export type ServiceAssertionDecoder = { decode(compactAssertion: string): Promise<DecodedServiceAssertion> };
export type ServiceAssertionVerifier = {
  verify(compactAssertion: string, binding: RequestBinding): Promise<{ assertionId: string; clientId: string }>;
  operational?(): boolean;
};

export class ContractServiceAssertionVerifier implements ServiceAssertionVerifier {
  constructor(
    private readonly decoder: ServiceAssertionDecoder,
    private readonly replayStore: ReplayStore,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  operational() { return !(this.decoder instanceof UnconfiguredAssertionDecoder); }

  async verify(compactAssertion: string, binding: RequestBinding) {
    try {
      const decoded = await this.decoder.decode(compactAssertion);
      let replay: { jti: string; expiresAt: number } | undefined;
      const claims = validateServiceRequestAssertion(decoded.header, decoded.claims, binding, {
        consume(jti, expiresAt) { replay = { jti, expiresAt }; return true; },
      }, this.nowSeconds());
      if (!replay || !await this.replayStore.consume(replay.jti, replay.expiresAt)) {
        throw new Error("IDENTITY_SERVICE_ASSERTION_REPLAYED");
      }
      return { assertionId: claims.jti, clientId: claims.sub };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "IDENTITY_SERVICE_ASSERTION_REPLAYED") {
        throw new IdentityServiceError(401, "IDENTITY_SERVICE_ASSERTION_REPLAYED", "Service assertion is not valid.");
      }
      if (message === "IDENTITY_SERVICE_ASSERTION_EXPIRED") {
        throw new IdentityServiceError(401, "IDENTITY_SERVICE_ASSERTION_EXPIRED", "Service assertion is not valid.");
      }
      if (error instanceof IdentityServiceError) throw error;
      throw new IdentityServiceError(401, "IDENTITY_SERVICE_AUTH_INVALID", "Service authentication is not valid.");
    }
  }
}

export class JwksServiceAssertionDecoder implements ServiceAssertionDecoder {
  private readonly keys: ReturnType<typeof createLocalJWKSet>;
  constructor(jwksJson: string, private readonly expectedIssuer: string, private readonly expectedAudience: string,
    private readonly expectedClientId: string) {
    const parsed = JSON.parse(jwksJson) as JSONWebKeySet;
    this.keys = createLocalJWKSet(parsed);
  }
  async decode(compactAssertion: string) {
    const { protectedHeader, payload } = await jwtVerify(compactAssertion, this.keys, {
      algorithms: ["ES256"], issuer: this.expectedIssuer, audience: this.expectedAudience,
    });
    if (payload.sub !== this.expectedClientId) throw new Error("Unexpected service client");
    return { header: protectedHeader, claims: payload };
  }
}

export class UnconfiguredAssertionDecoder implements ServiceAssertionDecoder {
  async decode(): Promise<never> {
    throw new IdentityServiceError(503, "IDENTITY_SERVICE_UNAVAILABLE", "Identity service is not available.", true);
  }
}

export function requestBodySha256(req: Request) {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  return createHash("sha256").update(rawBody).digest("hex");
}
