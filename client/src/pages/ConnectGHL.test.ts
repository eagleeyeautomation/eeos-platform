import { describe, expect, it } from "vitest";
import { mapPitConnectionsToSubaccounts } from "./ConnectGHL";

describe("ConnectGHL backend-driven connection mapping", () => {
  const connections = [
    {
      locationId: "loc-delaware",
      subaccountName: "Delaware",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:00:00.000Z",
      companyId: "company-1",
      webhookRegistered: false,
    },
    {
      locationId: "loc-south-carolina",
      subaccountName: "South Carolina",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:10:00.000Z",
      companyId: "company-1",
      webhookRegistered: false,
    },
    {
      locationId: "loc-florida",
      subaccountName: "Florida",
      connected: true,
      tokenType: "private_integration",
      connectedAt: "2026-07-23T15:20:00.000Z",
      companyId: "company-1",
      webhookRegistered: false,
    },
    {
      locationId: "loc-alabama",
      subaccountName: "Alabama",
      connected: false,
      tokenType: null,
      connectedAt: null,
      companyId: null,
      webhookRegistered: false,
    },
  ];

  it("hydrates persisted Delaware, South Carolina, and Florida connections", () => {
    const subaccounts = mapPitConnectionsToSubaccounts(connections);

    expect(subaccounts.filter((entry) => entry.status === "connected").map((entry) => entry.name)).toEqual([
      "Delaware",
      "South Carolina",
      "Florida",
    ]);
  });

  it("keeps Alabama not connected until the backend marks it connected", () => {
    const subaccounts = mapPitConnectionsToSubaccounts(connections);

    expect(subaccounts.find((entry) => entry.name === "Alabama")).toMatchObject({
      locationId: "loc-alabama",
      status: "idle",
    });
  });

  it("derives the connected summary from backend records", () => {
    const subaccounts = mapPitConnectionsToSubaccounts(connections);

    expect(subaccounts.filter((entry) => entry.status === "connected")).toHaveLength(3);
    expect(subaccounts).toHaveLength(4);
  });

  it("never hydrates token inputs from backend metadata", () => {
    const subaccounts = mapPitConnectionsToSubaccounts(connections);

    expect(subaccounts.every((entry) => entry.token === "")).toBe(true);
  });
});
