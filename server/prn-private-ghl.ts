import type { Express } from "express";

type GhlFetchResult = {
  ok: boolean;
  status: number;
  path: string;
  data: unknown;
  errorSummary?: string;
  responseTimeMs: number;
  attempts?: GhlFetchAttempt[];
};

type GhlRecord = Record<string, unknown>;

type GhlFetchAttempt = {
  ok: boolean;
  status: number;
  path: string;
  errorSummary?: string;
};

type PrnLiveData = {
  ok: boolean;
  mode: "private_token";
  source: string;
  division: string;
  locationId: string;
  lastSync: string;
  location: ReturnType<typeof summarizeLocation>;
  metrics: {
    totalContacts: number;
    users: number;
    opportunities: number;
    openOpportunities: number;
    pipelineValue: number;
    healthScore: number;
  };
  endpointHealth: Record<"location" | "users" | "contacts" | "opportunities", ReturnType<typeof sanitizeFetchResult>>;
  records: {
    contacts: GhlRecord[];
    users: GhlRecord[];
    opportunities: GhlRecord[];
  };
};

type RecommendationCategory = "sales" | "revenue" | "operations" | "risk";
type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type ExecutiveRecommendation = {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  observation: string;
  evidence: Array<{
    metric: string;
    value: string;
    source: "GoHighLevel";
  }>;
  recommendedAction: string;
  expectedImpact: string;
  confidence: number;
  confidenceReason: string;
  measurement: string;
  dataTimestamp: string;
};

const ghlBaseUrl = "https://services.leadconnectorhq.com";

export function registerPrnPrivateGhlRoutes(app: Express) {
  app.get("/api/prn/gohighlevel/live-dashboard", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const { records: _records, ...safePayload } = liveData;

      res.status(liveData.ok ? 200 : 502).json(safePayload);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "live_dashboard.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        mode: "private_token",
        source: "Live PRN Staffers GoHighLevel",
        error: "Unable to retrieve live PRN Staffers GoHighLevel data.",
      });
    }
  });

  app.get("/api/prn/executive-recommendations", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const recommendations = buildExecutiveRecommendations(liveData);

      res.status(liveData.ok ? 200 : 207).json({
        ok: liveData.ok,
        source: liveData.source,
        division: liveData.division,
        dataTimestamp: liveData.lastSync,
        stale: isStale(liveData.lastSync),
        endpointHealth: liveData.endpointHealth,
        summary: summarizeExecutiveRecommendations(recommendations),
        recommendations,
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "executive_recommendations.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        source: "Live PRN Staffers GoHighLevel",
        error: "Unable to generate executive recommendations from live PRN Staffers GoHighLevel data.",
      });
    }
  });
}

