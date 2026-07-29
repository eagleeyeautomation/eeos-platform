import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildSnapshotRequest,
  loadCertifiedOwnerContext,
  requestCertifiedSnapshot,
  SouthCarolinaSnapshotView,
  type SouthCarolinaSnapshot,
  validateCertifiedContext,
  validateSnapshot,
} from "./SouthCarolinaOperations";

const context = {
  organizationId: "1",
  organizationName: "PRN Staffers Inc.",
  locationId: "rJH8XytyAfEQSoOTQeuZ",
  locationName: "PRN Staffers CSC",
  role: "ORGANIZATION_OWNER",
  csrfToken: "csrf-test-only",
};

const snapshot: SouthCarolinaSnapshot = {
  organizationId: "1",
  organizationName: "PRN Staffers Inc.",
  location: { name: "PRN Staffers CSC", maskedProviderLocationId: "rJH8…QeuZ" },
  provider: "gohighlevel",
  connection: { connected: true, healthy: true },
  contacts: { total: 89, createdLast7Days: 12, createdLast30Days: 36 },
  opportunities: {
    openTotal: 74,
    createdLast7Days: 12,
    createdLast30Days: 36,
    byStage: [
      {
        pipelineIdentifier: "pipeline_safe",
        pipelineName: "Home Care Inquiries",
        stageIdentifier: "stage_safe",
        stageName: "New Lead",
        count: 71,
      },
      {
        pipelineIdentifier: "pipeline_safe",
        pipelineName: "Home Care Inquiries",
        stageIdentifier: "stage_future",
        stageName: "Future Safe Stage",
        count: 3,
      },
    ],
  },
  generatedAt: "2026-07-29T12:00:00.000Z",
  partial: false,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("South Carolina Executive Dashboard operations view", () => {
  it("uses only the protected certified snapshot route with POST, CSRF, and no-store", () => {
    const request = buildSnapshotRequest(context);
    expect(request.url).toBe(
      "/api/ghl/operations-snapshot?organizationId=1&locationId=rJH8XytyAfEQSoOTQeuZ",
    );
    expect(request.init).toMatchObject({
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-eeos-csrf-token": "csrf-test-only",
      },
    });
    expect(request.url).not.toMatch(/leadconnectorhq|gohighlevel\.com/i);
  });

  it("loads the active owner context from the authenticated server session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      user: { role: "ORGANIZATION_OWNER" },
      organization: { id: "1", name: "PRN Staffers Inc." },
      location: { id: "rJH8XytyAfEQSoOTQeuZ", name: "PRN Staffers CSC" },
      csrfToken: "csrf-test-only",
    }));
    await expect(loadCertifiedOwnerContext(fetchMock as typeof fetch)).resolves.toEqual(context);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/gohighlevel/session-context",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("rejects unauthenticated, unauthorized, cross-organization, and wrong-location contexts", async () => {
    await expect(loadCertifiedOwnerContext(
      vi.fn().mockResolvedValue(jsonResponse({}, 401)) as typeof fetch,
    )).rejects.toThrow("Authentication");
    expect(() => validateCertifiedContext({ ...context, role: "STAFF" })).toThrow("Permission denied");
    expect(() => validateCertifiedContext({ ...context, organizationId: "2" })).toThrow("certified organization");
    expect(() => validateCertifiedContext({ ...context, locationId: "loc_other" })).toThrow("South Carolina");
  });

  it("rejects a wrong provider or cross-location snapshot response", () => {
    expect(() => validateSnapshot({ ...snapshot, provider: "other" as "gohighlevel" })).toThrow("provider binding");
    expect(() => validateSnapshot({
      ...snapshot,
      location: { ...snapshot.location, maskedProviderLocationId: "other" },
    })).toThrow("provider binding");
  });

  it("requests and returns the certified aggregate snapshot without provider writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(snapshot));
    await expect(requestCertifiedSnapshot(context, fetchMock as typeof fetch)).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/PUT|PATCH|DELETE|sync/i);
  });

  it("renders every certified metric, dynamic stages, timestamp, and Complete status", () => {
    const html = renderToStaticMarkup(createElement(SouthCarolinaSnapshotView, { snapshot }));
    for (const text of [
      "Connection Health",
      "Total Contacts",
      "New Contacts — 7 Days",
      "New Contacts — 30 Days",
      "Open Opportunities",
      "New Opportunities — 7 Days",
      "New Opportunities — 30 Days",
      "Pipeline Stage Distribution",
      "Home Care Inquiries · New Lead",
      "Home Care Inquiries · Future Safe Stage",
      "Complete",
      "PRN Staffers CSC",
      "GoHighLevel",
      "89",
      "74",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("renders Partial result without personal data, tokens, or a full provider location ID", () => {
    const html = renderToStaticMarkup(createElement(SouthCarolinaSnapshotView, {
      snapshot: { ...snapshot, partial: true },
    }));
    expect(html).toContain("Partial result");
    expect(html).not.toContain("rJH8XytyAfEQSoOTQeuZ");
    expect(html).not.toMatch(/accessToken|refreshToken|clientSecret|phone|email/i);
  });

  it("does not render false zero values when the provider fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "provider_unavailable" }, 503));
    await expect(requestCertifiedSnapshot(context, fetchMock as typeof fetch)).rejects.toThrow(
      "Provider unavailable",
    );
  });
});
