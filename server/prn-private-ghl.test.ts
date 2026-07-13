import { describe, expect, it } from "vitest";
import { buildExecutiveRecommendations, calculateRecommendationConfidence, isStale } from "./prn-private-ghl";

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