async function loadPrnLiveData(): Promise<PrnLiveData> {
  const token = process.env.GHL_PRN_SOUTH_CAROLINA_PRIVATE_TOKEN;
  const locationId = process.env.GHL_PRN_SOUTH_CAROLINA_LOCATION_ID;

  if (!token || !locationId) {
    throw new Error("PRN Staffers South Carolina private-token integration is not configured.");
  }

  const client = createPrivateGhlClient(token);
  const [location, users, contacts, opportunities] = await Promise.all([
    client.getFirstOk([`/locations/${encodeURIComponent(locationId)}`], "location"),
    client.getFirstOk([
      `/users/search?locationId=${encodeURIComponent(locationId)}`,
      `/users/?locationId=${encodeURIComponent(locationId)}`,
    ], "users"),
    client.getFirstOk([`/contacts/?locationId=${encodeURIComponent(locationId)}&limit=100`], "contacts"),
    client.getFirstOk([`/opportunities/search?location_id=${encodeURIComponent(locationId)}&limit=100`], "opportunities"),
  ]);

  const contactsList = extractList(contacts.data, ["contacts"]);
  const opportunitiesList = extractList(opportunities.data, ["opportunities"]);
  const usersList = extractList(users.data, ["users"]);
  const pipelineValue = opportunitiesList.reduce((sum, opportunity) => sum + readMoney(opportunity), 0);
  const openOpportunities = opportunitiesList.filter((opportunity) => !isClosedOpportunity(opportunity)).length;
  const healthScore = calculateHealthScore({
    locationOk: location.ok,
    usersOk: users.ok,
    contactsOk: contacts.ok,
    opportunitiesOk: opportunities.ok,
    contactsCount: contactsList.length,
    opportunitiesCount: opportunitiesList.length,
    openOpportunities,
  });
  const lastSync = new Date().toISOString();

  return {
    ok: location.ok && users.ok && contacts.ok && opportunities.ok,
    mode: "private_token",
    source: "Live PRN Staffers GoHighLevel",
    division: "PRN Staffers South Carolina",
    locationId,
    lastSync,
    location: summarizeLocation(location.data, locationId),
    metrics: {
      totalContacts: contactsList.length,
      users: usersList.length,
      opportunities: opportunitiesList.length,
      openOpportunities,
      pipelineValue,
      healthScore,
    },
    endpointHealth: {
      location: sanitizeFetchResult(location),
      users: sanitizeFetchResult(users),
      contacts: sanitizeFetchResult(contacts),
      opportunities: sanitizeFetchResult(opportunities),
    },
    records: {
      contacts: contactsList,
      users: usersList,
      opportunities: opportunitiesList,
    },
  };
}

