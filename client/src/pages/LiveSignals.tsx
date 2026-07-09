// LiveSignals.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Live Signals: real-time signal feed from connected business systems
// All data shapes designed to consume real GoHighLevel data once backend is live.
// GHL webhook events: contact.created, opportunity.status_changed, conversation.message_received, etc.

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity, Zap, ArrowRight, Users, DollarSign, MessageSquare,
  Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  RefreshCw, Filter, Eye, Clock
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
// When backend is live, replace with WebSocket or SSE stream:
// WS /api/ghl/signals/stream?tenantId=xxx
// or GET /api/ghl/signals?tenantId=xxx&since=ISO8601&limit=50

type SignalType =
  | "contact.created"
  | "contact.updated"
  | "opportunity.created"
  | "opportunity.status_changed"
  | "opportunity.won"
  | "opportunity.lost"
  | "conversation.message_received"
  | "conversation.message_sent"
  | "appointment.booked"
  | "appointment.cancelled"
  | "payment.received"
  | "task.completed"
  | "review.received";

type SignalSeverity = "positive" | "neutral" | "warning" | "critical";

interface Signal {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  title: string;
  description: string;
  source: string; // GHL sub-account or integration name
  entity: string; // contact name, opportunity name, etc.
  value?: string; // monetary value if applicable
  timestamp: string;
  ghlEventId: string; // GHL webhook event ID placeholder
  processed: boolean;
}

const SIGNAL_FEED: Signal[] = [
  {
    id: "s1",
    type: "opportunity.won",
    severity: "positive",
    title: "Opportunity Won",
    description: "Northstar Health — Q3 Staffing Contract closed successfully",
    source: "GoHighLevel CRM",
    entity: "Northstar Health",
    value: "$128,000",
    timestamp: "2 min ago",
    ghlEventId: "ghl_evt_001",
    processed: true,
  },
  {
    id: "s2",
    type: "contact.created",
    severity: "neutral",
    title: "New Contact",
    description: "Sarah Mitchell added to pipeline — Director of HR, Apex Industries",
    source: "GoHighLevel CRM",
    entity: "Sarah Mitchell",
    timestamp: "8 min ago",
    ghlEventId: "ghl_evt_002",
    processed: true,
  },
  {
    id: "s3",
    type: "conversation.message_received",
    severity: "warning",
    title: "Unread Message — At-Risk Account",
    description: "Cascade Partners: 'We need to discuss our contract renewal terms'",
    source: "GoHighLevel Conversations",
    entity: "Cascade Partners",
    timestamp: "14 min ago",
    ghlEventId: "ghl_evt_003",
    processed: false,
  },
  {
    id: "s4",
    type: "appointment.booked",
    severity: "positive",
    title: "Discovery Call Booked",
    description: "Summit Logistics — Initial discovery call scheduled for Thursday 2PM",
    source: "GoHighLevel Calendar",
    entity: "Summit Logistics",
    timestamp: "31 min ago",
    ghlEventId: "ghl_evt_004",
    processed: true,
  },
  {
    id: "s5",
    type: "opportunity.status_changed",
    severity: "warning",
    title: "Pipeline Stage Change",
    description: "Vertex Solutions moved from Proposal to Negotiation — 22 days in stage",
    source: "GoHighLevel CRM",
    entity: "Vertex Solutions",
    value: "$54,000",
    timestamp: "45 min ago",
    ghlEventId: "ghl_evt_005",
    processed: true,
  },
  {
    id: "s6",
    type: "payment.received",
    severity: "positive",
    title: "Payment Received",
    description: "Meridian Group — Invoice #INV-2847 paid in full",
    source: "GoHighLevel Payments",
    entity: "Meridian Group",
    value: "$21,500",
    timestamp: "1 hr ago",
    ghlEventId: "ghl_evt_006",
    processed: true,
  },
  {
    id: "s7",
    type: "opportunity.lost",
    severity: "critical",
    title: "Opportunity Lost",
    description: "Pacific Staffing Group — Selected competitor. Reason: pricing",
    source: "GoHighLevel CRM",
    entity: "Pacific Staffing Group",
    value: "$96,000",
    timestamp: "2 hr ago",
    ghlEventId: "ghl_evt_007",
    processed: true,
  },
  {
    id: "s8",
    type: "review.received",
    severity: "positive",
    title: "5-Star Review Received",
    description: "Apex Industries left a 5-star Google review — 'Exceptional placement quality'",
    source: "GoHighLevel Reviews",
    entity: "Apex Industries",
    timestamp: "3 hr ago",
    ghlEventId: "ghl_evt_008",
    processed: true,
  },
  {
    id: "s9",
    type: "task.completed",
    severity: "neutral",
    title: "Follow-up Task Completed",
    description: "Account rep completed 30-day check-in with Northstar Health",
    source: "GoHighLevel Tasks",
    entity: "Northstar Health",
    timestamp: "4 hr ago",
    ghlEventId: "ghl_evt_009",
    processed: true,
  },
  {
    id: "s10",
    type: "appointment.cancelled",
    severity: "warning",
    title: "Appointment Cancelled",
    description: "Cascade Partners cancelled renewal review meeting — no reschedule",
    source: "GoHighLevel Calendar",
    entity: "Cascade Partners",
    timestamp: "5 hr ago",
    ghlEventId: "ghl_evt_010",
    processed: true,
  },
];

