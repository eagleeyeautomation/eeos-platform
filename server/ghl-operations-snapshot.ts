import { createHash } from "crypto";
import { getValidGhlToken, maskGhlLocationId } from "./ghl-token-store";

const GHL_API_ORIGIN = "https://services.leadconnectorhq.com";
const PAGE_SIZE = 20;
const MAX_PAGES = 25;
const MAX_RETRIES = 2;
const REQUIRED_SCOPES = ["contacts.readonly", "opportunities.readonly"];
const jobs = new Map<string, Promise<GhlOperationsSnapshot>>();

type JsonRecord = Record<string, unknown>;
type ProviderGet = (path: string) => Promise<JsonRecord>;

export type GhlOperationsSnapshot = {
  organizationId: string;
  organizationName: string;
  location: { name: string; maskedProviderLocationId: string };
  provider: "gohighlevel";
  connection: { connected: true; healthy: true };
  contacts: { total: number; createdLast7Days: number; createdLast30Days: number };
  opportunities: {
    openTotal: number;
    createdLast7Days: number;
    createdLast30Days: number;
    byStage: Array<{
      pipelineIdentifier: string;
      pipelineName: string;
      stageIdentifier: string;
      stageName: string;
      count: number;
    }>;
  };
  pipelines: Array<{ identifier: string; name: string }>;
  generatedAt: string;
  partial: boolean;
};

export class GhlSnapshotError extends Error {
  constructor(
    readonly code:
      | "binding_mismatch"
      | "connection_unavailable"
      | "provider_unavailable"
      | "reauthorization_required"
      | "scope_missing",
    message: string,
  ) {
    super(message);
    this.name = "GhlSnapshotError";
  }
}

export function assertSnapshotProviderMethod(method: string) {
  if (method.toUpperCase() !== "GET") {
    throw new Error("The GoHighLevel operations snapshot permits GET requests only.");
  }
}

