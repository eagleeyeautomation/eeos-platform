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
type IntelligenceUrgency = "Immediate" | "This Week" | "This Month" | "Monitor";

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

export type PrnIntelligenceEngineRecommendation = {
  id: string;
  category: "Sales" | "Revenue" | "Operations" | "Marketing" | "Risk" | "Customer Experience" | "Growth";
  observation: string;
  evidence: Array<{
    metric: string;
    value: string;
    source: "GoHighLevel";
  }>;
  businessImpact: string;
  recommendation: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  confidence: number;
  confidenceReason: string;
  measurement: string;
  dataTimestamp: string;
  businessImpactScore: number;
  urgency: IntelligenceUrgency;
};

export type PrnIntelligenceEngineResult = {
  ok: boolean;
  source: string;
  division: string;
  dataTimestamp: string;
  executiveSummary: string;
  topRecommendation: PrnIntelligenceEngineRecommendation | null;
  topRisk: PrnIntelligenceEngineRecommendation | null;
  topOpportunity: PrnIntelligenceEngineRecommendation | null;
  recommendations: PrnIntelligenceEngineRecommendation[];
  dashboard: {
    businessImpact: number;
    urgency: IntelligenceUrgency;
    confidence: number;
    supportingEvidence: string[];
  };
};

type B2BEvidence = Array<{
  metric: string;
  value: string;
  source: "GoHighLevel";
  recordIds?: string[];
}>;

type B2BInsight = {
  id: string;
  label: string;
  observation: string;
  evidence: B2BEvidence;
};

export type B2BIntelligence = {
  summary: string;
  sourcePerformance: B2BInsight[];
  stalledOpportunities: B2BInsight[];
  highValueOpportunities: B2BInsight[];
  referralInsights: B2BInsight[];
  territoryInsights: B2BInsight[];
  recommendedActions: B2BInsight[];
  confidence: number;
  dataTimestamp: string;
};

