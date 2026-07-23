import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  MapPin,
  Plug,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export type GhlConnection = {
  locationId: string;
  subaccountName: string;
  connected: boolean;
  tokenType?: string | null;
  connectedAt?: string | null;
  companyId?: string | null;
  webhookRegistered?: boolean;
};

type LoadStatus = "loading" | "ready" | "empty" | "error";

export function truncateLocationId(locationId: string) {
  const trimmed = locationId.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

export function getIntegrationHealthSummary(connections: GhlConnection[]) {
  const total = connections.length;
  const connected = connections.filter((connection) => connection.connected).length;
  return {
    total,
    connected,
    active: connected,
    label: `${connected} of ${total} active locations connected`,
  };
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Not available";
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

function readDashboardError(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim().length > 0) return payload;
  if (payload && typeof payload === "object") {
    const error = "error" in payload ? payload.error : undefined;
    const message = "message" in payload ? payload.message : undefined;
    if (typeof error === "string") return error;
    if (typeof message === "string") return message;
  }
  return `Integration health request failed with HTTP ${status}`;
}

export default function Dashboard() {
  const [connections, setConnections] = useState<GhlConnection[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  async function loadConnections() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/ghl/pit/connections", {
        headers: { Accept: "application/json" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new Error(readDashboardError(payload, response.status));
      }

      if (!Array.isArray(payload)) {
        throw new Error("Integration health response was not a connection list.");
      }

      setConnections(payload as GhlConnection[]);
      setStatus(payload.length > 0 ? "ready" : "empty");
    } catch (err) {
      setConnections([]);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load GoHighLevel connection health.");
    }
  }

  useEffect(() => {
    void loadConnections();
  }, []);

  const summary = useMemo(() => getIntegrationHealthSummary(connections), [connections]);

  return (
    <div className="min-h-screen bg-[#050C1A] text-[#E8EDF5]">
      <Navigation />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[rgba(0,212,200,0.14)] bg-[linear-gradient(135deg,rgba(7,22,43,0.96),rgba(5,12,26,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#00D4C8]/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#00D4C8]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Executive Dashboard
              </div>
              <h1
                className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Live Integration Health
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#B7C5D8] sm:text-base">
                Verified GoHighLevel connection status for the locations currently persisted in EEOS.
                Business metrics will be added only after the underlying live signals are verified.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadConnections()}
                disabled={status === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.08)] px-4 text-sm font-semibold text-[#BFFDF8] transition hover:border-[#00D4C8] hover:bg-[rgba(0,212,200,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link
                href="/connect-ghl"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00D4C8] px-4 text-sm font-bold text-[#050C1A] shadow-[0_0_24px_rgba(0,212,200,0.3)] transition hover:bg-[#00E8DB]"
              >
                Manage GoHighLevel Connections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={Plug} label="Connected Locations" value={`${summary.connected}`} detail={`${summary.total} locations returned by backend`} />
          <SummaryCard icon={CheckCircle2} label="Active Connections" value={`${summary.active}`} detail="Current active GoHighLevel records" />
          <SummaryCard icon={Database} label="Source of Truth" value="Backend" detail="No location IDs are owned by the frontend" />
        </section>

        <section className="mt-6 rounded-3xl border border-[rgba(0,212,200,0.12)] bg-[rgba(7,20,38,0.82)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[rgba(0,212,200,0.08)] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00D4C8]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Integration Health
              </p>
              <h2
                className="mt-2 text-2xl font-semibold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {status === "ready" ? summary.label : "GoHighLevel locations"}
              </h2>
            </div>
            {status === "ready" ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#10B981]/35 bg-[#05291F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#34D399]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {summary.connected === summary.total ? "All Connected" : "Needs Attention"}
              </span>
            ) : null}
          </div>

          {status === "loading" ? (
            <StatePanel icon={Loader2} title="Loading integration health" message="EEOS is reading persisted GoHighLevel connection metadata." animate />
          ) : status === "error" ? (
            <StatePanel icon={AlertCircle} title="Unable to load integration health" message={error ?? "The integration health endpoint did not respond."} tone="error" />
          ) : status === "empty" ? (
            <StatePanel icon={Database} title="No GoHighLevel connections found" message="No persisted GoHighLevel locations were returned by the backend." />
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {connections.map((connection) => (
                <ConnectionCard key={connection.locationId || connection.subaccountName} connection={connection} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Plug;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(0,212,200,0.12)] bg-[rgba(7,20,38,0.78)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA9C7]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {value}
          </p>
          <p className="mt-2 text-sm text-[#B7C5D8]">{detail}</p>
        </div>
        <div className="rounded-xl border border-[rgba(0,212,200,0.18)] bg-[rgba(0,212,200,0.08)] p-3 text-[#00D4C8]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ConnectionCard({ connection }: { connection: GhlConnection }) {
  return (
    <article className="rounded-2xl border border-[rgba(0,212,200,0.12)] bg-[#050F1D] p-5 transition hover:border-[rgba(0,212,200,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {connection.subaccountName || "GoHighLevel Location"}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connection.connected ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
            <span
              className={`text-xs font-semibold uppercase tracking-[0.14em] ${connection.connected ? "text-[#34D399]" : "text-[#FCA5A5]"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {connection.connected ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-[rgba(0,212,200,0.18)] bg-[rgba(0,212,200,0.08)] p-2 text-[#00D4C8]">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <MetadataRow label="Location ID" value={connection.locationId ? truncateLocationId(connection.locationId) : "Not available"} />
        <MetadataRow label="Token Type" value={connection.tokenType || "Not available"} />
        <MetadataRow label="Connected" value={formatTimestamp(connection.connectedAt)} />
        <MetadataRow label="Webhook" value={connection.webhookRegistered ? "Registered" : "Not registered"} />
        {connection.companyId ? <MetadataRow label="Company" value={truncateLocationId(connection.companyId)} /> : null}
      </dl>
    </article>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[rgba(0,212,200,0.06)] pt-3">
      <dt className="text-[#8EA9C7]">{label}</dt>
      <dd className="max-w-[60%] text-right text-[#E8EDF5]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </dd>
    </div>
  );
}

function StatePanel({
  icon: Icon,
  title,
  message,
  tone = "neutral",
  animate = false,
}: {
  icon: typeof Database;
  title: string;
  message: string;
  tone?: "neutral" | "error";
  animate?: boolean;
}) {
  const color = tone === "error" ? "text-[#FCA5A5] border-[#EF4444]/25 bg-[#2A0808]" : "text-[#B7C5D8] border-[rgba(0,212,200,0.1)] bg-[#050F1D]";
  return (
    <div className={`mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border p-8 text-center ${color}`}>
      <Icon className={`h-8 w-8 ${animate ? "animate-spin" : ""}`} />
      <h3 className="mt-4 text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6">{message}</p>
      {tone === "error" ? (
        <Link href="/connect-ghl" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8]">
          Review GoHighLevel connections
          <ExternalLink className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