function createPrivateGhlClient(token: string) {
  async function request(path: string, operation: string): Promise<GhlFetchResult> {
    const startedAt = Date.now();
    const response = await fetch(`${ghlBaseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Version: process.env.GHL_API_VERSION || "2021-07-28",
      },
    });
    const text = await response.text();
    const data = parseJson(text);
    const errorSummary = response.ok ? undefined : summarizeGhlError(data, text);

    console.log(JSON.stringify({
      level: response.ok ? "info" : "warn",
      component: "prn_private_ghl",
      event: "ghl.request",
      operation,
      path,
      status: response.status,
      responseTimeMs: Date.now() - startedAt,
    }));

    return {
      ok: response.ok,
      status: response.status,
      path,
      data,
      errorSummary,
      responseTimeMs: Date.now() - startedAt,
    };
  }

  return {
    async getFirstOk(paths: string[], operation: string) {
      let lastResult: GhlFetchResult | null = null;
      const attempts: GhlFetchAttempt[] = [];

      for (const path of paths) {
        const result = await request(path, operation);
        attempts.push(summarizeAttempt(result));
        if (result.ok) {
          return { ...result, attempts };
        }
        lastResult = result;
      }

      return lastResult ? { ...lastResult, attempts } : { ok: false, status: 500, path: paths[0] || "", data: {}, responseTimeMs: 0, attempts };
    },
  };
}

function parseJson(text: string) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 240) };
  }
}

function extractList(data: unknown, preferredKeys: string[]): GhlRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  for (const key of preferredKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

function summarizeLocation(data: unknown, fallbackLocationId: string) {
  const location = isRecord(data) && isRecord(data.location) ? data.location : data;
  if (!isRecord(location)) {
    return { id: fallbackLocationId, name: "PRN Staffers South Carolina" };
  }

  return {
    id: readString(location.id) || fallbackLocationId,
    name: readString(location.name) || readString(location.businessName) || "PRN Staffers South Carolina",
    city: readString(location.city),
    state: readString(location.state),
  };
}

function sanitizeFetchResult(result: GhlFetchResult) {
  return {
    ok: result.ok,
    status: result.status,
    path: result.path,
    errorSummary: result.errorSummary,
    responseTimeMs: result.responseTimeMs,
    attempts: result.attempts,
  };
}

function summarizeAttempt(result: GhlFetchResult): GhlFetchAttempt {
  return {
    ok: result.ok,
    status: result.status,
    path: result.path,
    errorSummary: result.errorSummary,
  };
}

function summarizeGhlError(data: unknown, rawText: string) {
  if (isRecord(data)) {
    for (const key of ["message", "error", "error_description", "msg"]) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) {
        return redactSensitiveText(value);
      }
    }
  }

  return redactSensitiveText(rawText).slice(0, 240);
}

function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9._~+/=-]{32,}/g, "[REDACTED]");
}

export function buildExecutiveRecommendations(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records">): ExecutiveRecommendation[] {
  const confidence = calculateRecommendationConfidence(liveData);
  const confidenceReason = buildConfidenceReason(liveData, confidence);
  const stale = isStale(liveData.lastSync);
  const recommendations: ExecutiveRecommendation[] = [];
  const metrics = liveData.metrics;
  const oldestOpenOpportunityDays = calculateOldestOpenOpportunityDays(liveData.records.opportunities);
  const statusSummary = summarizeOpportunityStatuses(liveData.records.opportunities);

  if (stale) {
    recommendations.push({
      id: "risk-stale-live-data",
      category: "risk",
      priority: "high",
      observation: "Fact: live data is stale because the last sync is older than 15 minutes.",
      evidence: [
        evidence("Last sync", liveData.lastSync),
        evidence("Stale threshold", "15 minutes"),
      ],
      recommendedAction: "Refresh the GoHighLevel connection and verify endpoint health before making operational decisions.",
      expectedImpact: "Insufficient data: EEOS cannot estimate business impact from stale data alone.",
      confidence,
      confidenceReason,
      measurement: "Success is measured by a last sync timestamp less than 15 minutes old and healthy endpoint responses.",
      dataTimestamp: liveData.lastSync,
    });
  }

  if (!allRequiredEndpointsHealthy(liveData.endpointHealth)) {
    recommendations.push({
      id: "risk-unhealthy-ghl-endpoints",
      category: "risk",
      priority: "critical",
      observation: "Fact: one or more required GoHighLevel endpoints are unhealthy.",
      evidence: Object.entries(liveData.endpointHealth).map(([name, health]) => evidence(`${name} endpoint`, `HTTP ${health.status}`)),
      recommendedAction: "Review GoHighLevel endpoint responses and retry the live sync before relying on the dashboard.",
      expectedImpact: "Insufficient data: incomplete endpoint health prevents a reliable impact estimate.",
      confidence,
      confidenceReason,
      measurement: "Success is measured when location, users, contacts, and opportunities endpoints all return successful responses.",
      dataTimestamp: liveData.lastSync,
    });
  }

  if (metrics.openOpportunities > 50) {
    const opportunityAgeEvidence = oldestOpenOpportunityDays === null
      ? [evidence("Oldest open opportunity age", "Insufficient data")]
      : [evidence("Oldest open opportunity age", `${oldestOpenOpportunityDays} days`)];

    recommendations.push({
      id: "sales-high-open-opportunity-volume",
      category: "sales",
      priority: "high",
      observation: "Fact: open opportunities are above the V1 review threshold.",
      evidence: [
        evidence("Open opportunities", metrics.openOpportunities),
        evidence("Review threshold", 50),
        ...opportunityAgeEvidence,
      ],
      recommendedAction: "Review stalled opportunities and assign follow-up tasks to named owners.",
      expectedImpact: "Insufficient data: historical conversion data is not available, so EEOS cannot project revenue impact.",
      confidence,
      confidenceReason,
      measurement: "Success is measured by a lower count of open opportunities without a next step or owner.",
      dataTimestamp: liveData.lastSync,
    });
  }

  if (metrics.pipelineValue > 10000) {
    recommendations.push({
      id: "revenue-strong-pipeline-value",
      category: "revenue",
      priority: metrics.openOpportunities > 50 ? "high" : "medium",
      observation: "Fact: pipeline value is above the V1 revenue review threshold.",
      evidence: [
        evidence("Pipeline value", formatUsd(metrics.pipelineValue)),
        evidence("Revenue review threshold", formatUsd(10000)),
        evidence("Opportunity statuses", statusSummary || "Insufficient data"),
      ],
      recommendedAction: "Focus leadership review on conversion blockers, next steps, and stage accuracy for the active pipeline.",
      expectedImpact: "Insufficient data: no verified historical conversion rate is available, so EEOS will not state a financial projection.",
      confidence,
      confidenceReason,
      measurement: "Success is measured by verified stage movement and updated next steps on open opportunities.",
      dataTimestamp: liveData.lastSync,
    });
  }

  recommendations.push({
    id: "sales-contact-to-opportunity-coverage",
    category: "sales",
    priority: metrics.totalContacts > metrics.opportunities ? "medium" : "low",
    observation: metrics.totalContacts > metrics.opportunities
      ? "Fact: current contacts exceed current opportunities. Inference: lead-to-opportunity conversion should be reviewed."
      : "Fact: current opportunities are not lower than current contacts. Inference: conversion coverage does not trigger the V1 contact rule.",
    evidence: [
      evidence("Contacts", metrics.totalContacts),
      evidence("Opportunities", metrics.opportunities),
      evidence("Growth rate", "Insufficient data"),
    ],
    recommendedAction: "Compare recent contacts with opportunity creation and confirm qualified leads are being converted consistently.",
    expectedImpact: "Insufficient data: contact growth history is not available, so EEOS cannot quantify conversion impact.",
    confidence,
    confidenceReason,
    measurement: "Success is measured by the number of qualified contacts linked to a current opportunity.",
    dataTimestamp: liveData.lastSync,
  });

  recommendations.push({
    id: "operations-business-health-status",
    category: metrics.healthScore < 70 ? "risk" : "operations",
    priority: metrics.healthScore < 70 ? "critical" : metrics.healthScore < 90 ? "medium" : "low",
    observation: `Fact: business health is ${healthBand(metrics.healthScore)} based on verified endpoint health and available live metrics.`,
    evidence: [
      evidence("Business health score", allRequiredEndpointsHealthy(liveData.endpointHealth) ? metrics.healthScore : "Insufficient data"),
      evidence("Health band", healthBand(metrics.healthScore)),
      evidence("Required endpoints healthy", allRequiredEndpointsHealthy(liveData.endpointHealth) ? "Yes" : "No"),
    ],
    recommendedAction: metrics.healthScore >= 90
      ? "Maintain endpoint monitoring and keep opportunity follow-up discipline visible to leadership."
      : "Review unhealthy endpoints, missing data, and open opportunity ownership before using this dashboard for decisions.",
    expectedImpact: "Insufficient data: health score is an operational indicator, not a financial forecast.",
    confidence,
    confidenceReason,
    measurement: "Success is measured by healthy required endpoints and complete contacts, users, and opportunity counts.",
    dataTimestamp: liveData.lastSync,
  });

  return recommendations;
}

export function calculateRecommendationConfidence(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records">) {
  const endpointNames = ["location", "users", "contacts", "opportunities"] as const;
  const healthyEndpoints = endpointNames.filter((name) => Boolean(liveData.endpointHealth[name]?.ok)).length;
  const endpointScore = healthyEndpoints / endpointNames.length;
  const completenessChecks = [
    liveData.metrics.totalContacts > 0,
    liveData.metrics.users > 0,
    liveData.metrics.opportunities > 0,
    liveData.metrics.openOpportunities >= 0,
    liveData.metrics.pipelineValue >= 0,
    Boolean(liveData.lastSync),
  ];
  const completenessScore = completenessChecks.filter(Boolean).length / completenessChecks.length;
  const freshnessScore = isStale(liveData.lastSync) ? 0 : 1;

  return Math.round((endpointScore * 0.5 + completenessScore * 0.35 + freshnessScore * 0.15) * 100);
}

function summarizeExecutiveRecommendations(recommendations: ExecutiveRecommendation[]) {
  const topDecision = recommendations.find((item) => item.priority === "critical")
    || recommendations.find((item) => item.priority === "high")
    || recommendations[0];
  const byCategory = (category: RecommendationCategory) => recommendations.find((item) => item.category === category);
  const risk = byCategory("risk");

  return {
    executiveSummary: recommendations[0]?.observation || "Insufficient data.",
    topDecision: topDecision?.recommendedAction || "Insufficient data.",
    revenueInsight: byCategory("revenue")?.observation || "Insufficient data.",
    salesInsight: byCategory("sales")?.observation || "Insufficient data.",
    operationalInsight: byCategory("operations")?.observation || "Insufficient data.",
    riskAlert: risk?.observation || "No active risk alert from verified live data.",
  };
}

function buildConfidenceReason(liveData: Pick<PrnLiveData, "endpointHealth" | "lastSync">, confidence: number) {
  const healthyCount = Object.values(liveData.endpointHealth).filter((health) => health.ok).length;
  const totalCount = Object.values(liveData.endpointHealth).length;
  const staleText = isStale(liveData.lastSync) ? "Data is stale." : "Data is fresh.";
  return `${confidence}/100 based on ${healthyCount}/${totalCount} healthy required endpoints and available live metrics. ${staleText}`;
}

function evidence(metric: string, value: string | number) {
  return {
    metric,
    value: String(value),
    source: "GoHighLevel" as const,
  };
}

function healthBand(score: number) {
  if (score >= 90) return "Green";
  if (score >= 70) return "Yellow";
  return "Red";
}

export function isStale(timestamp: string, now = new Date()) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return true;
  return now.getTime() - parsed.getTime() > 15 * 60 * 1000;
}

function allRequiredEndpointsHealthy(endpointHealth: PrnLiveData["endpointHealth"]) {
  return Boolean(endpointHealth.location?.ok && endpointHealth.users?.ok && endpointHealth.contacts?.ok && endpointHealth.opportunities?.ok);
}

function summarizeOpportunityStatuses(opportunities: GhlRecord[]) {
  const counts = new Map<string, number>();
  for (const opportunity of opportunities) {
    const status = readString(opportunity.status) || readString(opportunity.pipelineStageName) || readString(opportunity.stageName);
    if (!status) continue;
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => `${status}: ${count}`).join(", ");
}

function calculateOldestOpenOpportunityDays(opportunities: GhlRecord[]) {
  const now = Date.now();
  let oldestDays: number | null = null;

  for (const opportunity of opportunities) {
    if (isClosedOpportunity(opportunity)) continue;
    const date = readOpportunityDate(opportunity);
    if (!date) continue;
    const ageDays = Math.max(0, Math.floor((now - date.getTime()) / 86_400_000));
    oldestDays = oldestDays === null ? ageDays : Math.max(oldestDays, ageDays);
  }

  return oldestDays;
}

function readOpportunityDate(record: GhlRecord) {
  for (const key of ["createdAt", "dateAdded", "updatedAt", "lastStatusChangeAt", "lastStageChangeAt"]) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateHealthScore(input: {
  locationOk: boolean;
  usersOk: boolean;
  contactsOk: boolean;
  opportunitiesOk: boolean;
  contactsCount: number;
  opportunitiesCount: number;
  openOpportunities: number;
}) {
  let score = 45;
  if (input.locationOk) score += 10;
  if (input.usersOk) score += 10;
  if (input.contactsOk) score += 5;
  if (input.opportunitiesOk) score += 5;
  if (input.contactsCount > 0) score += 15;
  if (input.opportunitiesCount > 0) score += 10;
  if (input.openOpportunities > 0) score += 10;
  const allRequiredEndpointsHealthy = input.locationOk && input.usersOk && input.contactsOk && input.opportunitiesOk;
  return allRequiredEndpointsHealthy ? Math.min(score, 100) : Math.min(score, 89);
}

function readMoney(record: GhlRecord) {
  for (const key of ["monetaryValue", "monetary_value", "value", "pipelineValue"]) {
    const value = record[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : 0;
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return 0;
}

function isClosedOpportunity(record: GhlRecord) {
  const status = `${readString(record.status) || readString(record.pipelineStageName) || ""}`.toLowerCase();
  return status.includes("won") || status.includes("lost") || status.includes("closed");
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is GhlRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