export type C2BIntelligence = {
  consumerDemandSummary: string;
  serviceInterest: B2BInsight[];
  geographicDemand: B2BInsight[];
  journeyDropOffs: B2BInsight[];
  responseTimeInsights: B2BInsight[];
  conversionSignals: B2BInsight[];
  recommendedActions: B2BInsight[];
  confidence: number;
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

  app.get("/api/prn/intelligence-engine", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const intelligence = buildPrnIntelligenceEngine(liveData);

      res.status(liveData.ok ? 200 : 207).json({
        ...intelligence,
        endpointHealth: liveData.endpointHealth,
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "intelligence_engine.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        source: "Live PRN Staffers GoHighLevel",
        executiveSummary: "Insufficient data.",
        recommendations: [],
        error: "Unable to generate Intelligence Engine output from live PRN Staffers GoHighLevel data.",
      });
    }
  });

  app.get("/api/prn/b2b-intelligence", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const b2bIntelligence = buildB2BIntelligence(liveData);

      res.status(liveData.ok ? 200 : 207).json({
        ok: liveData.ok,
        source: liveData.source,
        division: liveData.division,
        endpointHealth: liveData.endpointHealth,
        ...b2bIntelligence,
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "b2b_intelligence.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        summary: "Insufficient data.",
        sourcePerformance: [],
        stalledOpportunities: [],
        highValueOpportunities: [],
        referralInsights: [],
        territoryInsights: [],
        recommendedActions: [],
        confidence: 0,
        dataTimestamp: new Date().toISOString(),
        error: "Unable to generate B2B intelligence from live PRN Staffers GoHighLevel data.",
      });
    }
  });

  app.get("/api/prn/c2b-intelligence", async (_req, res) => {
    try {
      const liveData = await loadPrnLiveData();
      const c2bIntelligence = buildC2BIntelligence(liveData);

      res.status(liveData.ok ? 200 : 207).json({
        ok: liveData.ok,
        source: liveData.source,
        division: liveData.division,
        endpointHealth: liveData.endpointHealth,
        ...c2bIntelligence,
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        component: "prn_private_ghl",
        event: "c2b_intelligence.failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      res.status(502).json({
        ok: false,
        consumerDemandSummary: "Insufficient data.",
        serviceInterest: [],
        geographicDemand: [],
        journeyDropOffs: [],
        responseTimeInsights: [],
        conversionSignals: [],
        recommendedActions: [],
        confidence: 0,
        dataTimestamp: new Date().toISOString(),
        error: "Unable to generate C2B intelligence from live PRN Staffers GoHighLevel data.",
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

export function buildPrnIntelligenceEngine(liveData: Pick<PrnLiveData, "ok" | "source" | "division" | "metrics" | "endpointHealth" | "lastSync" | "records">): PrnIntelligenceEngineResult {
  const executiveRecommendations = buildExecutiveRecommendations(liveData);
  const recommendations = executiveRecommendations.map(toIntelligenceRecommendation);
  const sorted = recommendations.slice().sort((a, b) => {
    const impactDelta = b.businessImpactScore - a.businessImpactScore;
    return impactDelta !== 0 ? impactDelta : b.confidence - a.confidence;
  });
  const topRecommendation = sorted[0] ?? null;
  const topRisk = sorted.find((recommendation) => recommendation.category === "Risk") ?? null;
  const topOpportunity = sorted.find((recommendation) => ["Sales", "Revenue", "Growth", "Marketing"].includes(recommendation.category)) ?? null;
  const dashboardRecommendation = topRecommendation ?? topRisk ?? topOpportunity;

  return {
    ok: liveData.ok,
    source: liveData.source,
    division: liveData.division,
    dataTimestamp: liveData.lastSync,
    executiveSummary: buildIntelligenceExecutiveSummary(sorted, liveData),
    topRecommendation,
    topRisk,
    topOpportunity,
    recommendations: sorted,
    dashboard: {
      businessImpact: dashboardRecommendation?.businessImpactScore ?? 0,
      urgency: dashboardRecommendation?.urgency ?? "Monitor",
      confidence: dashboardRecommendation?.confidence ?? 0,
      supportingEvidence: dashboardRecommendation?.evidence.map((item) => `${item.metric}: ${item.value}`) ?? ["Insufficient data."],
    },
  };
}

function toIntelligenceRecommendation(recommendation: ExecutiveRecommendation): PrnIntelligenceEngineRecommendation {
  const confidence = recommendation.confidence;
  const action = confidence < 80
    ? "Additional data is required before making this recommendation."
    : recommendation.recommendedAction;

  return {
    id: recommendation.id,
    category: mapRecommendationCategory(recommendation.category),
    observation: recommendation.observation,
    evidence: recommendation.evidence,
    businessImpact: recommendation.expectedImpact,
    recommendation: action,
    priority: mapRecommendationPriority(recommendation.priority),
    confidence,
    confidenceReason: confidence < 80
      ? `${recommendation.confidenceReason} Additional data is required before making this recommendation.`
      : recommendation.confidenceReason,
    measurement: recommendation.measurement,
    dataTimestamp: recommendation.dataTimestamp,
    businessImpactScore: calculateBusinessImpactScore(recommendation),
    urgency: mapRecommendationUrgency(recommendation),
  };
}

function mapRecommendationCategory(category: RecommendationCategory): PrnIntelligenceEngineRecommendation["category"] {
  switch (category) {
    case "sales":
      return "Sales";
    case "revenue":
      return "Revenue";
    case "operations":
      return "Operations";
    case "risk":
      return "Risk";
  }
}

function mapRecommendationPriority(priority: RecommendationPriority): PrnIntelligenceEngineRecommendation["priority"] {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

function mapRecommendationUrgency(recommendation: ExecutiveRecommendation): IntelligenceUrgency {
  if (recommendation.priority === "critical") return "Immediate";
  if (recommendation.priority === "high") return "This Week";
  if (recommendation.priority === "medium") return "This Month";
  return "Monitor";
}

function calculateBusinessImpactScore(recommendation: ExecutiveRecommendation) {
  const priorityBase = { critical: 95, high: 82, medium: 62, low: 35 }[recommendation.priority];
  const confidenceAdjustment = Math.round((recommendation.confidence - 80) / 5);
  return clampScore(priorityBase + confidenceAdjustment);
}

function buildIntelligenceExecutiveSummary(recommendations: PrnIntelligenceEngineRecommendation[], liveData: Pick<PrnLiveData, "metrics" | "lastSync">) {
  if (recommendations.length === 0) {
    return "Insufficient verified GoHighLevel data is available for an executive recommendation.";
  }

  const top = recommendations[0];
  return [
    `EEOS analyzed ${liveData.metrics.totalContacts} contacts and ${liveData.metrics.opportunities} opportunities from verified GoHighLevel data`,
    `${stripTerminalPunctuation(top.observation)}; ${stripTerminalPunctuation(top.recommendation)}`,
    `Top urgency is ${top.urgency} with ${top.confidence}% confidence`,
  ].join(". ").concat(".");
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

export function buildB2BIntelligence(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records" | "location">): B2BIntelligence {
  const opportunities = liveData.records.opportunities;
  const contacts = liveData.records.contacts;
  const confidence = calculateB2BConfidence(liveData);
  const sourcePerformance = buildSourcePerformance(opportunities);
  const highValueOpportunities = buildHighValueOpportunities(opportunities);
  const stalledOpportunities = buildStalledOpportunities(opportunities);
  const referralInsights = buildReferralInsights(opportunities, contacts);
  const territoryInsights = buildTerritoryInsights(opportunities, contacts, liveData.location);
  const recommendedActions = buildB2BActions({
    sourcePerformance,
    highValueOpportunities,
    stalledOpportunities,
    referralInsights,
    territoryInsights,
    opportunities,
  });

  return {
    summary: opportunities.length > 0
      ? `B2B intelligence is based on ${opportunities.length} verified GoHighLevel opportunities and ${contacts.length} contacts.`
      : "Insufficient data.",
    sourcePerformance,
    stalledOpportunities,
    highValueOpportunities,
    referralInsights,
    territoryInsights,
    recommendedActions,
    confidence,
    dataTimestamp: liveData.lastSync,
  };
}

export function calculateB2BConfidence(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records">) {
  const baseConfidence = calculateRecommendationConfidence(liveData);
  const opportunities = liveData.records.opportunities;
  if (opportunities.length === 0) return Math.min(baseConfidence, 40);

  const fieldChecks = [
    opportunities.some(readOpportunitySource),
    opportunities.some((record) => readMoney(record) > 0),
    opportunities.some(readOpportunityDate),
    opportunities.some(readOwner),
    opportunities.some(readPipelineStage),
  ];
  const fieldCompleteness = fieldChecks.filter(Boolean).length / fieldChecks.length;

  return Math.round(baseConfidence * 0.65 + fieldCompleteness * 35);
}

export function buildC2BIntelligence(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records">): C2BIntelligence {
  const contacts = liveData.records.contacts;
  const opportunities = liveData.records.opportunities;
  const confidence = calculateC2BConfidence(liveData);
  const serviceInterest = buildServiceInterest(contacts, opportunities);
  const geographicDemand = buildGeographicDemand(contacts, opportunities);
  const journeyDropOffs = buildJourneyDropOffs(contacts, opportunities);
  const responseTimeInsights = buildResponseTimeInsights(contacts, opportunities);
  const conversionSignals = buildConversionSignals(contacts, opportunities);
  const recommendedActions = buildC2BActions({
    serviceInterest,
    geographicDemand,
    journeyDropOffs,
    responseTimeInsights,
    conversionSignals,
    contacts,
    opportunities,
  });

  return {
    consumerDemandSummary: contacts.length > 0 || opportunities.length > 0
      ? `Consumer activity is based on ${contacts.length} verified GoHighLevel contact records and ${opportunities.length} opportunity records.`
      : "Insufficient data.",
    serviceInterest,
    geographicDemand,
    journeyDropOffs,
    responseTimeInsights,
    conversionSignals,
    recommendedActions,
    confidence,
    dataTimestamp: liveData.lastSync,
  };
}

export function calculateC2BConfidence(liveData: Pick<PrnLiveData, "metrics" | "endpointHealth" | "lastSync" | "records">) {
  const baseConfidence = calculateRecommendationConfidence(liveData);
  const contacts = liveData.records.contacts;
  const opportunities = liveData.records.opportunities;
  if (contacts.length === 0 && opportunities.length === 0) return Math.min(baseConfidence, 35);

  const combined = [...contacts, ...opportunities];
  const fieldChecks = [
    contacts.some(readRecordDate),
    opportunities.some(readRecordDate),
    combined.some(readServiceInterest),
    combined.some(readLocationLabel),
    canMatchContactsToOpportunities(contacts, opportunities),
    combined.some((record) => readTags(record).length > 0),
  ];
  const fieldCompleteness = fieldChecks.filter(Boolean).length / fieldChecks.length;

  return Math.round(baseConfidence * 0.6 + fieldCompleteness * 40);
}

function buildServiceInterest(contacts: GhlRecord[], opportunities: GhlRecord[]): B2BInsight[] {
  const groups = groupByValue([...contacts, ...opportunities], readServiceInterest);
  if (groups.size === 0) {
    return [insufficientInsight("service-interest-insufficient", "Most requested service", "Service interest requires tags, explicit service fields, conversation data, or pipeline data.")];
  }

  return Array.from(groups.entries())
    .map(([service, records]) => ({
      id: `service-${slugify(service)}`,
      label: service,
      observation: `Fact: ${service} appears on ${records.length} verified GoHighLevel record${records.length === 1 ? "" : "s"}.`,
      evidence: [
        b2bEvidence("Service interest", service, records),
        b2bEvidence("Supporting record count", records.length, records),
      ],
    }))
    .sort((a, b) => numericEvidenceValue(b, "Supporting record count") - numericEvidenceValue(a, "Supporting record count"))
    .slice(0, 5);
}

function buildGeographicDemand(contacts: GhlRecord[], opportunities: GhlRecord[]): B2BInsight[] {
  const groups = groupByValue([...contacts, ...opportunities], readLocationLabel);
  const sufficientGroups = Array.from(groups.entries()).filter(([, records]) => records.length >= 2);
  if (sufficientGroups.length === 0) {
    return [insufficientInsight("geographic-demand-insufficient", "Highest-demand location", "At least two records with city or ZIP data are required before identifying geographic demand.")];
  }

  return sufficientGroups
    .map(([location, records]) => ({
      id: `consumer-location-${slugify(location)}`,
      label: location,
      observation: `Fact: ${records.length} verified GoHighLevel record${records.length === 1 ? "" : "s"} include city or ZIP data for ${location}.`,
      evidence: [
        b2bEvidence("City or ZIP", location, records),
        b2bEvidence("Record count", records.length, records),
      ],
    }))
    .sort((a, b) => numericEvidenceValue(b, "Record count") - numericEvidenceValue(a, "Record count"))
    .slice(0, 5);
}

function buildJourneyDropOffs(contacts: GhlRecord[], opportunities: GhlRecord[]): B2BInsight[] {
  if (!canMatchContactsToOpportunities(contacts, opportunities)) {
    return [insufficientInsight("journey-dropoffs-insufficient", "Customer journey drop-offs", "Contact-to-opportunity matching requires contact IDs on both contact and opportunity records.")];
  }

  const opportunityContactIds = new Set(opportunities.map(readContactId).filter(Boolean));
  const dropOffs = contacts.filter((contact) => {
    const contactId = readContactId(contact);
    return contactId && !opportunityContactIds.has(contactId);
  });
  const lostOrStalled = opportunities.filter((record) => isLostOpportunity(record) || (!isClosedOpportunity(record) && (calculateOpportunityAgeDays(record) || 0) >= 30));

  return [{
    id: "journey-contact-opportunity-dropoff",
    label: "Customer journey drop-offs",
    observation: `Fact: ${dropOffs.length} contact record${dropOffs.length === 1 ? "" : "s"} do not have a matched opportunity, and ${lostOrStalled.length} opportunit${lostOrStalled.length === 1 ? "y is" : "ies are"} lost or stalled based on available fields.`,
    evidence: [
      b2bEvidence("Contacts without matched opportunity", dropOffs.length, dropOffs),
      b2bEvidence("Lost or stalled opportunities", lostOrStalled.length, lostOrStalled),
    ],
  }];
}

function buildResponseTimeInsights(contacts: GhlRecord[], opportunities: GhlRecord[]): B2BInsight[] {
  const pairs = matchContactOpportunityPairs(contacts, opportunities)
    .map(({ contact, opportunity }) => {
      const contactDate = readRecordDate(contact);
      const opportunityDate = readRecordDate(opportunity);
      if (!contactDate || !opportunityDate) return null;
      return {
        contact,
        opportunity,
        hours: Math.max(0, Math.round((opportunityDate.getTime() - contactDate.getTime()) / 3_600_000)),
      };
    })
    .filter((item): item is { contact: GhlRecord; opportunity: GhlRecord; hours: number } => Boolean(item));

  if (pairs.length === 0) {
    return [insufficientInsight("response-time-insufficient", "Inquiry-to-opportunity movement", "Time from contact creation to opportunity creation requires matching contact IDs and creation timestamps.")];
  }

  const averageHours = Math.round(pairs.reduce((sum, pair) => sum + pair.hours, 0) / pairs.length);
  return [{
    id: "response-contact-to-opportunity-time",
    label: "Inquiry-to-opportunity movement",
    observation: `Fact: matched records show an average of ${averageHours} hours from contact creation to opportunity creation.`,
    evidence: [
      b2bEvidence("Matched contact-opportunity pairs", pairs.length, pairs.map((pair) => pair.opportunity)),
      b2bEvidence("Average creation-to-opportunity time", `${averageHours} hours`, pairs.map((pair) => pair.opportunity)),
    ],
  }];
}

function buildConversionSignals(contacts: GhlRecord[], opportunities: GhlRecord[]): B2BInsight[] {
  if (!canMatchContactsToOpportunities(contacts, opportunities)) {
    return [insufficientInsight("conversion-insufficient", "Inquiry-to-opportunity movement", "Conversion calculation requires verified contact denominator and matched opportunity numerator.")];
  }

  const matchedContactIds = new Set(matchContactOpportunityPairs(contacts, opportunities).map(({ contact }) => readContactId(contact)).filter(Boolean));
  const denominator = contacts.filter(readContactId).length;
  const numerator = matchedContactIds.size;
  const rate = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

  return [{
    id: "conversion-contact-to-opportunity",
    label: "Inquiry-to-opportunity movement",
    observation: `Fact: ${numerator} of ${denominator} contacts have matched opportunity records (${rate}%).`,
    evidence: [
      b2bEvidence("Matched opportunity numerator", numerator),
      b2bEvidence("Verified contact denominator", denominator),
      b2bEvidence("Calculated movement rate", `${rate}%`),
    ],
  }];
}

function buildC2BActions(input: {
  serviceInterest: B2BInsight[];
  geographicDemand: B2BInsight[];
  journeyDropOffs: B2BInsight[];
  responseTimeInsights: B2BInsight[];
  conversionSignals: B2BInsight[];
  contacts: GhlRecord[];
  opportunities: GhlRecord[];
}) {
  const actions: B2BInsight[] = [];
  const service = input.serviceInterest.find((item) => !item.observation.startsWith("Insufficient data"));
  const dropOff = input.journeyDropOffs.find((item) => !item.observation.startsWith("Insufficient data"));

  if (dropOff) {
    actions.push({
      id: "action-review-consumer-dropoffs",
      label: "Recommended customer-experience action",
      observation: "Recommendation: review contacts without matched opportunities and lost or stalled inquiries before making demand claims.",
      evidence: dropOff.evidence,
    });
  } else if (service) {
    actions.push({
      id: "action-review-service-interest",
      label: "Recommended customer-experience action",
      observation: `Recommendation: review follow-up quality for ${service.label}, the most supported service-interest signal in current GoHighLevel data.`,
      evidence: service.evidence,
    });
  } else {
    actions.push(insufficientInsight("action-c2b-data-needed", "Recommended customer-experience action", "Insufficient data: add service interest, contact source, and contact-to-opportunity links before choosing a customer-experience action."));
  }

  actions.push({
    id: "action-c2b-data-completeness",
    label: "Data completeness",
    observation: "Fact: appointment and conversation activity are not available in the current verified PRN GoHighLevel dashboard payload.",
    evidence: [
      b2bEvidence("Appointment activity", "Insufficient data"),
      b2bEvidence("Conversation activity", "Insufficient data"),
    ],
  });

  return actions;
}


function buildSourcePerformance(opportunities: GhlRecord[]): B2BInsight[] {
  const groups = groupByValue(opportunities, readOpportunitySource);
  if (groups.size === 0) {
    return [insufficientInsight("source-performance-insufficient", "Best-performing lead source", "Opportunity source data is unavailable.")];
  }

  return Array.from(groups.entries())
    .map(([source, records]) => {
      const value = records.reduce((sum, record) => sum + readMoney(record), 0);
      return {
        id: `source-${slugify(source)}`,
        label: source,
        observation: `Fact: ${source} is tied to ${records.length} opportunity record${records.length === 1 ? "" : "s"} and ${formatUsd(value)} in verified opportunity value.`,
        evidence: [
          b2bEvidence("Opportunity source", source, records),
          b2bEvidence("Opportunity count", records.length, records),
          b2bEvidence("Verified opportunity value", value > 0 ? formatUsd(value) : "Insufficient data", records),
        ],
      };
    })
    .sort((a, b) => numericEvidenceValue(b, "Opportunity count") - numericEvidenceValue(a, "Opportunity count"));
}

function buildHighValueOpportunities(opportunities: GhlRecord[]): B2BInsight[] {
  const valued = opportunities
    .map((record) => ({ record, value: readMoney(record), id: readRecordId(record) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (valued.length === 0) {
    return [insufficientInsight("high-value-insufficient", "Highest-value opportunity source", "Verified opportunity value data is unavailable.")];
  }

  return valued.map(({ record, value, id }) => {
    const source = readOpportunitySource(record) || "Insufficient data";
    return {
      id: `high-value-${id}`,
      label: readString(record.name) || readString(record.title) || `Opportunity ${id}`,
      observation: `Fact: this opportunity has ${formatUsd(value)} in verified value. Source: ${source}.`,
      evidence: [
        b2bEvidence("Opportunity value", formatUsd(value), [record]),
        b2bEvidence("Opportunity source", source, [record]),
        b2bEvidence("Pipeline stage", readPipelineStage(record) || "Insufficient data", [record]),
      ],
    };
  });
}

function buildStalledOpportunities(opportunities: GhlRecord[]): B2BInsight[] {
  const aged = opportunities
    .filter((record) => !isClosedOpportunity(record))
    .map((record) => ({ record, age: calculateOpportunityAgeDays(record), id: readRecordId(record) }))
    .filter((item): item is { record: GhlRecord; age: number; id: string } => typeof item.age === "number" && item.age >= 30)
    .sort((a, b) => b.age - a.age)
    .slice(0, 5);

  if (aged.length === 0) {
    return [insufficientInsight("stalled-insufficient", "Stalled B2B opportunities", "Opportunity age data is unavailable or no open opportunity is at least 30 days old.")];
  }

  return aged.map(({ record, age, id }) => ({
    id: `stalled-${id}`,
    label: readString(record.name) || readString(record.title) || `Opportunity ${id}`,
    observation: `Fact: this open opportunity is ${age} days old based on available GoHighLevel date fields.`,
    evidence: [
      b2bEvidence("Opportunity age", `${age} days`, [record]),
      b2bEvidence("Assigned owner", readOwner(record) || "Insufficient data", [record]),
      b2bEvidence("Pipeline stage", readPipelineStage(record) || "Insufficient data", [record]),
    ],
  }));
}

function buildReferralInsights(opportunities: GhlRecord[], contacts: GhlRecord[]): B2BInsight[] {
  const referralOpportunities = opportunities.filter((record) => containsReferralSignal(readOpportunitySource(record)) || containsReferralSignal(readTags(record).join(" ")));
  const referralContacts = contacts.filter((record) => containsReferralSignal(readTags(record).join(" ")) || containsReferralSignal(readString(record.source)));

  if (referralOpportunities.length === 0 && referralContacts.length === 0) {
    return [insufficientInsight("referral-insufficient", "Referral pipeline health", "Referral source or referral tag data is unavailable.")];
  }

  const referralValue = referralOpportunities.reduce((sum, record) => sum + readMoney(record), 0);
  return [{
    id: "referral-pipeline-health",
    label: "Referral pipeline health",
    observation: referralOpportunities.length > 0
      ? `Fact: referral-labeled data appears on ${referralOpportunities.length} opportunity record${referralOpportunities.length === 1 ? "" : "s"}.`
      : `Fact: referral-labeled data appears on ${referralContacts.length} contact record${referralContacts.length === 1 ? "" : "s"}, but not on opportunity records.`,
    evidence: [
      b2bEvidence("Referral opportunity count", referralOpportunities.length, referralOpportunities),
      b2bEvidence("Referral contact count", referralContacts.length, referralContacts),
      b2bEvidence("Verified referral opportunity value", referralValue > 0 ? formatUsd(referralValue) : "Insufficient data", referralOpportunities),
    ],
  }];
}

function buildTerritoryInsights(opportunities: GhlRecord[], contacts: GhlRecord[], location: PrnLiveData["location"]): B2BInsight[] {
  const locationGroups = groupByValue([...opportunities, ...contacts], readLocationLabel);
  if (locationGroups.size === 0) {
    return [insufficientInsight("territory-insufficient", "Territory insights", "Contact or opportunity territory data is unavailable.")];
  }

  return Array.from(locationGroups.entries())
    .map(([territory, records]) => ({
      id: `territory-${slugify(territory)}`,
      label: territory,
      observation: `Fact: ${records.length} GoHighLevel record${records.length === 1 ? "" : "s"} include location data for ${territory}.`,
      evidence: [
        b2bEvidence("Territory", territory, records),
        b2bEvidence("Record count", records.length, records),
        b2bEvidence("Connected location", [location.name, location.city, location.state].filter(Boolean).join(", ") || "Insufficient data"),
      ],
    }))
    .sort((a, b) => numericEvidenceValue(b, "Record count") - numericEvidenceValue(a, "Record count"))
    .slice(0, 5);
}

function buildB2BActions(input: {
  sourcePerformance: B2BInsight[];
  highValueOpportunities: B2BInsight[];
  stalledOpportunities: B2BInsight[];
  referralInsights: B2BInsight[];
  territoryInsights: B2BInsight[];
  opportunities: GhlRecord[];
}) {
  const actions: B2BInsight[] = [];
  const ownershipGaps = input.opportunities.filter((record) => !isClosedOpportunity(record) && !readOwner(record));

  if (ownershipGaps.length > 0) {
    actions.push({
      id: "action-assign-open-opportunity-owners",
      label: "Ownership gaps",
      observation: `Fact: ${ownershipGaps.length} open opportunit${ownershipGaps.length === 1 ? "y has" : "ies have"} insufficient owner data.`,
      evidence: [
        b2bEvidence("Open opportunities without owner", ownershipGaps.length, ownershipGaps),
      ],
    });
  }

  const bestSource = input.sourcePerformance.find((item) => !item.id.endsWith("insufficient"));
  if (bestSource) {
    actions.push({
      id: "action-review-best-source-follow-up",
      label: "Recommended next business-development action",
      observation: `Recommendation: review follow-up coverage for ${bestSource.label}, the best-supported source in current GoHighLevel opportunity data.`,
      evidence: bestSource.evidence,
    });
  } else {
    actions.push(insufficientInsight("action-source-data-needed", "Recommended next business-development action", "Insufficient data: add source values to opportunities before choosing a source-based action."));
  }

  return actions;
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

function calculateOpportunityAgeDays(record: GhlRecord) {
  const date = readOpportunityDate(record);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function readOpportunitySource(record: GhlRecord) {
  for (const key of ["source", "contactSource", "opportunitySource", "leadSource", "attributionSource", "sourceName"]) {
    const value = readString(record[key]);
    if (value) return value;
  }

  const attribution = record.attributionSource || record.attribution;
  if (isRecord(attribution)) {
    for (const key of ["source", "utmSource", "medium", "campaign"]) {
      const value = readString(attribution[key]);
      if (value) return value;
    }
  }

  return "";
}

function readOwner(record: GhlRecord) {
  for (const key of ["assignedTo", "assignedUserId", "ownerId", "userId", "assignedToName", "ownerName"]) {
    const value = readString(record[key]);
    if (value) return value;
  }

  const owner = record.owner || record.assignedUser || record.user;
  if (isRecord(owner)) {
    return readString(owner.name) || readString(owner.id) || readString(owner.email);
  }

  return "";
}

function readPipelineStage(record: GhlRecord) {
  for (const key of ["pipelineStageName", "stageName", "status", "pipelineStageId", "stageId"]) {
    const value = readString(record[key]);
    if (value) return value;
  }
  return "";
}

function readTags(record: GhlRecord) {
  const tags = record.tags;
  if (Array.isArray(tags)) {
    return tags.map((tag) => {
      if (typeof tag === "string") return tag;
      if (isRecord(tag)) return readString(tag.name) || readString(tag.id);
      return "";
    }).filter(Boolean);
  }
  return [];
}

function readLocationLabel(record: GhlRecord) {
  const city = readString(record.city) || readString(record.contactCity);
  const state = readString(record.state) || readString(record.contactState);
  const postalCode = readString(record.postalCode) || readString(record.zip) || readString(record.contactPostalCode);
  const location = [city, state].filter(Boolean).join(", ");
  return location || postalCode;
}

function readServiceInterest(record: GhlRecord) {
  for (const key of ["serviceInterest", "service", "services", "interest", "primaryService", "requestedService"]) {
    const value = readString(record[key]);
    if (value) return value;
  }

  const tag = readTags(record).find((value) => /\b(care|staff|nurs|service|home|medical|cna|rn|lpn|therapy)\b/i.test(value));
  if (tag) return tag;

  return readPipelineStage(record);
}

function readContactId(record: GhlRecord) {
  return readString(record.contactId) || readString(record.contact_id) || readString(record.id);
}

function readRecordDate(record: GhlRecord) {
  for (const key of ["createdAt", "dateAdded", "dateCreated", "created_at", "updatedAt"]) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function canMatchContactsToOpportunities(contacts: GhlRecord[], opportunities: GhlRecord[]) {
  const contactIds = new Set(contacts.map(readContactId).filter(Boolean));
  return contactIds.size > 0 && opportunities.some((opportunity) => contactIds.has(readContactId(opportunity)));
}

function matchContactOpportunityPairs(contacts: GhlRecord[], opportunities: GhlRecord[]) {
  const contactsById = new Map<string, GhlRecord>();
  for (const contact of contacts) {
    const contactId = readContactId(contact);
    if (contactId) contactsById.set(contactId, contact);
  }
  return opportunities
    .map((opportunity) => {
      const contact = contactsById.get(readContactId(opportunity));
      return contact ? { contact, opportunity } : null;
    })
    .filter((item): item is { contact: GhlRecord; opportunity: GhlRecord } => Boolean(item));
}

function readRecordId(record: GhlRecord) {
  return readString(record.id) || readString(record.contactId) || readString(record.opportunityId) || slugify(JSON.stringify(record).slice(0, 48));
}

function groupByValue(records: GhlRecord[], readValue: (record: GhlRecord) => string) {
  const groups = new Map<string, GhlRecord[]>();
  for (const record of records) {
    const value = readValue(record);
    if (!value) continue;
    const existing = groups.get(value) || [];
    existing.push(record);
    groups.set(value, existing);
  }
  return groups;
}

function containsReferralSignal(value: string) {
  return /\b(referral|referred|partner|word of mouth)\b/i.test(value);
}

function b2bEvidence(metric: string, value: string | number, records: GhlRecord[] = []): B2BEvidence[number] {
  return {
    metric,
    value: String(value),
    source: "GoHighLevel",
    recordIds: records.map(readRecordId).filter(Boolean).slice(0, 10),
  };
}

function insufficientInsight(id: string, label: string, observation: string): B2BInsight {
  return {
    id,
    label,
    observation: `Insufficient data: ${observation}`,
    evidence: [b2bEvidence("Available evidence", "Insufficient data")],
  };
}

function numericEvidenceValue(insight: B2BInsight, metric: string) {
  const value = insight.evidence.find((item) => item.metric === metric)?.value || "0";
  return Number(value.replace(/[$,]/g, "")) || 0;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
}

function stripTerminalPunctuation(value: string) {
  return value.replace(/[.!?]+$/g, "");
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function isLostOpportunity(record: GhlRecord) {
  const status = `${readString(record.status) || readString(record.pipelineStageName) || readString(record.stageName) || ""}`.toLowerCase();
  return status.includes("lost");
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is GhlRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
