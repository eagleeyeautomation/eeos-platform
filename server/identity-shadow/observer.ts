import { randomUUID } from "crypto";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { HttpIdentityShadowClient, ShadowClientError, type IdentityShadowClient, type ShadowSessionTransport } from "./client";
import { compareIdentityResults, normalizeShadowResponse, safeFingerprint, stableSample, type ComparableIdentityResult } from "./comparison";
import { loadIdentityShadowConfig, type IdentityShadowConfig } from "./config";
import { InMemoryIdentityShadowMetrics, type IdentityShadowMetrics, type ShadowOutcome } from "./metrics";

export type ShadowTelemetryEvent = {
  requestId: string; event: "identity.shadow_validation"; outcome: ShadowOutcome; endpointCategory: string;
  latencyMs: number; authoritativeCategory: string; shadowCategory: string; mismatchFields: string[];
  authoritativeFingerprint?: string; shadowFingerprint?: string; errorCode?: string; sampled: boolean; serviceVersion: "v1";
};
export interface ShadowTelemetry { emit(event: ShadowTelemetryEvent): void | Promise<void>; }
export type ShadowRunInput = {
  requestId: string; endpointCategory: string; eligible: boolean; session: ShadowSessionTransport;
  requestedGhlLocationId?: string; authoritative: () => Promise<ComparableIdentityResult>;
};

const consoleTelemetry: ShadowTelemetry = { emit(event) { if (process.env.NODE_ENV !== "test") console.info(JSON.stringify(event)); } };

export class IdentityShadowRunner {
  constructor(private readonly config: IdentityShadowConfig, private readonly client: IdentityShadowClient | undefined,
    private readonly telemetry: ShadowTelemetry = consoleTelemetry, private readonly metrics: IdentityShadowMetrics = new InMemoryIdentityShadowMetrics(),
    private readonly compare = compareIdentityResults, private readonly clock = () => performance.now()) {}

  async run(input: ShadowRunInput): Promise<ShadowOutcome> {
    const started = this.clock();
    if (input.eligible) this.safeMetric(() => this.metrics.eligible());
    const sampled = input.eligible && this.config.enabled && this.config.complete && stableSample(input.requestId, this.config.sampleRate);
    if (!sampled || !this.client) return this.finish("SHADOW_SKIPPED", input, started, { sampled: false });
    this.safeMetric(() => this.metrics.sampled());
    try {
      const authoritative = await input.authoritative();
      const service = await this.client.validate({ requestId: input.requestId, requestedGhlLocationId: input.requestedGhlLocationId, session: input.session });
      const shadow = service.kind === "success" ? normalizeShadowResponse(service.value) : normalizeIdentityError(service.category);
      const mismatchFields = this.compare(authoritative, shadow).map(String);
      return this.finish(mismatchFields.length === 0 ? "MATCH" : "MISMATCH", input, started, {
        sampled: true, authoritative, shadow, mismatchFields,
      });
    } catch (error) {
      const code = error instanceof ShadowClientError ? error.category : "SHADOW_INTERNAL_ERROR";
      return this.finish("SHADOW_ERROR", input, started, { sampled: true, errorCode: code });
    }
  }

  private finish(outcome: ShadowOutcome, input: ShadowRunInput, started: number, details: {
    sampled: boolean; authoritative?: ComparableIdentityResult; shadow?: ComparableIdentityResult; mismatchFields?: string[]; errorCode?: string;
  }) {
    const latencyMs = Math.max(0, this.clock() - started);
    const mismatchFields = details.mismatchFields ?? [];
    this.safeMetric(() => this.metrics.record(outcome, latencyMs, mismatchFields, details.errorCode));
    const event: ShadowTelemetryEvent = {
      requestId: input.requestId, event: "identity.shadow_validation", outcome, endpointCategory: input.endpointCategory,
      latencyMs, authoritativeCategory: details.authoritative?.category ?? "NOT_AVAILABLE",
      shadowCategory: details.shadow?.category ?? "NOT_AVAILABLE", mismatchFields, errorCode: details.errorCode,
      sampled: details.sampled, serviceVersion: "v1",
      ...(details.authoritative && this.config.fingerprintKey ? { authoritativeFingerprint: safeFingerprint(details.authoritative, this.config.fingerprintKey) } : {}),
      ...(details.shadow && this.config.fingerprintKey ? { shadowFingerprint: safeFingerprint(details.shadow, this.config.fingerprintKey) } : {}),
    };
    try { Promise.resolve(this.telemetry.emit(event)).catch(() => {}); } catch {}
    return outcome;
  }