function safeIdentifier(kind: "pipeline" | "stage", value: string) {
  return `${kind}_${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function createdAt(record: JsonRecord) {
  const value = text(record.dateAdded) || text(record.createdAt) || text(record.created_at);
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function countSince(records: JsonRecord[], since: number) {
  return records.reduce((count, record) => {
    const timestamp = createdAt(record);
    return count + (timestamp !== null && timestamp >= since ? 1 : 0);
  }, 0);
}

function assertLocation(records: JsonRecord[], expectedLocationId: string) {
  for (const record of records) {
    const actual = text(record.locationId) || text(record.location_id);
    if (actual && actual !== expectedLocationId) {
      throw new GhlSnapshotError("binding_mismatch", "GoHighLevel returned a cross-location response.");
    }
  }
}

function providerDelay(attempt: number, retryAfter: string | null) {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 2_000);
  return Math.min(100 * (2 ** attempt), 1_000);
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function snapshotProviderGet(
  path: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JsonRecord> {
  assertSnapshotProviderMethod("GET");
  const url = new URL(path, GHL_API_ORIGIN);
  if (url.origin !== GHL_API_ORIGIN) throw new Error("Unapproved GoHighLevel provider origin.");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });
    if (response.ok) return object(await response.json());
    if (response.status === 401 || response.status === 403) {
      throw new GhlSnapshotError("reauthorization_required", "GoHighLevel authorization must be renewed.");
    }
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      await wait(providerDelay(attempt, response.headers.get("retry-after")));
      continue;
    }
    throw new GhlSnapshotError("provider_unavailable", `GoHighLevel read failed with HTTP ${response.status}.`);
  }
  throw new GhlSnapshotError("provider_unavailable", "GoHighLevel read failed.");
}

function nextContactsPath(payload: JsonRecord, locationId: string) {
  const contacts = array(payload.contacts);
  const last = contacts.at(-1);
  const meta = object(payload.meta);
  const providerNext = safeProviderNextPath(text(meta.nextPageUrl), locationId);
  if (providerNext) return providerNext;
  const startAfterId = text(meta.startAfterId) || text(last?.id);
  const lastCreatedAt = createdAt(last ?? {});
  const startAfter = number(meta.startAfter) ?? (lastCreatedAt === null ? undefined : lastCreatedAt);
  if (contacts.length < PAGE_SIZE || !startAfterId) return null;
  const query = new URLSearchParams({ locationId, limit: String(PAGE_SIZE), startAfterId });
  if (startAfter !== undefined) query.set("startAfter", String(startAfter));
  return `/contacts/?${query}`;
}

function nextOpportunityPath(payload: JsonRecord, locationId: string, page: number) {
  const opportunities = array(payload.opportunities);
  const meta = object(payload.meta);
  const providerNext = safeProviderNextPath(text(meta.nextPageUrl), locationId);
  if (providerNext) return providerNext;
  const nextPage = number(meta.nextPage);
  if (opportunities.length < PAGE_SIZE && nextPage === undefined) return null;
  const query = new URLSearchParams({
    location_id: locationId,
    status: "open",
    limit: String(PAGE_SIZE),
    page: String(nextPage ?? page + 1),
  });
  return `/opportunities/search?${query}`;
}

function safeProviderNextPath(value: string, locationId: string) {
  if (!value) return null;
  const next = new URL(value, GHL_API_ORIGIN);
  if (next.origin !== GHL_API_ORIGIN) {
    throw new GhlSnapshotError("binding_mismatch", "GoHighLevel returned an unapproved pagination destination.");
  }
  const responseLocation = next.searchParams.get("locationId") || next.searchParams.get("location_id");
  if (responseLocation && responseLocation !== locationId) {
    throw new GhlSnapshotError("binding_mismatch", "GoHighLevel returned cross-location pagination.");
  }
  return `${next.pathname}${next.search}`;
}

async function collectPages(input: {
  firstPath: string;
  locationId: string;
  listKey: "contacts" | "opportunities";
  get: ProviderGet;
  next: (payload: JsonRecord, locationId: string, page: number) => string | null;
}) {
  const records: JsonRecord[] = [];
  let path: string | null = input.firstPath;
  let providerTotal: number | undefined;
  let pages = 0;
  while (path && pages < MAX_PAGES) {
    const payload = await input.get(path);
    const page = array(payload[input.listKey]);
    assertLocation(page, input.locationId);
    records.push(...page);
    providerTotal ??= number(payload.count) ?? number(object(payload.meta).total);
    pages += 1;
    path = input.next(payload, input.locationId, pages);
  }
  return {
    records,
    total: providerTotal ?? records.length,
    partial: Boolean(path) || (providerTotal !== undefined && records.length < providerTotal),
  };
}

export async function buildGhlOperationsSnapshot(
  input: {
    organizationId: string;
    organizationName: string;
    locationId: string;
    locationName: string;
  },
  dependencies: {
    getToken?: typeof getValidGhlToken;
    providerGet?: (path: string, accessToken: string) => Promise<JsonRecord>;
    now?: () => Date;
  } = {},
): Promise<GhlOperationsSnapshot> {
  const key = `${input.organizationId}:${input.locationId}`;
  const existing = jobs.get(key);
  if (existing) return existing;

  const pending: Promise<GhlOperationsSnapshot> = (async () => {
    const token = await (dependencies.getToken ?? getValidGhlToken)(input.organizationId, input.locationId);
    if (token.locationId !== input.locationId) {
      throw new GhlSnapshotError("binding_mismatch", "GoHighLevel token location binding mismatch.");
    }
    const scopes = new Set(token.scopes);
    const missing = REQUIRED_SCOPES.filter((scope) => !scopes.has(scope));
    if (missing.length) {
      throw new GhlSnapshotError("scope_missing", `The connected GoHighLevel token is missing required read scope: ${missing.join(", ")}.`);
    }
    const get = async (path: string) => (dependencies.providerGet ?? snapshotProviderGet)(path, token.accessToken);
    const pipelinesPayload = await get(`/opportunities/pipelines?locationId=${encodeURIComponent(input.locationId)}`);
    const pipelineRecords = array(pipelinesPayload.pipelines);
    assertLocation(pipelineRecords, input.locationId);

    const pipelineMap = new Map<string, { identifier: string; name: string }>();
    const stageMap = new Map<string, { identifier: string; name: string; pipelineIdentifier: string; pipelineName: string }>();
    for (const pipeline of pipelineRecords) {
      const pipelineId = text(pipeline.id);
      if (!pipelineId) continue;
      const pipelineEntry = {
        identifier: safeIdentifier("pipeline", pipelineId),
        name: text(pipeline.name) || "Unnamed pipeline",
      };
      pipelineMap.set(pipelineId, pipelineEntry);
      for (const stage of array(pipeline.stages)) {
        const stageId = text(stage.id);
        if (!stageId) continue;
        stageMap.set(stageId, {
          identifier: safeIdentifier("stage", stageId),
          name: text(stage.name) || "Unnamed stage",
          pipelineIdentifier: pipelineEntry.identifier,
          pipelineName: pipelineEntry.name,
        });
      }
    }

    const contacts = await collectPages({
      firstPath: `/contacts/?${new URLSearchParams({ locationId: input.locationId, limit: String(PAGE_SIZE) })}`,
      locationId: input.locationId,
      listKey: "contacts",
      get: (path) => get(path),
      next: (payload, locationId) => nextContactsPath(payload, locationId),
    });
    const opportunities = await collectPages({
      firstPath: `/opportunities/search?${new URLSearchParams({
        location_id: input.locationId,
        status: "open",
        limit: String(PAGE_SIZE),
      })}`,
      locationId: input.locationId,
      listKey: "opportunities",
      get: (path) => get(path),
      next: nextOpportunityPath,
    });

    const now = (dependencies.now ?? (() => new Date()))();
    const last7Days = now.getTime() - 7 * 24 * 60 * 60 * 1_000;
    const last30Days = now.getTime() - 30 * 24 * 60 * 60 * 1_000;
    const open = opportunities.records.filter((record) => text(record.status).toLowerCase() === "open");
    const stageCounts = new Map<string, number>();
    for (const opportunity of open) {
      const stageId = text(opportunity.pipelineStageId) || text(opportunity.pipeline_stage_id);
      stageCounts.set(stageId, (stageCounts.get(stageId) ?? 0) + 1);
    }

    return {
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      location: {
        name: input.locationName,
        maskedProviderLocationId: maskGhlLocationId(input.locationId),
      },
      provider: "gohighlevel" as const,
      connection: { connected: true as const, healthy: true as const },
      contacts: {
        total: contacts.total,
        createdLast7Days: countSince(contacts.records, last7Days),
        createdLast30Days: countSince(contacts.records, last30Days),
      },
      opportunities: {
        openTotal: opportunities.total,
        createdLast7Days: countSince(open, last7Days),
        createdLast30Days: countSince(open, last30Days),
        byStage: Array.from(stageCounts.entries()).map(([stageId, count]) => {
          const stage = stageMap.get(stageId);
          const pipeline = pipelineMap.get(text(open.find((item) =>
            (text(item.pipelineStageId) || text(item.pipeline_stage_id)) === stageId)?.pipelineId));
          return {
            pipelineIdentifier: stage?.pipelineIdentifier ?? pipeline?.identifier ?? "pipeline_unknown",
            pipelineName: stage?.pipelineName ?? pipeline?.name ?? "Unknown pipeline",
            stageIdentifier: stage?.identifier ?? (stageId ? safeIdentifier("stage", stageId) : "stage_unknown"),
            stageName: stage?.name ?? "Unknown stage",
            count,
          };
        }),
      },
      pipelines: Array.from(pipelineMap.values()),
      generatedAt: now.toISOString(),
      partial: contacts.partial || opportunities.partial,
    };
  })().finally(() => jobs.delete(key));

  jobs.set(key, pending);
  return pending;
}

export const GHL_SNAPSHOT_LIMITS = { pageSize: PAGE_SIZE, maxPages: MAX_PAGES, maxRetries: MAX_RETRIES };
