import { AlertCircle, CheckCircle2, Clock, Database, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import AuthenticatedPageBranding from "@/components/AuthenticatedPageBranding";
import { useOwnerConnectionState, type OwnerConnection } from "@/hooks/useOwnerConnectionState";

export type OwnerReviewPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyMessage: string;
};

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

function truncateId(value?: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Not available";
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

function ConnectionRow({ connection }: { connection: OwnerConnection }) {
  return (
    <li className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {connection.subaccountName || "GoHighLevel Location"}
          </p>
          <p className="mt-1 text-xs text-[#FFFFFF]/55" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Location {truncateId(connection.locationId)}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#05291F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#34D399]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-[#FFFFFF]/60 sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Token Type
          </dt>
          <dd className="mt-1">{connection.tokenType || "Not available"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Connected
          </dt>
          <dd className="mt-1">{formatTimestamp(connection.connectedAt)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Webhook
          </dt>
          <dd className="mt-1">{connection.webhookRegistered ? "Registered" : "Not registered"}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function OwnerReviewPage({
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyMessage,
}: OwnerReviewPageProps) {
  const { connectedConnections, connectionsLoading, connectionsError, hasConnectedLocations } = useOwnerConnectionState();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[rgba(201,162,39,0.14)] bg-[linear-gradient(135deg,rgba(7,22,43,0.96),rgba(5,12,26,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#C9A227]/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(201,162,39,0.3)] bg-[rgba(201,162,39,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <h1
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#D8D8D8] sm:text-base">{description}</p>
          </div>
        </section>

        {title === "Executive Dashboard" ? (
          <AuthenticatedPageBranding
            imageSrc="/eeos-assets/approved/modules/why-choose-eeos.png"
            title="Executive Dashboard Intelligence"
            subtitle="A focused executive surface for verified organization data and operational review."
            className="mt-6"
          />
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.78)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B8B8B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Data Status
            </p>
            <p className="mt-3 text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Verified only
            </p>
            <p className="mt-2 text-sm text-[#D8D8D8]">This page will show verified business data only.</p>
          </div>
          <div className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.78)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B8B8B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Connected Locations
            </p>
            <p className="mt-3 text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {connectionsLoading ? "Loading" : `${connectedConnections.length}`}
            </p>
            <p className="mt-2 text-sm text-[#D8D8D8]">Read from persisted GoHighLevel connection metadata.</p>
          </div>
          <div className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.78)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B8B8B8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Source of Truth
            </p>
            <p className="mt-3 text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Backend
            </p>
            <p className="mt-2 text-sm text-[#D8D8D8]">No private tokens or invented dashboard data are displayed.</p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[rgba(201,162,39,0.12)] bg-[rgba(7,20,38,0.82)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
          {connectionsLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A227]" />
              <h2 className="mt-4 text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Loading owner workspace
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#D8D8D8]">EEOS is checking persisted GoHighLevel connection status.</p>
            </div>
          ) : connectionsError ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <AlertCircle className="h-8 w-8 text-[#FCA5A5]" />
              <h2 className="mt-4 text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Connection status unavailable
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#D8D8D8]">{connectionsError}</p>
              <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C9A227]">
                Open dashboard
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          ) : hasConnectedLocations ? (
            <div>
              <div className="flex flex-col gap-3 border-b border-[rgba(201,162,39,0.08)] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Verified Connections
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {connectedConnections.length} connected GoHighLevel location{connectedConnections.length === 1 ? "" : "s"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#D8D8D8]">{emptyMessage}</p>
                </div>
                <Link href="/dashboard" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-4 text-sm font-bold text-[#0B0B0B] transition hover:bg-[#D8B84A]">
                  View Integration Health
                </Link>
              </div>
              <ul className="mt-5 grid gap-4 lg:grid-cols-2">
                {connectedConnections.map((connection) => (
                  <ConnectionRow key={connection.locationId || connection.subaccountName} connection={connection} />
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Database className="h-8 w-8 text-[#C9A227]" />
              <h2 className="mt-4 text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {emptyTitle}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#D8D8D8]">{emptyMessage}</p>
              <Link href="/connect-ghl" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C9A227]">
                Manage GoHighLevel connections
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer hideConnectionLinks={hasConnectedLocations} />
    </div>
  );
}
