import { createHash, randomBytes, randomUUID } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import {
  IDENTITY_MAX_PAYLOAD_BYTES, SERVICE_REQUEST_AUDIENCE, SERVICE_REQUEST_ISSUER,
  identityErrorResponseSchema, sessionValidationResponseSchema, type IdentityAssertionClaims,
} from "../../shared/identityServiceContract";
import type { IdentityShadowConfig } from "./config";
import { assertOuterResponseMatchesClaims, CoreIdentityAssertionVerifier, IdentityAssertionVerificationError } from "./assertionVerifier";

const SESSION_PATH = "/internal/v1/session/validate" as const;
export type ShadowSessionTransport = { cookie?: string; bearer?: string };
export type ShadowValidationInput = { requestId: string; requestedGhlLocationId?: string; session: ShadowSessionTransport };
export type ShadowServiceResult = { kind: "success"; value: IdentityAssertionClaims } | { kind: "identity_error"; category: string };
export interface IdentityShadowClient { validate(input: ShadowValidationInput): Promise<ShadowServiceResult>; }

export class HttpIdentityShadowClient implements IdentityShadowClient {
  private key?: ReturnType<typeof importPKCS8>;
  private readonly responseVerifier: CoreIdentityAssertionVerifier;
  constructor(private readonly config: Required<Pick<IdentityShadowConfig,
    "serviceUrl" | "clientId" | "requestPrivateKey" | "requestKeyId" | "trustedAssertionJwks">> & Pick<IdentityShadowConfig, "timeoutMs">,
    private readonly fetcher: typeof fetch = fetch, private readonly now = () => new Date()) {
    this.responseVerifier = new CoreIdentityAssertionVerifier(config.trustedAssertionJwks, now);
  }

  async validate(input: ShadowValidationInput): Promise<ShadowServiceResult> {
    const timestamp = this.now();
    const nonce = randomBytes(18).toString("base64url");
    const body = JSON.stringify({ schemaVersion: "v1", requestId: input.requestId, timestamp: timestamp.toISOString(), nonce,
      ...(input.requestedGhlLocationId ? { requestedGhlLocationId: input.requestedGhlLocationId } : {}) });
    const bodySha256 = createHash("sha256").update(body).digest("hex");
    const assertion = await this.signRequest({ requestId: input.requestId, method: "POST", path: SESSION_PATH, bodySha256, nonce }, timestamp);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const headers: Record<string, string> = { "content-type": "application/json", authorization: `Bearer ${assertion}`,
        "x-eeos-request-id": input.requestId };
      if (input.session.cookie) headers.cookie = `app_session_id=${input.session.cookie}`;
      else if (input.session.bearer) headers["x-eeos-session-authorization"] = `Bearer ${input.session.bearer}`;
      const response = await this.fetcher(`${this.config.serviceUrl}${SESSION_PATH}`, {
        method: "POST", headers, body, signal: controller.signal,
      });
      const declaredSize = Number(response.headers.get("content-length") ?? "0");
      if (declaredSize > IDENTITY_MAX_PAYLOAD_BYTES) throw new ShadowClientError("RESPONSE_OVERSIZED");
      const bytes = await readBoundedResponse(response);
      let decoded: unknown;
      try { decoded = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { throw new ShadowClientError("RESPONSE_INVALID"); }
      if (!response.ok) {
        const parsedError = identityErrorResponseSchema.safeParse(decoded);
        const comparableCodes = new Set(["IDENTITY_SESSION_MISSING", "IDENTITY_SESSION_INVALID", "IDENTITY_SESSION_EXPIRED",
          "IDENTITY_SESSION_REVOKED", "IDENTITY_USER_NOT_FOUND", "IDENTITY_LOCATION_UNAUTHORIZED"]);
        if ((response.status === 401 || response.status === 403) && parsedError.success && comparableCodes.has(parsedError.data.error.code)) {
          return { kind: "identity_error", category: parsedError.data.error.code };
        }
        throw new ShadowClientError(`HTTP_${response.status}`);
      }
      if (!decoded || typeof decoded !== "object" || !("assertion" in decoded)) throw new ShadowClientError("missing_assertion");
      const expectedRequest = { requestId: input.requestId, method: "POST" as const, path: SESSION_PATH, bodySha256, nonce };
      try {
        if (typeof decoded.assertion !== "string") throw new IdentityAssertionVerificationError("malformed_assertion");
        const claims = await this.responseVerifier.verify(decoded.assertion, expectedRequest);
        const parsed = sessionValidationResponseSchema.safeParse(decoded);
        if (!parsed.success) throw new ShadowClientError("RESPONSE_INVALID");
        assertOuterResponseMatchesClaims(parsed.data, claims);
        return { kind: "success", value: claims };
      } catch (error) {
        if (error instanceof IdentityAssertionVerificationError) throw new ShadowClientError(error.category);
        throw error;
      }
    } catch (error) {
      if (error instanceof ShadowClientError) throw error;
      if (controller.signal.aborted) throw new ShadowClientError("TIMEOUT");
      throw new ShadowClientError("NETWORK_ERROR");
    } finally { clearTimeout(timer); }
  }

  private async signRequest(request: { requestId: string; method: "POST"; path: typeof SESSION_PATH; bodySha256: string; nonce: string }, now: Date) {
    try {
      const key = await (this.key ??= importPKCS8(this.config.requestPrivateKey.replace(/\\n/g, "\n"), "ES256"));
      const seconds = Math.floor(now.getTime() / 1_000);
      return await new SignJWT({ request }).setProtectedHeader({ alg: "ES256", typ: "JWT", kid: this.config.requestKeyId })
        .setIssuer(SERVICE_REQUEST_ISSUER).setAudience(SERVICE_REQUEST_AUDIENCE).setSubject(this.config.clientId)
        .setIssuedAt(seconds).setNotBefore(seconds).setExpirationTime(seconds + 30).setJti(randomUUID()).sign(key);
    } catch { throw new ShadowClientError("ASSERTION_SIGNING_FAILED"); }
  }
}

async function readBoundedResponse(response: Response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > IDENTITY_MAX_PAYLOAD_BYTES) throw new ShadowClientError("RESPONSE_OVERSIZED");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

export class ShadowClientError extends Error {
  constructor(readonly category: string) { super("Identity shadow request failed."); }
}
