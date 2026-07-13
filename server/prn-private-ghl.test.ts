import { describe, expect, it } from "vitest";
import { buildB2BIntelligence, buildC2BIntelligence, buildExecutiveRecommendations, calculateB2BConfidence, calculateC2BConfidence, calculateRecommendationConfidence, isStale } from "./prn-private-ghl";

function liveData(overrides: Record<string, unknown> = {}) {
  const lastSync = new Date().toISOString();
  return {
    metrics: {
      totalContacts: 69,
      users: 3,
      opportunities: 54,
      openOpportunities: 54,
      pipelineValue: 13400,
      healthScore: 100,
    },
    endpointHealth: {
      location: { ok: true, status: 200, path: "/locations/location-id", responseTimeMs: 10 },
      users: { ok: true, status: 200, path: "/users/", responseTimeMs: 10 },
      contacts: { ok: true, status: 200, path: "/contacts/", responseTimeMs: 10 },
      opportunities: { ok: true, status: 200, path: "/opportunities/search", responseTimeMs: 10 },
    },
    lastSync,
    records: {
      contacts: Array.from({ length: 69 }, (_, index) => ({ id: `contact-${index}` })),
      users: Array.from({ length: 3 }, (_, index) => ({ id: `user-${index}` })),
      opportunities: Array.from({ length: 54 }, (_, index) => ({
        id: `opportunity-${index}`,
        status: "open",
        monetaryValue: index === 0 ? 13400 : 0,
        createdAt: "2026-07-01T00:00:00.000Z",
      })),
    },
    ...overrides,
  };
}

describe("PRN executive recommendations", () => {
  it("generates explainable recommendations from verified live data", () => {
    const recommendations = buildExecutiveRecommendations(liveData());

    expect(recommendations.some((item) => item.id === "sales-high-open-opportunity-volume")).toBe(true);
    expect(recommendations.some((item) => item.id === "revenue-strong-pipeline-value")).toBe(true);
    expect(recommendations.every((item) => item.evidence.every((entry) => entry.source === "GoHighLevel"))).toBe(true);
    expect(recommendations.every((item) => item.measurement.length > 0)).toBe(true);
  });

  it("marks missing growth data as insufficient data", () => {
    const recommendations = buildExecutiveRecommendations(liveData());
    const contactRecommendation = recommendations.find((item) => item.id === "sales-contact-to-opportunity-coverage");

    expect(contactRecommendation?.evidence).toContainEqual({
      metric: "Growth rate",
      value: "Insufficient data",
      source: "GoHighLevel",
    });
  });

  it("flags stale data older than 15 minutes", () => {
    const staleTimestamp = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    const recommendations = buildExecutiveRecommendations(liveData({ lastSync: staleTimestamp }));

    expect(isStale(staleTimestamp)).toBe(true);
    expect(recommendations[0]?.id).toBe("risk-stale-live-data");
  });

  it("creates a risk recommendation when a required endpoint is unhealthy", () => {
    const data = liveData({
      endpointHealth: {
        location: { ok: true, status: 200, path: "/locations/location-id", responseTimeMs: 10 },
        users: { ok: false, status: 401, path: "/users/", responseTimeMs: 10 },
        contacts: { ok: true, status: 200, path: "/contacts/", responseTimeMs: 10 },
        opportunities: { ok: true, status: 200, path: "/opportunities/search", responseTimeMs: 10 },
      },
    });
    const recommendations = buildExecutiveRecommendations(data);

    expect(recommendations.some((item) => item.id === "risk-unhealthy-ghl-endpoints")).toBe(true);
  });

  it("calculates confidence from endpoint health, completeness, and freshness", () => {
    expect(calculateRecommendationConfidence(liveData())).toBe(100);

    const partial = liveData({
      endpointHealth: {
        location: { ok: true, status: 200, path: "/locations/location-id", responseTimeMs: 10 },
        users: { ok: false, status: 401, path: "/users/", responseTimeMs: 10 },
        contacts: { ok: true, status: 200, path: "/contacts/", responseTimeMs: 10 },
        opportunities: { ok: true, status: 200, path: "/opportunities/search", responseTimeMs: 10 },
      },
    });

    expect(calculateRecommendationConfidence(partial)).toBeLessThan(100);
  });

  it("does not fabricate financial projections without historical conversion data", () => {
    const recommendations = buildExecutiveRecommendations(liveData());
    const revenueRecommendation = recommendations.find((item) => item.id === "revenue-strong-pipeline-value");

    expect(revenueRecommendation?.expectedImpact).toContain("Insufficient data");
    expect(revenueRecommendation?.expectedImpact).not.toMatch(/\$\d|%|percent/i);
  });
});

