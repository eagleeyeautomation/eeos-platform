/**
 * EEOS — Executive Timeline (Business Memory Layer)
 *
 * Chronological record of every significant business event, decision, and outcome.
 * Populated by the EEOS Signal Pipeline from GoHighLevel webhook events.
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Calendar, DollarSign, Users, MessageSquare, TrendingUp,
  CheckCircle2, AlertTriangle, Star, Zap,
  Clock, Loader2, Building2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { useOwnerConnectionState } from "@/hooks/useOwnerConnectionState";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

type TimelineCategory = "revenue" | "relationship" | "operations" | "milestone" | "alert";

// Map eventType prefixes to visual config
const EVENT_CONFIG: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string }> = {
  "opportunity": { color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: DollarSign, label: "Revenue" },
  "contact": { color: "#C9A227", bg: "rgba(201,162,39,0.1)", icon: Users, label: "Relationship" },
  "appointment": { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: TrendingUp, label: "Operations" },
  "payment": { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: Star, label: "Milestone" },
  "conversation": { color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: MessageSquare, label: "Alert" },
  "default": { color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: CheckCircle2, label: "Event" },
};

function getEventConfig(eventType: string) {
  const prefix = eventType.split(".")[0];
  return EVENT_CONFIG[prefix] ?? EVENT_CONFIG.default;
}

function getSignificanceConfig(significance: string | null) {
  if (significance === "critical") return { color: "#EF4444", label: "Critical" };
  if (significance === "high") return { color: "#F59E0B", label: "High Impact" };
  if (significance === "medium") return { color: "#C9A227", label: "Medium" };
  return { color: "#6B7280", label: "Low" };
}

function formatDateLabel(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExecutiveTimeline() {
  const { subaccounts, hasConnectedLocations, connectionsLoading } = useOwnerConnectionState();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Auto-select first subaccount
  useEffect(() => {
    if (subaccounts.length > 0 && !selectedTenantId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [subaccounts, selectedTenantId]);

  const tenantId = selectedTenantId || subaccounts[0]?.ghlLocationId || "";

  // Load live timeline events
  const { data: events = [], isLoading } = trpc.timeline.list.useQuery(
    { tenantId, limit: 50 },
    { enabled: !!tenantId }
  );

  const filtered = activeFilter === "all"
    ? events
    : events.filter(e => e.eventType.startsWith(activeFilter + "."));

  // Group by date label
  const grouped: Record<string, typeof events> = {};
  filtered.forEach((event) => {
    const label = formatDateLabel(event.occurredAt);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(event);
  });

  const eventPrefixes = Array.from(new Set(events.map(e => e.eventType.split(".")[0])));

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#0B0B0B] scan-grid">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Business Memory</div>
                  {events.length > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      LIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      AWAITING DATA
                    </div>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Executive Timeline
                </h1>
                <p className="text-sm text-[#FFFFFF]/50 mt-1">
                  A chronological record of every significant business event, decision, and outcome.
                </p>
              </div>
              {!hasConnectedLocations && (
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)] shrink-0 self-start"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GHL
                </Link>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Subaccount Selector */}
      {subaccounts.length > 1 && (
        <section className="py-3">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Category Filter */}
      {events.length > 0 && (
        <section className="py-3">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
              {(["all", ...eventPrefixes] as string[]).map((f) => {
                const count = f === "all" ? events.length : events.filter(e => e.eventType.startsWith(f + ".")).length;
                const config = f !== "all" ? (EVENT_CONFIG[f] ?? EVENT_CONFIG.default) : null;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={activeFilter === f}
                    onClick={() => setActiveFilter(f)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 capitalize ${
                      activeFilter === f
                        ? "bg-[rgba(201,162,39,0.12)] text-[#C9A227] border border-[rgba(201,162,39,0.3)]"
                        : "text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {config && <config.icon className="w-3.5 h-3.5" style={{ color: activeFilter === f ? "#C9A227" : config.color }} />}
                    {f === "all" ? "All Events" : (config?.label ?? f.charAt(0).toUpperCase() + f.slice(1))}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-[rgba(201,162,39,0.2)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

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
                <Calendar className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No GoHighLevel subaccounts connected
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-6">
                  Connect your GoHighLevel subaccounts to populate the Executive Timeline.
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

          {/* Empty state — connected but no events */}
          {tenantId && !isLoading && events.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Calendar className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No timeline events yet
                </h3>
                <p className="text-sm text-[#FFFFFF]/30">
                  Timeline events are created as GoHighLevel sends webhook signals to EEOS.
                </p>
              </div>
            </AnimatedSection>
          )}

          {/* Grouped timeline */}
          {!isLoading && Object.entries(grouped).map(([dateLabel, dateEvents], groupIdx) => (
            <div key={dateLabel} className="mb-8">
              <AnimatedSection delay={groupIdx * 80}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(201,162,39,0.08)] border border-[rgba(201,162,39,0.15)]">
                    <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span className="text-sm font-bold text-[#C9A227]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{dateLabel}</span>
                  </div>
                  <div className="flex-1 h-px bg-[rgba(201,162,39,0.08)]" />
                  <span className="text-xs text-[#FFFFFF]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {dateEvents.length} event{dateEvents.length > 1 ? "s" : ""}
                  </span>
                </div>
              </AnimatedSection>

              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-[rgba(201,162,39,0.1)]" aria-hidden="true" />
                <div className="space-y-3">
                  {dateEvents.map((event, eventIdx) => {
                    const cConfig = getEventConfig(event.eventType);
                    const sigConfig = getSignificanceConfig(event.significance);
                    const isExpanded = expandedId === event.id;
                    const Icon = cConfig.icon;
                    const metadata = event.metadata as Record<string, unknown> | null;

                    return (
                      <AnimatedSection key={event.id} delay={groupIdx * 80 + eventIdx * 50}>
                        <div className="relative">
                          {/* Timeline dot */}
                          <div
                            className="absolute -left-6 top-5 w-4 h-4 rounded-full border-2 border-[#0B0B0B] flex items-center justify-center"
                            style={{ background: cConfig.color }}
                            aria-hidden="true"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0B0B0B]" />
                          </div>

                          <button
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:border-[rgba(201,162,39,0.2)] ${
                              isExpanded ? "border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.04)]" : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                            }`}
                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cConfig.bg }}>
                                <Icon className="w-4 h-4" style={{ color: cConfig.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-[#FFFFFF]">{event.title}</span>
                                  {event.entityName && (
                                    <span className="text-xs text-[#FFFFFF]/40">· {event.entityName}</span>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-xs text-[#FFFFFF]/55 leading-relaxed">{event.description}</p>
                                )}

                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sigConfig.color }} />
                                        <span className="text-xs font-semibold" style={{ color: sigConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>
                                          {sigConfig.label.toUpperCase()}
                                        </span>
                                      </div>
                                    {event.businessImpact && (
                                      <p className="text-xs text-[#FFFFFF]/50 leading-relaxed">{event.businessImpact}</p>
                                    )}
                                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.1)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] mt-1 shrink-0" />
                                        <div>
                                          <div className="text-[10px] font-bold text-[#C9A227] mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EVENT TYPE</div>
                                          <div className="text-[10px] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{event.eventType}</div>
                                          <div className="text-[10px] text-[#FFFFFF]/30 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GoHighLevel · Read-only</div>
                                        </div>
                                      </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {metadata?.value != null && (
                                  <span className="text-sm font-bold text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    {typeof metadata.value === "number" ? `$${(metadata.value as number).toLocaleString()}` : String(metadata.value as string | number)}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-[#FFFFFF]/30">
                                  <Clock className="w-3 h-3" />
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(event.occurredAt)}</span>
                                </div>
                                <div className="w-2 h-2 rounded-full" style={{ background: sigConfig.color }} title={sigConfig.label} />
                              </div>
                            </div>
                          </button>
                        </div>
                      </AnimatedSection>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* No filter results */}
          {!isLoading && events.length > 0 && filtered.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Calendar className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No events in this category
                </h3>
                <button onClick={() => setActiveFilter("all")} className="mt-3 text-xs text-[#C9A227] hover:text-[#D8B84A] transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Show all →
                </button>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      <Footer hideConnectionLinks={hasConnectedLocations} />
    </div>
  );
}
