import {
  Activity,
  AlertCircle,
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  GitBranch,
  HeartPulse,
  Lightbulb,
  Loader2,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import OrganizationWelcomeBanner from "@/components/OrganizationWelcomeBanner";
import { trpc } from "@/lib/trpc";
import { useOwnerConnectionState } from "@/hooks/useOwnerConnectionState";
import { useEffect, useMemo, useState } from "react";

type OwnerCommandCenterMode = "overview" | "business-health" | "recommendations" | "timeline" | "knowledge-graph";

export type OwnerCommandCenterProps = {
  mode?: OwnerCommandCenterMode;
};

function formatDate(value?: string | Date | null) {
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

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function scoreTone(score?: number | null) {
  if (typeof score !== "number") return "text-[#FFFFFF]/55 border-[rgba(255,255,255,0.12)]";
  if (score >= 80) return "text-[#34D399] border-[#10B981]/30";
  if (score >= 60) return "text-[#C9A227] border-[#C9A227]/35";
  return "text-[#FCA5A5] border-red-500/30";
}

function pageCopy(mode: OwnerCommandCenterMode) {
  const copy = {
    overview: {
      eyebrow: "Owner Command Center",
      title: "Executive Home",
      description: "A truthful operating view built from authenticated EEOS data and synchronized GoHighLevel activity.",
    },
    "business-health": {
      eyebrow: "Business Health",
      title: "Business Health",
      description: "Verified health and business-memory signals from connected GoHighLevel locations.",
    },
    recommendations: {
      eyebrow: "AI Recommendations",
      title: "AI Recommendations",
      description: "Decision support generated only from verified business signals.",
    },
    timeline: {
      eyebrow: "Executive Timeline",
      title: "Executive Timeline",
      description: "Chronological business activity produced by synchronized source events.",
    },
    "knowledge-graph": {
      eyebrow: "Knowledge Graph",
      title: "Knowledge Graph",
      description: "Verified business entities and relationships extracted from connected activity.",
    },
  } satisfies Record<OwnerCommandCenterMode, { eyebrow: string; title: string; description: string }>;
  return copy[mode];
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-6 text-center">
      <Database className="mx-auto h-8 w-8 text-[#C9A227]" />
      <h3 className="mt-4 text-lg font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#FFFFFF]/55">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(201,162,39,0.12)] bg-[rgba(255,255,255,0.035)] p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#FFFFFF]/38" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-[#FFFFFF]/45">{detail}</div> : null}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[rgba(201,162,39,0.12)] bg-[#141414] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(201,162,39,0.22)] bg-[rgba(201,162,39,0.08)]">
          <Icon className="h-5 w-5 text-[#C9A227]" />
        </div>
        <h2 className="text-xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ConnectAction() {
  return (
    <Link
      href="/connect-ghl"
      className="inline-flex items-center justify-center rounded-xl bg-[#C9A227] px-4 py-2.5 text-sm font-bold text-[#0B0B0B] transition hover:bg-[#D8B84A]"
    >
      Manage GoHighLevel Connections
    </Link>
  );
}

export default function OwnerCommandCenter({ mode = "overview" }: OwnerCommandCenterProps) {
  const ownerState = useOwnerConnectionState();
  const { user, subaccounts, connectedConnections, connectionsLoading, connectionsError, hasConnectedLocations } = ownerState;
  const [selectedTenantId, setSelectedTenantId] = useState("");

  useEffect(() => {
    if (!selectedTenantId && subaccounts[0]?.ghlLocationId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [selectedTenantId, subaccounts]);

  const tenantId = selectedTenantId || subaccounts[0]?.ghlLocationId || "";
  const activeLocation = subaccounts.find((subaccount) => subaccount.ghlLocationId === tenantId);

  const memoryQuery = trpc.memory.get.useQuery({ tenantId }, { enabled: Boolean(tenantId), retry: false, refetchInterval: 60000 });
  const recommendationsQuery = trpc.recommendations.list.useQuery({ tenantId }, { enabled: Boolean(tenantId), retry: false, refetchInterval: 120000 });
  const timelineQuery = trpc.timeline.list.useQuery({ tenantId, limit: mode === "overview" ? 6 : 50 }, { enabled: Boolean(tenantId), retry: false, refetchInterval: 60000 });
  const graphQuery = trpc.knowledgeGraph.get.useQuery({ tenantId }, { enabled: Boolean(tenantId), retry: false, refetchInterval: 120000 });

  const memory = memoryQuery.data;
  const recommendations = recommendationsQuery.data ?? [];
  const timelineEvents = timelineQuery.data ?? [];
  const graphNodes = graphQuery.data?.nodes ?? [];
  const graphEdges = graphQuery.data?.edges ?? [];
  const copy = pageCopy(mode);

  const briefingLines = useMemo(() => {
    if (connectionsLoading) return ["EEOS is checking authenticated owner access and persisted GoHighLevel connections."];
    if (connectionsError) return ["EEOS could not load GoHighLevel connection status for this owner session."];
    if (!hasConnectedLocations) return ["No active GoHighLevel location is connected for this owner account yet."];

    const lines = [`EEOS verified ${connectedConnections.length} connected GoHighLevel location${connectedConnections.length === 1 ? "" : "s"} for this owner account.`];
    if (activeLocation?.name) lines.push(`The selected operating location is ${activeLocation.name}.`);
    if (memory) {
      if (typeof memory.healthScore === "number") lines.push(`Business Health is currently recorded as ${memory.healthScore}/100.`);
      if (typeof memory.totalContacts === "number") lines.push(`${memory.totalContacts.toLocaleString()} contacts are reflected in business memory.`);
      if (typeof memory.activeOpportunities === "number") lines.push(`${memory.activeOpportunities.toLocaleString()} active opportunities are reflected in business memory.`);
      if (memory.lastSignalAt) lines.push(`The latest processed signal was recorded ${formatDate(memory.lastSignalAt)}.`);
    } else {
      lines.push("No business-memory snapshot has been synchronized for this location yet.");
    }
    if (recommendations.length > 0) {
      lines.push(`${recommendations.length} active AI recommendation${recommendations.length === 1 ? "" : "s"} are available for review.`);
    } else {
      lines.push("No AI recommendations have been generated from verified activity yet.");
    }
    if (timelineEvents.length > 0) {
      lines.push(`${timelineEvents.length} recent timeline event${timelineEvents.length === 1 ? "" : "s"} are available.`);
    } else {
      lines.push("No executive timeline events have been recorded for this location yet.");
    }
    return lines;
  }, [activeLocation?.name, connectedConnections.length, connectionsError, connectionsLoading, hasConnectedLocations, memory, recommendations.length, timelineEvents.length]);

  const showConnectionGate = !connectionsLoading && !connectionsError && !hasConnectedLocations;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <OrganizationWelcomeBanner />
        <section className="rounded-3xl border border-[rgba(201,162,39,0.16)] bg-[#141414] p-6 sm:p-8">
          <div className="section-label mb-3">{copy.eyebrow}</div>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {copy.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#FFFFFF]/55">{copy.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {subaccounts.length > 1 ? (
                <select
                  value={tenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                  className="h-11 rounded-xl border border-[rgba(201,162,39,0.24)] bg-[#0B0B0B] px-3 text-sm text-[#FFFFFF] outline-none"
                >
                  {subaccounts.map((subaccount) => (
                    <option key={subaccount.ghlLocationId} value={subaccount.ghlLocationId}>{subaccount.name}</option>
                  ))}
                </select>
              ) : null}
              <span className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${
                hasConnectedLocations ? "border-[#10B981]/25 text-[#34D399]" : "border-[#C9A227]/30 text-[#C9A227]"
              }`}>
                {hasConnectedLocations ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {connectionsLoading ? "Checking" : hasConnectedLocations ? "Connected" : "Setup Needed"}
              </span>
            </div>
          </div>
        </section>

        {connectionsError ? (
          <section className="mt-6">
            <EmptyState title="Connection status unavailable" message={connectionsError} />
          </section>
        ) : null}

        {showConnectionGate ? (
          <section className="mt-6">
            <EmptyState
              title="Connect GoHighLevel to activate the Owner Command Center"
              message="EEOS has not found an active persisted GoHighLevel connection for this owner account. Once connected, this command center will populate only with verified business data."
              action={<ConnectAction />}
            />
          </section>
        ) : null}

        {connectionsLoading ? (
          <section className="mt-6 rounded-3xl border border-[rgba(201,162,39,0.12)] bg-[#141414] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#C9A227]" />
            <p className="mt-4 text-sm text-[#FFFFFF]/55">Loading authenticated owner data...</p>
          </section>
        ) : null}

        {!connectionsLoading && hasConnectedLocations ? (
          <div className="mt-6 space-y-6">
            {(mode === "overview") ? (
              <SectionCard title="Executive Briefing" icon={Sparkles}>
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
                  <p className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Good day{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-[#FFFFFF]/60">
                    {briefingLines.map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A227]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            ) : null}

            {(mode === "overview" || mode === "business-health") ? (
              <SectionCard title="Business Health" icon={HeartPulse}>
                {memoryQuery.isLoading ? (
                  <EmptyState title="Loading business health" message="EEOS is checking for a verified business-memory snapshot." />
                ) : memory ? (
                  <div className="space-y-5">
                    <div className={`inline-flex rounded-2xl border px-5 py-4 ${scoreTone(memory.healthScore)}`}>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Business Health</div>
                        <div className="mt-1 text-4xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{memory.healthScore ?? "N/A"}</div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <MetricCard label="Pipeline Value" value={formatCurrency(memory.totalPipelineValue)} />
                      <MetricCard label="Active Opportunities" value={memory.activeOpportunities ?? "Not available"} />
                      <MetricCard label="Contacts" value={memory.totalContacts ?? "Not available"} />
                      <MetricCard label="Last Signal" value={formatDate(memory.lastSignalAt)} />
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Business health is not available yet" message="This section will populate after EEOS receives enough verified activity to create a business-memory snapshot." />
                )}
              </SectionCard>
            ) : null}

            {(mode === "overview" || mode === "recommendations") ? (
              <SectionCard title="AI Recommendations" icon={Lightbulb}>
                {recommendationsQuery.isLoading ? (
                  <EmptyState title="Loading recommendations" message="EEOS is checking the Intelligence Engine output for this location." />
                ) : recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.slice(0, mode === "overview" ? 3 : 25).map((recommendation) => (
                      <div key={recommendation.id} className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-[#FFFFFF]">{recommendation.title}</h3>
                          <span className="rounded-full border border-[rgba(201,162,39,0.28)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#C9A227]">{recommendation.priority}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#FFFFFF]/55">{recommendation.recommendedAction}</p>
                        <div className="mt-3 text-xs text-[#FFFFFF]/40">Risk: {recommendation.riskLevel} · Confidence: {recommendation.confidenceScore}%</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No AI recommendations generated yet" message="EEOS will show recommendations only after verified trends, risks, or opportunities exist for this business location." />
                )}
              </SectionCard>
            ) : null}

            {(mode === "overview" || mode === "timeline") ? (
              <SectionCard title="Executive Timeline" icon={Clock}>
                {timelineQuery.isLoading ? (
                  <EmptyState title="Loading timeline" message="EEOS is checking for verified business activity." />
                ) : timelineEvents.length > 0 ? (
                  <div className="space-y-3">
                    {timelineEvents.map((event) => (
                      <div key={event.id} className="flex gap-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#C9A227]" />
                        <div>
                          <div className="text-sm font-semibold text-[#FFFFFF]">{event.title}</div>
                          <div className="mt-1 text-xs text-[#FFFFFF]/40">{event.eventType} · {formatDate(event.occurredAt)}</div>
                          {event.description ? <p className="mt-2 text-sm leading-6 text-[#FFFFFF]/55">{event.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No timeline events available yet" message="Timeline activity will appear after EEOS receives and processes verified business events from connected systems." />
                )}
              </SectionCard>
            ) : null}

            {(mode === "overview" || mode === "knowledge-graph") ? (
              <SectionCard title="Knowledge Graph" icon={Network}>
                {graphQuery.isLoading ? (
                  <EmptyState title="Loading knowledge graph" message="EEOS is checking for verified entity and relationship records." />
                ) : graphNodes.length > 0 ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Entities" value={graphNodes.length} />
                      <MetricCard label="Relationships" value={graphEdges.length} />
                      <MetricCard label="Selected Location" value={activeLocation?.name ?? "GoHighLevel Location"} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {graphNodes.slice(0, mode === "overview" ? 4 : 20).map((node) => (
                        <div key={node.id} className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
                          <div className="flex items-start gap-3">
                            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A227]" />
                            <div>
                              <div className="text-sm font-semibold text-[#FFFFFF]">{node.label ?? node.externalId}</div>
                              <div className="mt-1 text-xs text-[#FFFFFF]/40">{node.nodeType} · Signals: {node.signalCount ?? 0}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState title="No knowledge graph available yet" message="The knowledge graph will populate after synchronized business activity creates verified entities and relationships." />
                )}
              </SectionCard>
            ) : null}

            {mode === "overview" ? (
              <section className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Connected Locations" value={connectedConnections.length} detail="Persisted GoHighLevel connections" />
                <MetricCard label="Timeline Events" value={timelineEvents.length} detail="Returned for selected location" />
                <MetricCard label="Graph Entities" value={graphNodes.length} detail="Returned for selected location" />
              </section>
            ) : null}
          </div>
        ) : null}
      </main>

      <Footer hideConnectionLinks={hasConnectedLocations} />
    </div>
  );
}