describe("PRN B2B intelligence", () => {
  it("aggregates opportunity sources with supporting evidence", () => {
    const intelligence = buildB2BIntelligence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [
          { id: "opp-1", source: "Referral", monetaryValue: 5000, createdAt: new Date().toISOString(), status: "open" },
          { id: "opp-2", source: "Referral", monetaryValue: 2500, createdAt: new Date().toISOString(), status: "open" },
          { id: "opp-3", source: "Website", monetaryValue: 1000, createdAt: new Date().toISOString(), status: "open" },
        ],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(intelligence.sourcePerformance[0]?.label).toBe("Referral");
    expect(intelligence.sourcePerformance[0]?.evidence.some((item) => item.metric === "Opportunity count" && item.value === "2")).toBe(true);
  });

  it("identifies opportunity aging from available date fields", () => {
    const oldDate = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const intelligence = buildB2BIntelligence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [{ id: "opp-old", source: "Referral", monetaryValue: 5000, createdAt: oldDate, status: "open" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(intelligence.stalledOpportunities[0]?.id).toBe("stalled-opp-old");
    expect(intelligence.stalledOpportunities[0]?.evidence.some((item) => item.value.includes("days"))).toBe(true);
  });

  it("marks missing source data as insufficient data", () => {
    const intelligence = buildB2BIntelligence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [{ id: "opp-1", monetaryValue: 5000, createdAt: new Date().toISOString(), status: "open" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(intelligence.sourcePerformance[0]?.observation).toContain("Insufficient data");
  });

  it("marks missing value data as insufficient data", () => {
    const intelligence = buildB2BIntelligence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [{ id: "opp-1", source: "Referral", createdAt: new Date().toISOString(), status: "open" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(intelligence.highValueOpportunities[0]?.observation).toContain("Insufficient data");
  });

  it("does not fabricate territory claims without location data", () => {
    const intelligence = buildB2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1", tags: ["Referral"] }],
        users: [],
        opportunities: [{ id: "opp-1", source: "Referral", monetaryValue: 5000, createdAt: new Date().toISOString(), status: "open" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(intelligence.territoryInsights[0]?.observation).toContain("Insufficient data");
  });

  it("calculates B2B confidence from endpoint health and field completeness", () => {
    const complete = calculateB2BConfidence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [{ id: "opp-1", source: "Referral", monetaryValue: 5000, createdAt: new Date().toISOString(), status: "open", assignedTo: "owner-1", pipelineStageName: "New" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));
    const incomplete = calculateB2BConfidence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [{ id: "opp-1", status: "open" }],
      },
      location: { id: "loc-1", name: "PRN Staffers CSC", city: "Beaufort", state: "SC" },
    }));

    expect(complete).toBeGreaterThan(incomplete);
  });
});

describe("PRN C2B intelligence", () => {
  it("aggregates consumer activity from contacts and opportunities", () => {
    const intelligence = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1", createdAt: new Date().toISOString(), tags: ["Home Care"], city: "Beaufort" }],
        users: [],
        opportunities: [{ id: "opp-1", contactId: "contact-1", createdAt: new Date().toISOString(), status: "open", serviceInterest: "Home Care" }],
      },
    }));

    expect(intelligence.consumerDemandSummary).toContain("1 verified GoHighLevel contact");
    expect(intelligence.serviceInterest[0]?.label).toBe("Home Care");
  });

  it("requires sufficient city or ZIP data before claiming geographic demand", () => {
    const insufficient = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1", city: "Beaufort" }],
        users: [],
        opportunities: [],
      },
    }));
    const sufficient = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1", city: "Beaufort" }, { id: "contact-2", city: "Beaufort" }],
        users: [],
        opportunities: [],
      },
    }));

    expect(insufficient.geographicDemand[0]?.observation).toContain("Insufficient data");
    expect(sufficient.geographicDemand[0]?.label).toBe("Beaufort");
  });

  it("uses tags or explicit fields as service-interest evidence", () => {
    const intelligence = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1", tags: ["Nursing Service"] }],
        users: [],
        opportunities: [{ id: "opp-1", serviceInterest: "Nursing Service" }],
      },
    }));

    expect(intelligence.serviceInterest[0]?.evidence.some((item) => item.metric === "Service interest")).toBe(true);
  });

  it("calculates conversion only with verified numerator and denominator", () => {
    const intelligence = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1" }, { id: "contact-2" }],
        users: [],
        opportunities: [{ id: "opp-1", contactId: "contact-1" }],
      },
    }));

    expect(intelligence.conversionSignals[0]?.observation).toContain("1 of 2 contacts");
    expect(intelligence.conversionSignals[0]?.evidence).toContainEqual({
      metric: "Calculated movement rate",
      value: "50%",
      source: "GoHighLevel",
      recordIds: [],
    });
  });

  it("handles missing contact-to-opportunity data as insufficient data", () => {
    const intelligence = buildC2BIntelligence(liveData({
      records: {
        contacts: [{ id: "contact-1" }],
        users: [],
        opportunities: [{ id: "opp-1" }],
      },
    }));

    expect(intelligence.conversionSignals[0]?.observation).toContain("Insufficient data");
    expect(intelligence.responseTimeInsights[0]?.observation).toContain("Insufficient data");
  });

  it("does not fabricate demand signals without consumer activity", () => {
    const intelligence = buildC2BIntelligence(liveData({
      records: {
        contacts: [],
        users: [],
        opportunities: [],
      },
    }));

    expect(intelligence.consumerDemandSummary).toBe("Insufficient data.");
    expect(intelligence.serviceInterest[0]?.observation).toContain("Insufficient data");
  });

  it("calculates C2B confidence from endpoint health and field completeness", () => {
    const complete = calculateC2BConfidence(liveData({
      records: {
        contacts: [{ id: "contact-1", createdAt: new Date().toISOString(), tags: ["Home Care"], city: "Beaufort" }],
        users: [],
        opportunities: [{ id: "opp-1", contactId: "contact-1", createdAt: new Date().toISOString(), serviceInterest: "Home Care" }],
      },
    }));
    const incomplete = calculateC2BConfidence(liveData({
      records: {
        contacts: [{ id: "contact-1" }],
        users: [],
        opportunities: [],
      },
    }));

    expect(complete).toBeGreaterThan(incomplete);
  });
});
