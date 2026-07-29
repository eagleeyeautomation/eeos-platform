import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import {
  inferStateLabel,
  loadManagedLocations,
  locationSelectionKey,
  selectManagedLocation,
  SELECTED_LOCATION_STORAGE_KEY,
  type ManagedLocation,
} from "@/lib/location-management";

function formatTimestamp(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export default function LocationManagement() {
  const [locations, setLocations] = useState<ManagedLocation[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadManagedLocations()
      .then((available) => {
        if (!active) return;
        const selected = selectManagedLocation(
          available,
          window.localStorage.getItem(SELECTED_LOCATION_STORAGE_KEY),
        );
        setLocations(available);
        setSelectedKey(selected ? locationSelectionKey(selected) : "");
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Locations could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function selectLocation(location: ManagedLocation) {
    const key = locationSelectionKey(location);
    window.localStorage.setItem(SELECTED_LOCATION_STORAGE_KEY, key);
    setSelectedKey(key);
  }

  async function verifyConnection(location: ManagedLocation) {
    const key = locationSelectionKey(location);
    setVerifyingKey(key);
    setVerifiedKey(null);
    setError(null);
    try {
      const query = new URLSearchParams({
        tenantId: location.organization.id,
        locationId: location.location.id,
      });
      const response = await fetch(`/api/ghl/verify-location?${query}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Connection verification failed.");
      setVerifiedKey(key);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Connection verification failed.");
    } finally {
      setVerifyingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[rgba(201,162,39,0.14)] bg-[linear-gradient(135deg,rgba(7,22,43,0.96),rgba(5,12,26,0.98))] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">Owner Administration</p>
          <h1 className="mt-3 text-4xl font-bold">Location Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
            Select an authorized operating location without reconnecting OAuth. Each connection, token, and snapshot remains isolated by organization, provider, and location.
          </p>
        </section>

        {loading ? (
          <div className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-white/10">
            <Loader2 className="h-6 w-6 animate-spin text-[#C9A227]" />
          </div>
        ) : (
          <section className="mt-6 grid gap-4">
            {locations.map((location) => {
              const key = locationSelectionKey(location);
              const selected = selectedKey === key;
              return (
                <article key={key} className={`rounded-2xl border p-5 ${selected ? "border-[#C9A227]/50 bg-[#C9A227]/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-[#C9A227]" />
                      <div>
                        <h2 className="text-lg font-semibold">{location.location.name}</h2>
                        <p className="mt-1 text-sm text-white/55">{location.organization.name} · {location.provider}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-4 lg:min-w-[620px]">
                      <Meta label="State" value={inferStateLabel(location.location.name)} />
                      <Meta label="Connection" value={location.connection.connected ? "Connected" : "Not connected"} />
                      <Meta label="Last verified" value={formatTimestamp(location.connection.lastVerifiedAt)} />
                      <Meta label="Snapshot" value={location.snapshot.status.replace("_", " ")} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => selectLocation(location)} className="h-10 rounded-lg bg-[#C9A227] px-4 text-sm font-semibold text-black">
                        {selected ? "Active location" : "Select location"}
                      </button>
                      <button type="button" onClick={() => void verifyConnection(location)} disabled={!location.connection.connected || verifyingKey === key} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm disabled:opacity-50">
                        {verifyingKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : verifiedKey === key ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <ShieldCheck className="h-4 w-4" />}
                        {verifiedKey === key ? "Verified" : "Verify connection"}
                      </button>
                      <button type="button" disabled className="h-10 rounded-lg border border-white/10 px-4 text-sm text-white/35">
                        Disconnect — Future
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {locations.length === 0 ? <p className="rounded-2xl border border-white/10 p-8 text-center text-white/55">No authorized locations are available.</p> : null}
          </section>
        )}
        {error ? <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">{error}</p> : null}
      </main>
      <Footer />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 text-white/75">{value}</p>
    </div>
  );
}
