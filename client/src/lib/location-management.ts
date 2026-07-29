export type ManagedLocation = {
  organization: { id: string; name: string };
  provider: string;
  location: { id: string; name: string };
  connection: { connected: boolean; lastVerifiedAt: string | null };
  snapshot: {
    status: "complete" | "partial" | "not_available";
    generatedAt: string | null;
  };
};

export const LOCATION_MANAGEMENT_ROUTE = "/api/location-management/locations";
export const SELECTED_LOCATION_STORAGE_KEY = "eeos:v1:selected-managed-location";

export function locationSelectionKey(location: Pick<ManagedLocation, "organization" | "provider" | "location">) {
  return `${location.organization.id}:${location.provider}:${location.location.id}`;
}

export function selectManagedLocation(
  locations: ManagedLocation[],
  storedSelection: string | null,
) {
  return locations.find((location) => locationSelectionKey(location) === storedSelection)
    ?? locations[0]
    ?? null;
}

export function inferStateLabel(locationName: string) {
  const normalized = locationName.trim();
  if (/\bCSC\b/i.test(normalized)) return "South Carolina";
  const state = [
    "Alabama",
    "Delaware",
    "Florida",
    "South Carolina",
  ].find((candidate) => normalized.toLowerCase().includes(candidate.toLowerCase()));
  return state ?? "Not specified";
}

export async function loadManagedLocations(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(LOCATION_MANAGEMENT_ROUTE, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({})) as {
    locations?: ManagedLocation[];
    message?: string;
  };
  if (!response.ok || !Array.isArray(payload.locations)) {
    throw new Error(payload.message ?? "Authorized locations could not be loaded.");
  }
  return payload.locations;
}
