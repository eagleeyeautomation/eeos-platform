/**
 * EEOS — Live Signal Feed (Signal Pipeline Layer)
 *
 * Displays real-time GHL webhook events processed by the EEOS Signal Pipeline.
 * Every signal is a raw input to the Intelligence Engine.
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity, Zap, Users, DollarSign, MessageSquare,
  Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  RefreshCw, Filter, Clock, Loader2, Building2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { useOwnerConnectionState } from "@/hooks/useOwnerConnectionState";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "contact.created": Users,
  "contact.updated": Users,
  "opportunity.created": DollarSign,
  "opportunity.status_changed": TrendingUp,
  "opportunity.won": CheckCircle2,
  "opportunity.lost": TrendingDown,
  "conversation.message_received": MessageSquare,
  "conversation.message_sent": MessageSquare,
  "appointment.booked": Calendar,
  "appointment.cancelled": Calendar,
  "payment.received": DollarSign,
  "task.completed": CheckCircle2,
  "review.received": CheckCircle2,
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  positive: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  neutral: { color: "#C9A227", bg: "rgba(201,162,39,0.06)", border: "rgba(201,162,39,0.15)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

function severityFromSignalType(signalType: string): string {
  if (["opportunity.status_changed", "payment.received", "appointment.completed", "task.completed"].includes(signalType)) return "positive";
  if (["opportunity.deleted"].includes(signalType)) return "critical";
  if (["appointment.cancelled", "conversation.message_received"].includes(signalType)) return "warning";
  return "neutral";
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function titleFromSignalType(signalType: string): string {
  return signalType
    .replace(".", " — ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveSignals() {
  const { subaccounts, hasConnectedLocations, connectionsLoading } = useOwnerConnectionState();
  const [filter, setFilter] = useState<string>("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [hours, setHours] = useState(24);

  // Auto-select first subaccount
  useEffect(() => {
    if (subaccounts.length > 0 && !selectedTenantId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [subaccounts, selectedTenantId]);

  const tenantId = selectedTenantId || subaccounts[0]?.ghlLocationId || "";

  // Load live signals
  const { data: signals = [], isLoading, refetch, isFetching } = trpc.signals.recent.useQuery(
    { tenantId, hours },
    { enabled: !!tenantId, refetchInterval: 30_000 }
  );

  const filtered = filter === "all"
    ? signals
    : signals.filter(s => severityFromSignalType(s.signalType) === filter);

  // Stats derived from live data
  const positiveCount = signals.filter(s => severityFromSignalType(s.signalType) === "positive").length;
  const warningCount = signals.filter(s => severityFromSignalType(s.signalType) === "warning").length;
  const criticalCount = signals.filter(s => severityFromSignalType(s.signalType) === "critical").length;

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Signal Pipeline</div>
                  {signals.length > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      LIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      AWAITING SIGNALS
                    </div>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Live Signal Feed
                </h1>
                <p className="text-sm text-[#FFFFFF]/50 mt-1 max-w-xl">
                  Every signal is a raw GoHighLevel event processed by the EEOS Signal Pipeline — the input layer for the Intelligence Engine.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                {!hasConnectedLocations && (
                  <Link
                    href="/connect-ghl"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <Zap className="w-4 h-4" />
                    Connect GHL
                  </Link>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Subaccount Selector */}
      {subaccounts.length > 1 && (
        <section className="py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {subaccounts.map((sub) => (
                <button
                  key={sub.ghlLocationId}
                  onClick={() => setSelectedTenantId(sub.ghlLocationId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    tenantId === sub.ghlLocationId
                      ? "bg-[rgba(201,162,39,0.12)] text-[#C9A227] border border-[rgba(201,162,39,0.3)]"
                      : "text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: `Signals (${hours}h)`, value: signals.length.toString(), color: "#C9A227", icon: Activity },
                { label: "Positive Events", value: positiveCount.toString(), color: "#10B981", icon: CheckCircle2 },
                { label: "Warnings", value: warningCount.toString(), color: "#F59E0B", icon: AlertTriangle },
                { label: "Critical", value: criticalCount.toString(), color: "#EF4444", icon: AlertTriangle },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-[10px] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {stat.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Time Range + Filter Bar */}
      <section className="py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* Time range */}
            <div className="flex items-center gap-1">
              {[6, 24, 48, 168].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    hours === h
                      ? "bg-[rgba(201,162,39,0.12)] text-[#C9A227] border border-[rgba(201,162,39,0.3)]"
                      : "text-[#FFFFFF]/40 hover:text-[#FFFFFF]/70 border border-transparent"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {h < 24 ? `${h}h` : h === 24 ? "24h" : h === 48 ? "2d" : "7d"}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

            {/* Severity filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#FFFFFF]/30" />
              {(["all", "positive", "neutral", "warning", "critical"] as const).map((f) => {
                const count = f === "all" ? signals.length : signals.filter(s => severityFromSignalType(s.signalType) === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 capitalize ${
                      filter === f
                        ? "bg-[rgba(201,162,39,0.12)] text-[#C9A227] border border-[rgba(201,162,39,0.3)]"
                        : "text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {f === "all" ? `All (${count})` : `${f} (${count})`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Signal Feed */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Loading */}
          {(isLoading || connectionsLoading) && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
            </div>
          )}

          {/* No tenant */}
          {!tenantId && !isLoading && !connectionsLoading && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Activity className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No GoHighLevel subaccounts connected
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-6">
                  Connect your GoHighLevel subaccounts to stream real business signals.
                </p>
                <Link
                  href="/connect-ghl"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
              </div>
            </AnimatedSection>
          )}

          {/* Empty state — connected but no signals */}
          {tenantId && !isLoading && signals.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Activity className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No signals in the last {hours < 24 ? `${hours} hours` : hours === 24 ? "24 hours" : hours === 48 ? "2 days" : "7 days"}
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-4">
                  Signals appear here when GoHighLevel sends webhook events to EEOS.
                </p>
                <p className="text-xs text-[#FFFFFF]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Webhook endpoint: POST /api/ghl/webhook
                </p>
              </div>
            </AnimatedSection>
          )}

          {/* Live signals */}
          {!isLoading && filtered.length > 0 && (
            <div className="space-y-2" role="list">
              {filtered.map((signal, i) => {
                const severity = severityFromSignalType(signal.signalType);
                const sConfig = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.neutral;
                const Icon = SIGNAL_ICONS[signal.signalType] ?? Activity;
                const payload = signal.rawPayload as Record<string, unknown> | null;
                const contactName = (payload?.contact as Record<string, unknown>)?.name as string | undefined;
                const opportunityName = (payload?.opportunity as Record<string, unknown>)?.name as string | undefined;
                const entityName = contactName ?? opportunityName ?? "";

                return (
                  <AnimatedSection key={signal.id} delay={i * 30}>
                    <div
                      className="flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-[rgba(201,162,39,0.2)]"
                      style={{ background: sConfig.bg, borderColor: sConfig.border }}
                      role="listitem"
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${sConfig.color}18` }}>
                        <Icon className="w-4 h-4" style={{ color: sConfig.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-[#FFFFFF]">
                            {titleFromSignalType(signal.signalType)}
                          </span>
                          {!signal.processed && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.2)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              UNPROCESSED
                            </span>
                          )}
                          {signal.processingError && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#EF4444]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              ERROR
                            </span>
                          )}
                        </div>
                        {entityName && (
                          <p className="text-sm text-[#FFFFFF]/60 leading-snug">{entityName}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            GoHighLevel
                          </span>
                          {signal.sourceEventId && (
                            <span className="text-[10px] text-[#FFFFFF]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {signal.sourceEventId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 text-[10px] text-[#FFFFFF]/35">
                          <Clock className="w-3 h-3" />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {timeAgo(signal.receivedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          )}

          {/* No results for filter */}
          {tenantId && !isLoading && signals.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <p className="text-sm text-[#FFFFFF]/40">No "{filter}" signals in this time range.</p>
              <button onClick={() => setFilter("all")} className="mt-3 text-xs text-[#C9A227] hover:text-[#D8B84A] transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Show all →
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer hideConnectionLinks={hasConnectedLocations} />
    </div>
  );
}
