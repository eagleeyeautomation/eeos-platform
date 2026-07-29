import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const SNAPSHOT_ROUTE = "/api/ghl/operations-snapshot";
const SESSION_ROUTE = "/api/integrations/gohighlevel/session-context";
const CERTIFIED_ORGANIZATION_ID = "1";
const CERTIFIED_LOCATION_ID = "rJH8XytyAfEQSoOTQeuZ";

type OwnerSnapshotContext = {
  organizationId: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  role: string;
  csrfToken: string;
};

export type SouthCarolinaSnapshot = {
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
  | { kind: "loading-context" }
  | { kind: "ready"; context: OwnerSnapshotContext }
  | { kind: "refreshing"; context: OwnerSnapshotContext }
  | { kind: "snapshot"; context: OwnerSnapshotContext; snapshot: SouthCarolinaSnapshot }
  | { kind: "error"; title: string; message: string; context?: OwnerSnapshotContext };

export function buildSnapshotRequest(context: Pick<OwnerSnapshotContext, "organizationId" | "locationId" | "csrfToken">) {
  const query = new URLSearchParams({
    organizationId: context.organizationId,
    locationId: context.locationId,
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

export function validateCertifiedContext(context: OwnerSnapshotContext) {
  if (context.role !== "ORGANIZATION_OWNER") {
    throw new Error("Permission denied. An active organization-owner context is required.");
  }
  if (context.organizationId !== CERTIFIED_ORGANIZATION_ID) {
    throw new Error("No certified organization is selected.");
  }
  if (context.locationId !== CERTIFIED_LOCATION_ID) {
    throw new Error("No certified South Carolina location is selected.");
  }
  return context;
}

export function validateSnapshot(snapshot: SouthCarolinaSnapshot) {
  if (
    snapshot.organizationId !== CERTIFIED_ORGANIZATION_ID
    || snapshot.provider !== "gohighlevel"
    || snapshot.location.maskedProviderLocationId !== "rJH8…QeuZ"
  ) {
    throw new Error("The snapshot response did not match the certified South Carolina provider binding.");
  }
  return snapshot;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export async function loadCertifiedOwnerContext(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(SESSION_ROUTE, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Authentication is required." : "Permission denied.");
  }
  const user = typeof payload.user === "object" && payload.user ? payload.user as Record<string, unknown> : {};
  const organization = typeof payload.organization === "object" && payload.organization
    ? payload.organization as Record<string, unknown>
    : {};
  const location = typeof payload.location === "object" && payload.location
    ? payload.location as Record<string, unknown>
    : {};
  return validateCertifiedContext({
    organizationId: String(organization.id ?? ""),
    organizationName: String(organization.name ?? ""),
    locationId: String(location.id ?? ""),
    locationName: String(location.name ?? ""),
    role: String(user.role ?? ""),
    csrfToken: String(payload.csrfToken ?? ""),
  });
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
        ? "Permission denied for this organization or location."
        : "Provider unavailable. No false zero values are shown.";
    throw new Error(typeof payload.message === "string" ? payload.message : message);
  }
  return validateSnapshot(payload as unknown as SouthCarolinaSnapshot);
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

export function SouthCarolinaSnapshotView({ snapshot }: { snapshot: SouthCarolinaSnapshot }) {
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
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected
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
              <li
                key={`${stage.pipelineIdentifier}:${stage.stageIdentifier}`}
                className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 text-sm"
              >
                <span className="text-white/70">{stage.pipelineName} · {stage.stageName}</span>
                <span className="font-bold text-white">{stage.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/55">No open opportunities were returned.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5" />
          Generated {formatGeneratedAt(snapshot.generatedAt)}
        </span>
        <span>Location binding {snapshot.location.maskedProviderLocationId}</span>
        <span>Aggregate operational data only</span>
      </div>
    </div>
  );
}

export default function SouthCarolinaOperations() {
  const [state, setState] = useState<PanelState>({ kind: "loading-context" });
  const requestInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void loadCertifiedOwnerContext()
      .then((context) => {
        if (active) setState({ kind: "ready", context });
      })
      .catch((error) => {
        if (active) {
          setState({
            kind: "error",
            title: "South Carolina operations unavailable",
            message: error instanceof Error ? error.message : "The certified owner context could not be loaded.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshSnapshot() {
    if (requestInFlight.current || state.kind === "loading-context" || (state.kind === "error" && !state.context)) return;
    const context = state.context;
    if (!context) return;
    requestInFlight.current = true;
    setState({ kind: "refreshing", context });
    try {
      const snapshot = await requestCertifiedSnapshot(context);
      setState({ kind: "snapshot", context, snapshot });
    } catch (error) {
      setState({
        kind: "error",
        title: "Snapshot unavailable",
        message: error instanceof Error ? error.message : "Provider unavailable. No false zero values are shown.",
        context,
      });
    } finally {
      requestInFlight.current = false;
    }
  }

  const isRefreshing = state.kind === "refreshing";
  const context = state.kind === "ready" || state.kind === "refreshing" || state.kind === "snapshot" || state.kind === "error"
    ? state.context
    : null;

  return (
    <section className="mt-6 rounded-3xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[rgba(201,162,39,0.08)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Operational Read</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">South Carolina Operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Certified aggregate GoHighLevel metrics for PRN Staffers South Carolina. No personal records are shown or stored.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshSnapshot()}
          disabled={!context || isRefreshing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(201,162,39,0.3)] bg-[rgba(201,162,39,0.08)] px-4 text-sm font-semibold text-white transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isRefreshing ? "Refreshing" : "Refresh Snapshot"}
        </button>
      </div>

      {state.kind === "loading-context" ? (
        <StatusMessage icon={Loader2} title="Loading" message="Verifying the active owner and certified South Carolina context." spin />
      ) : state.kind === "ready" ? (
        <StatusMessage icon={ShieldCheck} title="Connected" message="The certified location is ready for one protected on-demand snapshot." />
      ) : state.kind === "refreshing" ? (
        <StatusMessage icon={Loader2} title="Refreshing" message="Reading bounded aggregate metrics from the certified snapshot service." spin />
      ) : state.kind === "error" ? (
        <StatusMessage icon={AlertCircle} title={state.title} message={state.message} error />
      ) : (
        <SouthCarolinaSnapshotView snapshot={state.snapshot} />
      )}
    </section>
  );
}

function StatusMessage({
  icon: Icon,
  title,
  message,
  spin = false,
  error = false,
}: {
  icon: typeof ShieldCheck;
  title: string;
  message: string;
  spin?: boolean;
  error?: boolean;
}) {
  return (
    <div className={`mt-5 flex min-h-36 flex-col items-center justify-center rounded-2xl border p-6 text-center ${
      error ? "border-red-500/20 bg-red-500/5 text-red-200" : "border-white/5 bg-white/[0.025] text-white/60"
    }`}>
      <Icon className={`h-6 w-6 ${spin ? "animate-spin" : ""}`} />
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-xl text-sm">{message}</p>
    </div>
  );
}
