// ExecutiveTimeline.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Executive Timeline: chronological view of business events, decisions, and outcomes
// All data shapes designed to consume real GoHighLevel data once backend is live.
// GHL data: contact activity, opportunity history, conversation events, appointment records

import { useState } from "react";
import { Link } from "wouter";
import {
  Calendar, DollarSign, Users, MessageSquare, TrendingUp,
  CheckCircle2, AlertTriangle, Star, Zap, ArrowRight,
  ChevronDown, Filter, Clock
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
// When backend is live, replace with:
// GET /api/eeos/timeline?tenantId=xxx&from=ISO8601&to=ISO8601&categories=all

type TimelineCategory = "revenue" | "relationship" | "operations" | "milestone" | "alert";

interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  category: TimelineCategory;
  title: string;
  description: string;
  entity?: string;
  value?: string;
  outcome?: "positive" | "negative" | "neutral";
  ghlSource: string; // GHL data source
  tags: string[];
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "t1",
    date: "Today",
    time: "09:14 AM",
    category: "revenue",
    title: "Northstar Health Contract Closed",
    description: "Q3 staffing contract signed and activated. 12-month engagement with option to extend.",
    entity: "Northstar Health",
    value: "$128,000",
    outcome: "positive",
    ghlSource: "opportunity.status_changed → Won",
    tags: ["contract", "healthcare", "Q3"],
  },
  {
    id: "t2",
    date: "Today",
    time: "08:30 AM",
    category: "alert",
    title: "Cascade Partners Disengagement Detected",
    description: "EEOS flagged 67% drop in contact activity. No open opportunities. Renewal at risk.",
    entity: "Cascade Partners",
    value: "$72,000",
    outcome: "negative",
    ghlSource: "contact.last_activity_date + conversation.last_message_date",
    tags: ["at-risk", "retention", "alert"],
  },
  {
    id: "t3",
    date: "Yesterday",
    time: "03:45 PM",
    category: "relationship",
    title: "Discovery Call — Summit Logistics",
    description: "Initial discovery call completed. Strong fit identified for executive staffing needs. Proposal requested.",
    entity: "Summit Logistics",
    outcome: "positive",
    ghlSource: "appointment.completed",
    tags: ["new-prospect", "logistics"],
  },
  {
    id: "t4",
    date: "Yesterday",
    time: "11:20 AM",
    category: "revenue",
    title: "Invoice Paid — Meridian Group",
    description: "Invoice #INV-2847 paid in full. 8 days ahead of due date.",
    entity: "Meridian Group",
    value: "$21,500",
    outcome: "positive",
    ghlSource: "payment.received",
    tags: ["payment", "on-time"],
  },
  {
    id: "t5",
    date: "Yesterday",
    time: "09:00 AM",
    category: "alert",
    title: "Pipeline Velocity Drop — 14% Below Target",
    description: "3 proposals stalled for 14+ days. Combined value $340K. EEOS recommends immediate follow-up.",
    value: "$340,000",
    outcome: "negative",
    ghlSource: "opportunity.last_stage_change_date",
    tags: ["pipeline", "velocity", "alert"],
  },
  {
    id: "t6",
    date: "Jul 7",
    time: "02:15 PM",
    category: "milestone",
    title: "5-Star Review — Apex Industries",
    description: "'Exceptional placement quality and responsiveness. Best staffing partner we've worked with.'",
    entity: "Apex Industries",
    outcome: "positive",
    ghlSource: "reputation.review_received",
    tags: ["review", "reputation"],
  },
  {
    id: "t7",
    date: "Jul 7",
    time: "10:30 AM",
    category: "operations",
    title: "Recruiting Team Capacity Alert",
    description: "Department reached 92% utilization. 4 new requisitions pending. SLA risk in 6 days.",
    outcome: "negative",
    ghlSource: "user.task_count + calendar.booked_slots",
    tags: ["capacity", "operations", "alert"],
  },
  {
    id: "t8",
    date: "Jul 6",
    time: "04:00 PM",
    category: "revenue",
    title: "Opportunity Lost — Pacific Staffing Group",
    description: "Lost to competitor on pricing. Reason captured: 'Budget constraints, competitor offered 15% lower rate.'",
    entity: "Pacific Staffing Group",
    value: "$96,000",
    outcome: "negative",
    ghlSource: "opportunity.status_changed → Lost",
    tags: ["lost", "pricing", "competitive"],
  },
  {
    id: "t9",
    date: "Jul 6",
    time: "11:00 AM",
    category: "milestone",
    title: "EEOS Integration Activated",
    description: "GoHighLevel CRM connected. EEOS began processing signals and generating recommendations.",
    outcome: "positive",
    ghlSource: "system.integration_activated",
    tags: ["eeos", "integration", "milestone"],
  },
  {
    id: "t10",
    date: "Jul 5",
    time: "09:30 AM",
    category: "relationship",
    title: "Quarterly Business Review — Apex Industries",
    description: "QBR completed. Client satisfaction score: 94/100. Expansion opportunity identified for Q4.",
    entity: "Apex Industries",
    outcome: "positive",
    ghlSource: "appointment.completed + contact.updated",
    tags: ["QBR", "expansion", "healthcare"],
  },
];

const CATEGORY_CONFIG: Record<TimelineCategory, { color: string; bg: string; icon: any; label: string }> = {
  revenue: { color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: DollarSign, label: "Revenue" },
  relationship: { color: "#00D4C8", bg: "rgba(0,212,200,0.1)", icon: Users, label: "Relationship" },
  operations: { color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: TrendingUp, label: "Operations" },
  milestone: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: Star, label: "Milestone" },
  alert: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: AlertTriangle, label: "Alert" },
};

