import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  loadManagedLocations,
  locationSelectionKey,
  selectManagedLocation,
  SELECTED_LOCATION_STORAGE_KEY,
  type ManagedLocation,
} from "@/lib/location-management";

const SNAPSHOT_ROUTE = "/api/ghl/operations-snapshot";
const SESSION_ROUTE = "/api/integrations/gohighlevel/session-context";

type OwnerSnapshotContext = {
  organizationId: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  provider: string;
  role: string;
  csrfToken: string;
};

export type LocationOperationsSnapshot = {
  organizationId: string;
  organizationName: string;
  location: { name: string; maskedProviderLocationId: string };
  provider: "gohighlevel";
  connection: { connected: true; healthy: true };
  contacts: { total: number; createdLast7Days: number; createdLast30Days: number };
  opportunities: {
    openTotal: number;
    createdLast7Days: number;
    createdLast30Days: number;
    byStage: Array<{
      pipelineIdentifier: string;
      pipelineName: string;
      stageIdentifier: string;
      stageName: string;
      count: number;
    }>;
  };
  generatedAt: string;
  partial: boolean;
};

type PanelState =
  | { kind: "loading" }
  | { kind: "ready"; context: OwnerSnapshotContext }
  | { kind: "refreshing"; context: OwnerSnapshotContext }
  | { kind: "snapshot"; context: OwnerSnapshotContext; snapshot: LocationOperationsSnapshot }
  | { kind: "error"; title: string; message: string; context?: OwnerSnapshotContext };

export function buildSnapshotRequest(context: Pick<OwnerSnapshotContext, "organizationId" | "locationId" | "provider" | "csrfToken">) {
  const query = new URLSearchParams({
    organizationId: context.organizationId,
    locationId: context.locationId,
    provider: context.provider,
  });
  return {
    url: `${SNAPSHOT_ROUTE}?${query}`,
    init: {
      method: "POST",
      credentials: "include" as const,
      cache: "no-store" as const,
      headers: {
        Accept: "application/json",
        "x-eeos-csrf-token": context.csrfToken,
      },
    },
  };
}