const SIGNAL_ICONS: Record<SignalType, any> = {
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

const SEVERITY_CONFIG = {
  positive: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  neutral: { color: "#00D4C8", bg: "rgba(0,212,200,0.06)", border: "rgba(0,212,200,0.15)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

const SIGNAL_STATS = [
  { label: "Signals Today", value: "47", change: "+12 vs yesterday", color: "#00D4C8", icon: Activity },
  { label: "Positive Events", value: "31", change: "66% of total", color: "#10B981", icon: TrendingUp },
  { label: "Warnings", value: "8", change: "Requires attention", color: "#F59E0B", icon: AlertTriangle },
  { label: "Revenue Signals", value: "$149.5K", change: "Won + received today", color: "#7C3AED", icon: DollarSign },
];

export default function LiveSignals() {
  const [filter, setFilter] = useState<SignalSeverity | "all">("all");
  const [pulseCount, setPulseCount] = useState(0);

  // Simulate live signal counter incrementing
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount((c) => c + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? SIGNAL_FEED : SIGNAL_FEED.filter((s) => s.severity === filter);

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Live Signals</div>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    DEMO DATA
                  </div>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    STREAM ACTIVE
                  </div>
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Live Signal Feed
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1">
                  Real-time events from GoHighLevel — contacts, pipeline, conversations, payments, and appointments.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  aria-label="Refresh signal feed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SIGNAL_STATS.map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-[10px] text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {stat.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#E8EDF5]/40 mt-0.5">{stat.change}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-4 h-4 text-[#E8EDF5]/30 shrink-0" aria-hidden="true" />
            {(["all", "positive", "neutral", "warning", "critical"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 capitalize ${
                  filter === f
                    ? "bg-[rgba(0,212,200,0.12)] text-[#00D4C8] border border-[rgba(0,212,200,0.3)]"
                    : "text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {f === "all" ? `All (${SIGNAL_FEED.length})` : `${f} (${SIGNAL_FEED.filter(s => s.severity === f).length})`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Signal Feed */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            {filtered.map((signal, i) => {
              const Icon = SIGNAL_ICONS[signal.type];
              const sConfig = SEVERITY_CONFIG[signal.severity];

              return (
                <AnimatedSection key={signal.id} delay={i * 40}>
                  <div
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-[rgba(0,212,200,0.2)] ${
                      !signal.processed ? "ring-1 ring-[rgba(245,158,11,0.3)]" : ""
                    }`}
                    style={{ background: sConfig.bg, borderColor: sConfig.border }}
                    role="listitem"
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${sConfig.color}18` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: sConfig.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[#E8EDF5]">{signal.title}</span>
                        {!signal.processed && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.2)] text-[#F59E0B]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            UNREAD
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#E8EDF5]/60 leading-snug">{signal.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span
                          className="text-[10px] text-[#E8EDF5]/35"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {signal.source}
                        </span>
                        <span
                          className="text-[10px] text-[#E8EDF5]/25"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {signal.ghlEventId}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {signal.value && (
                        <span className="text-sm font-bold" style={{ color: sConfig.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {signal.value}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-[#E8EDF5]/35">
                        <Clock className="w-3 h-3" />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{signal.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

          {/* GHL Connection Prompt */}
          <AnimatedSection delay={400}>
            <div className="mt-8 p-6 rounded-2xl border border-dashed border-[rgba(0,212,200,0.2)] text-center">
              <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,200,0.08)] flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-[#00D4C8]/50" />
              </div>
              <h3 className="text-base font-semibold text-[#E8EDF5]/50 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Live signals from your GoHighLevel account appear here
              </h3>
              <p className="text-sm text-[#E8EDF5]/30 mb-4">
                Connect GoHighLevel to stream real contact, pipeline, and conversation events in real time.
              </p>
              <Link
                href="/connect-ghl"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-4 h-4" />
                Connect GoHighLevel
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