const OUTCOME_CONFIG = {
  positive: { color: "#10B981", label: "Positive" },
  negative: { color: "#EF4444", label: "Negative" },
  neutral: { color: "#6B7280", label: "Neutral" },
};

export default function ExecutiveTimeline() {
  const [activeFilter, setActiveFilter] = useState<TimelineCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeFilter === "all"
    ? TIMELINE_EVENTS
    : TIMELINE_EVENTS.filter((e) => e.category === activeFilter);

  // Group by date
  const grouped: Record<string, TimelineEvent[]> = {};
  filtered.forEach((event) => {
    if (!grouped[event.date]) grouped[event.date] = [];
    grouped[event.date].push(event);
  });

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#050C1A] scan-grid">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Executive Timeline</div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    DEMO DATA
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Executive Timeline
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1">
                  A chronological record of every significant business event, decision, and outcome.
                </p>
              </div>
              <Link href="/connect-ghl" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)] shrink-0 self-start" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <Zap className="w-4 h-4" />
                Connect GoHighLevel
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Filter */}
      <section className="py-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
            {(["all", "revenue", "relationship", "operations", "milestone", "alert"] as const).map((f) => {
              const count = f === "all" ? TIMELINE_EVENTS.length : TIMELINE_EVENTS.filter(e => e.category === f).length;
              const config = f !== "all" ? CATEGORY_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={activeFilter === f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 capitalize ${
                    activeFilter === f
                      ? "bg-[rgba(0,212,200,0.12)] text-[#00D4C8] border border-[rgba(0,212,200,0.3)]"
                      : "text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {config && <config.icon className="w-3.5 h-3.5" style={{ color: activeFilter === f ? "#00D4C8" : config.color }} />}
                  {f === "all" ? "All Events" : config?.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-[rgba(0,212,200,0.2)]" : "bg-[rgba(255,255,255,0.06)]"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {Object.entries(grouped).map(([date, events], groupIdx) => (
            <div key={date} className="mb-8">
              <AnimatedSection delay={groupIdx * 80}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)]">
                    <Calendar className="w-3.5 h-3.5 text-[#00D4C8]" />
                    <span className="text-sm font-bold text-[#00D4C8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{date}</span>
                  </div>
                  <div className="flex-1 h-px bg-[rgba(0,212,200,0.08)]" />
                  <span className="text-xs text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{events.length} event{events.length > 1 ? "s" : ""}</span>
                </div>
              </AnimatedSection>

              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-[rgba(0,212,200,0.1)]" aria-hidden="true" />

                <div className="space-y-3">
                  {events.map((event, eventIdx) => {
                    const cConfig = CATEGORY_CONFIG[event.category];
                    const oConfig = event.outcome ? OUTCOME_CONFIG[event.outcome] : null;
                    const isExpanded = expandedId === event.id;
                    const Icon = cConfig.icon;

                    return (
                      <AnimatedSection key={event.id} delay={groupIdx * 80 + eventIdx * 50}>
                        <div className="relative">
                          {/* Timeline dot */}
                          <div
                            className="absolute -left-6 top-5 w-4 h-4 rounded-full border-2 border-[#050C1A] flex items-center justify-center"
                            style={{ background: cConfig.color }}
                            aria-hidden="true"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#050C1A]" />
                          </div>

                          <button
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:border-[rgba(0,212,200,0.2)] ${
                              isExpanded ? "border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.04)]" : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
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
                                  <span className="text-sm font-semibold text-[#E8EDF5]">{event.title}</span>
                                  {event.entity && (
                                    <span className="text-xs text-[#E8EDF5]/40">· {event.entity}</span>
                                  )}
                                </div>
                                <p className="text-xs text-[#E8EDF5]/55 leading-relaxed">{event.description}</p>

                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-3">
                                    {/* Outcome badge */}
                                    {oConfig && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: oConfig.color }} />
                                        <span className="text-xs font-semibold" style={{ color: oConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>{oConfig.label.toUpperCase()}</span>
                                      </div>
                                    )}
                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {event.tags.map((tag) => (
                                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[#E8EDF5]/50 border border-[rgba(255,255,255,0.08)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                    {/* Source provenance */}
                                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[rgba(0,212,200,0.04)] border border-[rgba(0,212,200,0.1)]">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] mt-1 shrink-0" />
                                      <div>
                                        <div className="text-[10px] font-bold text-[#00D4C8] mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DATA SOURCE</div>
                                        <div className="text-[10px] text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{event.ghlSource}</div>
                                        <div className="text-[10px] text-[#E8EDF5]/30 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Read-only · Approved signal type · Not stored</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {event.value && (
                                  <span className="text-sm font-bold" style={{ color: oConfig?.color || "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
                                    {event.value}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-[#E8EDF5]/30">
                                  <Clock className="w-3 h-3" />
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{event.time}</span>
                                </div>
                                {oConfig && (
                                  <div className="w-2 h-2 rounded-full" style={{ background: oConfig.color }} title={oConfig.label} />
                                )}
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

          {/* Empty State */}
          {filtered.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Calendar className="w-12 h-12 text-[#E8EDF5]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#E8EDF5]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No events in this category</h3>
                <p className="text-sm text-[#E8EDF5]/30">Connect GoHighLevel to populate your timeline with real business events.</p>
                <Link href="/connect-ghl" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
