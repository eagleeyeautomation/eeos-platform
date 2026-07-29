import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildSnapshotRequest,
  buildLatestSnapshotRequest,
  isCurrentHydrationRequest,
  loadLatestStoredSnapshot,
  loadSelectedOwnerContext,
  requestCertifiedSnapshot,
  LocationSnapshotView,
  type LocationOperationsSnapshot,
  validateSnapshotBinding,
} from "./LocationOperations";
import type { ManagedLocation } from "@/lib/location-management";

const context = {
  organizationId: "1",
  organizationName: "PRN Staffers Inc.",
  locationId: "rJH8XytyAfEQSoOTQeuZ",
  locationName: "PRN Staffers CSC",
  provider: "gohighlevel",
  role: "ORGANIZATION_OWNER",
  csrfToken: "csrf-test-only",
};

const selected: ManagedLocation = {
  organization: { id: "1", name: "PRN Staffers Inc." },
  provider: "gohighlevel",
  location: { id: "rJH8XytyAfEQSoOTQeuZ", name: "PRN Staffers CSC", city: "Beaufort", state: "South Carolina" },
  connection: { connected: true, lastVerifiedAt: null },
  snapshot: { status: "complete", generatedAt: "2026-07-29T12:00:00.000Z" },
};

const snapshot: LocationOperationsSnapshot = {
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

describe("multi-location Executive Dashboard operations view", () => {
  it("uses only the protected certified snapshot route with POST, CSRF, and no-store", () => {
    const request = buildSnapshotRequest(context);
    expect(request.url).toBe(
      "/api/ghl/operations-snapshot?organizationId=1&locationId=rJH8XytyAfEQSoOTQeuZ&provider=gohighlevel",
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

  it("hydrates through the authenticated stored-snapshot GET without provider or POST access", async () => {
    const request = buildLatestSnapshotRequest(context);
    expect(request).toEqual({
      url: "/api/ghl/operations-snapshot/latest?locationId=rJH8XytyAfEQSoOTQeuZ&provider=gohighlevel",
      init: {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: "available", snapshot }));
    await expect(loadLatestStoredSnapshot(context, fetchMock as typeof fetch)).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(
      /leadconnectorhq|marketplace\\.gohighlevel|POST|accessToken|refreshToken/i,
    );
  });

  it("returns a safe empty state instead of zero metrics when no completed snapshot exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      status: "not_available",
      message: "No completed snapshot available",
    }));
    await expect(loadLatestStoredSnapshot(context, fetchMock as typeof fetch)).resolves.toBeNull();
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/POST|leadconnectorhq|marketplace\\.gohighlevel/i);
  });

  it("rejects mismatched stored snapshots and preserves partial display semantics", async () => {
    const wrongOrganization = vi.fn().mockResolvedValue(jsonResponse({
      status: "available",
      snapshot: { ...snapshot, organizationId: "2" },
    }));
    await expect(loadLatestStoredSnapshot(context, wrongOrganization as typeof fetch))
      .rejects.toThrow("selected organization");
    const partial = { ...snapshot, partial: true };
    const html = renderToStaticMarkup(createElement(LocationSnapshotView, { snapshot: partial }));
    expect(html).toContain("Partial result");
    expect(html).not.toContain(context.locationId);
  });

  it("prevents stale location hydration responses from replacing the current selection", () => {
    const southCarolinaRequest = 1;
    const delawareRequest = 2;
    expect(isCurrentHydrationRequest(southCarolinaRequest, delawareRequest)).toBe(false);
    expect(isCurrentHydrationRequest(delawareRequest, delawareRequest)).toBe(true);
    expect(isCurrentHydrationRequest(delawareRequest, southCarolinaRequest)).toBe(false);
  });

  it("loads the active owner context from the authenticated server session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      user: { role: "ORGANIZATION_OWNER" },
      organization: { id: "1", name: "PRN Staffers Inc." },
      location: { id: "rJH8XytyAfEQSoOTQeuZ", name: "PRN Staffers CSC", city: "Beaufort", state: "South Carolina" },
      csrfToken: "csrf-test-only",
    }));
    await expect(loadSelectedOwnerContext(selected, fetchMock as typeof fetch)).resolves.toEqual(context);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/integrations/gohighlevel/session-context?locationId=rJH8XytyAfEQSoOTQeuZ",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("rejects unauthenticated, unauthorized, cross-organization, and wrong-location contexts", async () => {
    await expect(loadSelectedOwnerContext(selected,
      vi.fn().mockResolvedValue(jsonResponse({}, 401)) as typeof fetch,
    )).rejects.toThrow("Authentication");
    const response = (overrides: Record<string, unknown>) => vi.fn().mockResolvedValue(jsonResponse({
      user: { role: "ORGANIZATION_OWNER" },
      organization: { id: "1", name: "PRN Staffers Inc." },
      location: { id: "rJH8XytyAfEQSoOTQeuZ", name: "PRN Staffers CSC", city: "Beaufort", state: "South Carolina" },
      csrfToken: "csrf-test-only",
      ...overrides,
    })) as typeof fetch;
    await expect(loadSelectedOwnerContext(selected, response({ user: { role: "STAFF" } }))).rejects.toThrow("not authorized");
    await expect(loadSelectedOwnerContext(selected, response({ organization: { id: "2" } }))).rejects.toThrow("not authorized");
    await expect(loadSelectedOwnerContext(selected, response({ location: { id: "loc_other" } }))).rejects.toThrow("not authorized");
  });

  it("rejects a wrong provider or cross-location snapshot response", () => {
    expect(() => validateSnapshotBinding({ ...snapshot, provider: "other" as "gohighlevel" }, context)).toThrow("selected organization");
    expect(() => validateSnapshotBinding({
      ...snapshot,
      organizationId: "2",
    }, context)).toThrow("selected organization");
  });

  it("requests and returns the certified aggregate snapshot without provider writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(snapshot));
    await expect(requestCertifiedSnapshot(context, fetchMock as typeof fetch)).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/PUT|PATCH|DELETE|sync/i);
  });

  it("renders every certified metric, dynamic stages, timestamp, and Complete status", () => {
    const html = renderToStaticMarkup(createElement(LocationSnapshotView, { snapshot }));
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
    const html = renderToStaticMarkup(createElement(LocationSnapshotView, {
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
