import { describe, expect, it, vi } from "vitest";
import {
  inferStateLabel,
  loadManagedLocations,
  locationSelectionKey,
  selectManagedLocation,
  type ManagedLocation,
} from "./location-management";

const locations: ManagedLocation[] = [
  {
    organization: { id: "1", name: "PRN Staffers" },
    provider: "gohighlevel",
    location: { id: "loc-sc", name: "South Carolina" },
    connection: { connected: true, lastVerifiedAt: "2026-07-29T00:00:00.000Z" },
    snapshot: { status: "complete", generatedAt: "2026-07-29T00:00:00.000Z" },
  },
  {
    organization: { id: "2", name: "Another Customer" },
    provider: "gohighlevel",
    location: { id: "loc-al", name: "Alabama Office" },
    connection: { connected: false, lastVerifiedAt: null },
    snapshot: { status: "not_available", generatedAt: null },
  },
];

describe("multi-location client framework", () => {
  it("uses organization, provider, and location for independent selection", () => {
    expect(locationSelectionKey(locations[0])).toBe("1:gohighlevel:loc-sc");
    expect(locationSelectionKey(locations[1])).toBe("2:gohighlevel:loc-al");
    expect(selectManagedLocation(locations, "2:gohighlevel:loc-al")).toEqual(locations[1]);
  });

  it("falls back safely when a stored location is no longer authorized", () => {
    expect(selectManagedLocation(locations, "1:gohighlevel:loc-removed")).toEqual(locations[0]);
  });

  it("loads only the protected authenticated location-management route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ locations }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    await expect(loadManagedLocations(fetchMock as typeof fetch)).resolves.toEqual(locations);
    expect(fetchMock).toHaveBeenCalledWith("/api/location-management/locations", expect.objectContaining({
      credentials: "include",
      cache: "no-store",
    }));
  });

  it("derives safe state labels without provider data", () => {
    expect(inferStateLabel("PRN Staffers South Carolina")).toBe("South Carolina");
    expect(inferStateLabel("PRN Staffers CSC")).toBe("South Carolina");
    expect(inferStateLabel("Alabama Office")).toBe("Alabama");
    expect(inferStateLabel("Future Office")).toBe("Not specified");
  });
});
