import { describe, expect, it } from "vitest";
import { getIntegrationHealthSummary, truncateLocationId, type GhlConnection } from "./Dashboard";

describe("Dashboard integration health helpers", () => {
  const connections: GhlConnection[] = [
    {
      locationId: "loc-prn-csc-123456",
      subaccountName: "PRN Staffers CSC",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:11:16.000Z",
      companyId: "company-safe",
      webhookRegistered: false,
    },
    {
      locationId: "loc-prn-inc-123456",
      subaccountName: "PRN Staffers Inc.",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:12:16.000Z",
      companyId: "company-safe",
      webhookRegistered: false,
    },
    {
      locationId: "loc-prn-fl-123456",
      subaccountName: "PRN Staffers FL",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:13:16.000Z",
      companyId: "company-safe",
      webhookRegistered: false,
    },
  ];

  it("derives the dashboard summary from backend connection records", () => {
    expect(getIntegrationHealthSummary(connections)).toEqual({
      total: 3,
      connected: 3,
      active: 3,
      label: "3 of 3 active locations connected",
    });
  });

  it("does not require full location IDs to be shown in the dashboard UI", () => {
    expect(truncateLocationId("abcdefghijklmno")).toBe("abcdefgh...lmno");
  });
});