export function validateSnapshotBinding(snapshot: LocationOperationsSnapshot, context: OwnerSnapshotContext) {
  if (
    snapshot.organizationId !== context.organizationId
    || snapshot.provider !== context.provider
    || !snapshot.location.maskedProviderLocationId
  ) {
    throw new Error("The snapshot response did not match the selected organization, provider, and location.");
  }
  return snapshot;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export async function loadSelectedOwnerContext(
  selected: ManagedLocation,
  fetchImpl: typeof fetch = fetch,
) {
  const query = new URLSearchParams({ locationId: selected.location.id });
  const response = await fetchImpl(`${SESSION_ROUTE}?${query}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(response.status === 401 ? "Authentication is required." : "Permission denied.");
  const user = typeof payload.user === "object" && payload.user ? payload.user as Record<string, unknown> : {};
  const organization = typeof payload.organization === "object" && payload.organization
    ? payload.organization as Record<string, unknown>
    : {};
  const location = typeof payload.location === "object" && payload.location
    ? payload.location as Record<string, unknown>
    : {};
  const context = {
    organizationId: String(organization.id ?? ""),
    organizationName: String(organization.name ?? ""),
    locationId: String(location.id ?? ""),
    locationName: String(location.name ?? ""),
    provider: selected.provider,
    role: String(user.role ?? ""),
    csrfToken: String(payload.csrfToken ?? ""),
  };
  if (
    context.role !== "ORGANIZATION_OWNER"
    || context.organizationId !== selected.organization.id
    || context.locationId !== selected.location.id
    || context.provider !== selected.provider
    || !context.csrfToken
  ) {
    throw new Error("The selected location is not authorized for the active organization owner.");
  }
  return context;
}

export async function requestCertifiedSnapshot(
  context: OwnerSnapshotContext,
  fetchImpl: typeof fetch = fetch,
) {
  const request = buildSnapshotRequest(context);
  const response = await fetchImpl(request.url, request.init);
  const payload = await readJson(response);
  if (!response.ok) {
    const error = String(payload.error ?? "");
    const message = error === "reauthorization_required"
      ? "Reauthorization required before a new snapshot can run."
      : response.status === 403
        ? "Permission denied for this organization, provider, or location."
        : "Provider unavailable. No false zero values are shown.";
    throw new Error(typeof payload.message === "string" ? payload.message : message);
  }
  return validateSnapshotBinding(payload as unknown as LocationOperationsSnapshot, context);
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function LocationSnapshotView({ snapshot }: { snapshot: LocationOperationsSnapshot }) {
  const metrics = [
    ["Connection Health", snapshot.connection.healthy ? "Connected" : "Provider unavailable"],
    ["Total Contacts", snapshot.contacts.total],
    ["New Contacts — 7 Days", snapshot.contacts.createdLast7Days],
    ["New Contacts — 30 Days", snapshot.contacts.createdLast30Days],
    ["Open Opportunities", snapshot.opportunities.openTotal],
    ["New Opportunities — 7 Days", snapshot.opportunities.createdLast7Days],
    ["New Opportunities — 30 Days", snapshot.opportunities.createdLast30Days],
  ] as const;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />Connected
        </span>
        <span className={`rounded-full border px-3 py-1 ${snapshot.partial
          ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}>
          {snapshot.partial ? "Partial result" : "Complete"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">
          GoHighLevel · {snapshot.location.name}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[rgba(201,162,39,0.1)] bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">{label}</p>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-[rgba(201,162,39,0.1)] bg-white/[0.035] p-5">
        <h3 className="text-base font-semibold text-white">Pipeline Stage Distribution</h3>
        {snapshot.opportunities.byStage.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {snapshot.opportunities.byStage.map((stage) => (
              <li key={`${stage.pipelineIdentifier}:${stage.stageIdentifier}`} className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 text-sm">
                <span className="text-white/70">{stage.pipelineName} · {stage.stageName}</span>
                <span className="font-bold text-white">{stage.count}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-white/55">No open opportunities were returned.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
        <span className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />Generated {formatGeneratedAt(snapshot.generatedAt)}</span>
        <span>Location binding {snapshot.location.maskedProviderLocationId}</span>
        <span>Aggregate operational data only</span>
      </div>
    </div>
  );
}

export default function LocationOperations() {
  const [locations, setLocations] = useState<ManagedLocation[]>([]);
  const [selected, setSelected] = useState<ManagedLocation | null>(null);
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const requestInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void loadManagedLocations()
      .then(async (available) => {
        const selection = selectManagedLocation(
          available,
          window.localStorage.getItem(SELECTED_LOCATION_STORAGE_KEY),
        );
        if (!selection) throw new Error("No certified location is available.");
        const context = await loadSelectedOwnerContext(selection);
        if (active) {
          setLocations(available);
          setSelected(selection);
          setState({ kind: "ready", context });
        }
      })
      .catch((error) => {
        if (active) setState({ kind: "error", title: "Operations unavailable", message: error instanceof Error ? error.message : "Locations could not be loaded." });
      });
    return () => { active = false; };
  }, []);

  async function changeLocation(selectionKey: string) {
    const next = locations.find((location) => locationSelectionKey(location) === selectionKey);
    if (!next || requestInFlight.current) return;
    setState({ kind: "loading" });
    try {
      const context = await loadSelectedOwnerContext(next);
      window.localStorage.setItem(SELECTED_LOCATION_STORAGE_KEY, selectionKey);
      setSelected(next);
      setState({ kind: "ready", context });
    } catch (error) {
      setState({ kind: "error", title: "Location selection denied", message: error instanceof Error ? error.message : "The location could not be selected." });
    }
  }

  async function refreshSnapshot() {
    if (requestInFlight.current || state.kind === "loading" || (state.kind === "error" && !state.context)) return;
    const context = state.context;
    if (!context) return;
    requestInFlight.current = true;
    setState({ kind: "refreshing", context });
    try {
      setState({ kind: "snapshot", context, snapshot: await requestCertifiedSnapshot(context) });
    } catch (error) {
      setState({ kind: "error", title: "Snapshot unavailable", message: error instanceof Error ? error.message : "Provider unavailable.", context });
    } finally {
      requestInFlight.current = false;
    }
  }

  const context = state.kind === "ready" || state.kind === "refreshing" || state.kind === "snapshot" || state.kind === "error"
    ? state.context
    : null;

  return (
    <section className="mt-6 rounded-3xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[rgba(201,162,39,0.08)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Operational Read</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{selected?.location.name ?? "Selected Location"} Operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Aggregate provider metrics for the active authorized location. Switching locations never reconnects OAuth.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="dashboard-location">Active location</label>
          <select
            id="dashboard-location"
            value={selected ? locationSelectionKey(selected) : ""}
            onChange={(event) => void changeLocation(event.target.value)}
            disabled={locations.length === 0 || state.kind === "refreshing"}
            className="h-11 rounded-xl border border-white/10 bg-[#071426] px-3 text-sm text-white"
          >
            {locations.map((location) => (
              <option key={locationSelectionKey(location)} value={locationSelectionKey(location)}>
                {location.organization.name} · {location.location.name} · {location.provider}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void refreshSnapshot()} disabled={!context || state.kind === "refreshing"} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(201,162,39,0.3)] bg-[rgba(201,162,39,0.08)] px-4 text-sm font-semibold text-white disabled:opacity-50">
            {state.kind === "refreshing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {state.kind === "refreshing" ? "Refreshing" : "Refresh Snapshot"}
          </button>
        </div>
      </div>
      {state.kind === "loading" ? <Status icon={Loader2} title="Loading" message="Verifying the selected organization, provider, and location." spin />
        : state.kind === "ready" ? <Status icon={ShieldCheck} title="Connected" message="The selected location is ready for a protected on-demand snapshot." />
          : state.kind === "refreshing" ? <Status icon={Loader2} title="Refreshing" message="Reading bounded aggregate metrics through the protected server route." spin />
            : state.kind === "error" ? <Status icon={AlertCircle} title={state.title} message={state.message} error />
              : <LocationSnapshotView snapshot={state.snapshot} />}
    </section>
  );
}

function Status({ icon: Icon, title, message, spin = false, error = false }: {
  icon: typeof ShieldCheck; title: string; message: string; spin?: boolean; error?: boolean;
}) {
  return (
    <div className={`mt-5 flex min-h-36 flex-col items-center justify-center rounded-2xl border p-6 text-center ${error ? "border-red-500/20 bg-red-500/5 text-red-200" : "border-white/5 bg-white/[0.025] text-white/60"}`}>
      <Icon className={`h-6 w-6 ${spin ? "animate-spin" : ""}`} />
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-xl text-sm">{message}</p>
    </div>
  );
}
