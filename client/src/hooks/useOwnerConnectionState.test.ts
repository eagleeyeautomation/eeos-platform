import { describe, expect, it } from "vitest";
import {
  CONNECT_GHL_ROUTE,
  OWNER_PAGE_EMPTY_STATES,
  filterTenantScopedConnections,
  getOwnerDashboardAccessState,
  isPersistedPitConnection,
  mapPitConnectionsToOwnerSubaccounts,
  shouldShowConnectionPrompt,
  type OwnerConnection,
} from "./useOwnerConnectionState";

describe("owner dashboard connection hydration", () => {
  const persistedConnections: OwnerConnection[] = [
    {
      locationId: "loc-delaware",
      subaccountName: "PRN Staffers Inc.",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:00:00.000Z",
      companyId: "prn-staffers",
      webhookRegistered: false,
    },
    {
      locationId: "rJH8XytyAfEQSoOTQeuZ",
      subaccountName: "PRN Staffers CSC",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:10:00.000Z",
      companyId: "prn-staffers",
      webhookRegistered: false,
    },
    {
      locationId: "loc-florida",
      subaccountName: "PRN Staffers FL",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:20:00.000Z",
      companyId: "prn-staffers",
      webhookRegistered: false,
    },
  ];

  it("treats persisted private integration tokens as connected owner subaccounts", () => {
    expect(persistedConnections.every(isPersistedPitConnection)).toBe(true);

    const subaccounts = mapPitConnectionsToOwnerSubaccounts(persistedConnections);

    expect(subaccounts.map((entry) => entry.name)).toEqual([
      "PRN Staffers Inc.",
      "PRN Staffers CSC",
      "PRN Staffers FL",
    ]);
    expect(subaccounts.every((entry) => entry.status === "connected")).toBe(true);
  });

  it("does not show Connect GoHighLevel for a connected authenticated organization", () => {
    const accessState = getOwnerDashboardAccessState({
      isAuthenticated: true,
      authLoading: false,
      connectionLoading: false,
      hasConnectedLocations: true,
      tenantId: "rJH8XytyAfEQSoOTQeuZ",
    });

    expect(accessState).toBe("ready");
    expect(shouldShowConnectionPrompt(accessState)).toBe(false);
  });

  it("does not show the sign-in prompt when persisted connected state has hydrated", () => {
    expect(getOwnerDashboardAccessState({
      isAuthenticated: false,
      authLoading: false,
      connectionLoading: false,
      hasConnectedLocations: true,
      tenantId: "rJH8XytyAfEQSoOTQeuZ",
    })).toBe("ready");
  });

  it("keeps page-specific empty states for connected pages without live records yet", () => {
    expect(OWNER_PAGE_EMPTY_STATES["/business-health"]).toContain("Business health data");
    expect(OWNER_PAGE_EMPTY_STATES["/ai-recommendations"]).toContain("recommendations");
    expect(OWNER_PAGE_EMPTY_STATES["/live-signals"]).toContain("signals");
  });

  it("maps persisted connections for Integration Status", () => {
    const subaccounts = mapPitConnectionsToOwnerSubaccounts(persistedConnections);

    expect(subaccounts).toHaveLength(3);
    expect(subaccounts.map((entry) => entry.tokenType)).toEqual([
      "private_integration",
      "private_integration",
      "private_integration",
    ]);
  });

  it("keeps Connect GHL available as the connection management route", () => {
    expect(CONNECT_GHL_ROUTE).toBe("/connect-ghl");
  });

  it("still prompts a disconnected authenticated organization to connect", () => {
    const accessState = getOwnerDashboardAccessState({
      isAuthenticated: true,
      authLoading: false,
      connectionLoading: false,
      hasConnectedLocations: false,
      tenantId: "",
    });

    expect(accessState).toBe("connect");
    expect(shouldShowConnectionPrompt(accessState)).toBe(true);
  });

  it("does not mix another organization's connection metadata when scoped by company", () => {
    const scoped = filterTenantScopedConnections([
      ...persistedConnections,
      {
        locationId: "loc-other-org",
        subaccountName: "Other Organization",
        connected: true,
        tokenType: "private_integration",
        companyId: "other-org",
      },
    ], "prn-staffers");

    expect(scoped.map((connection) => connection.subaccountName)).toEqual([
      "PRN Staffers Inc.",
      "PRN Staffers CSC",
      "PRN Staffers FL",
    ]);
  });
});