  private safeMetric(action: () => void) { try { action(); } catch {} }
}

export function normalizeIdentityError(code: string): ComparableIdentityResult {
  const unauthorized = code === "IDENTITY_LOCATION_UNAUTHORIZED";
  return { category: unauthorized ? "UNAUTHORIZED_LOCATION" : "UNAUTHENTICATED", authenticated: unauthorized,
    userId: null, platformRole: null, organizationId: null, membershipId: null, subaccountId: null,
    authorizedSubaccountIds: [], authorizedGhlLocationId: null, displayName: null, email: null,
    sessionVersion: null, errorCategory: code };
}

export async function buildAuthoritativeResult(user: User, requestedGhlLocationId?: string): Promise<ComparableIdentityResult> {
  const subaccounts = await db.getUserSubaccounts(user.id);
  const selected = requestedGhlLocationId ? subaccounts.find((row) => row.ghlLocationId === requestedGhlLocationId) : undefined;
  if (requestedGhlLocationId && !selected) return normalizeIdentityError("IDENTITY_LOCATION_UNAUTHORIZED");
  const membership = selected ? await db.getMembershipById(selected.membershipId) : undefined;
  return { category: "AUTHENTICATED", authenticated: true, userId: String(user.id), platformRole: user.role,
    organizationId: membership ? String(membership.organizationId) : null,
    membershipId: selected ? String(selected.membershipId) : null, subaccountId: selected ? String(selected.id) : null,
    authorizedSubaccountIds: subaccounts.map((row) => String(row.id)), authorizedGhlLocationId: selected?.ghlLocationId ?? null,
    displayName: user.name ?? null, email: user.email ?? null, sessionVersion: "0", errorCategory: null };
}

const shadowConfig = loadIdentityShadowConfig();
const shadowClient = shadowConfig.complete ? new HttpIdentityShadowClient({
  serviceUrl: shadowConfig.serviceUrl!, clientId: shadowConfig.clientId!, requestPrivateKey: shadowConfig.requestPrivateKey!,
  requestKeyId: shadowConfig.requestKeyId!, trustedAssertionJwks: shadowConfig.trustedAssertionJwks!, timeoutMs: shadowConfig.timeoutMs,
}) : undefined;
const shadowRunner = new IdentityShadowRunner(shadowConfig, shadowClient);

export function observeIdentityShadow(req: Request, user: User & { isCron?: boolean }, session: ShadowSessionTransport) {
  try {
    if (!shadowConfig.enabled || !shadowConfig.complete || shadowConfig.sampleRate <= 0 || user.isCron) return;
    const requestIdHeader = req.header("x-eeos-request-id");
    const requestId = requestIdHeader && /^[A-Za-z0-9_-]{16,128}$/.test(requestIdHeader) ? requestIdHeader : randomUUID();
    const requestedGhlLocationId = typeof req.body?.ghlLocationId === "string" ? req.body.ghlLocationId
      : typeof req.body?.requestedGhlLocationId === "string" ? req.body.requestedGhlLocationId : undefined;
    const input: ShadowRunInput = { requestId, endpointCategory: endpointCategory(req.path), eligible: true,
      session, requestedGhlLocationId, authoritative: () => buildAuthoritativeResult(user, requestedGhlLocationId) };
    setImmediate(() => { void shadowRunner.run(input); });
  } catch {}
}

function endpointCategory(path: string) {
  if (path.includes("gohighlevel/oauth/start")) return "ghl_oauth_start";
  if (path.startsWith("/api/trpc")) return "api_trpc";
  return "protected_api";
}
