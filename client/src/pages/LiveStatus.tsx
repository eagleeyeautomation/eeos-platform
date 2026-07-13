// EEOS Live Integration Status Dashboard
// Real-time signal feed, connector health, data flow metrics
// Sovereign Night — aerospace command interface

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  ArrowRight, Plug, Database, Zap, Clock, TrendingUp,
  Signal, Wifi, WifiOff, MoreHorizontal, ChevronRight,
  Eye, Bell, ArrowUpRight
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  Tooltip, XAxis, YAxis, LineChart, Line
} from "recharts";

// ── DEMO DATA ──
const CONNECTORS = [
  {
    id: "ghl",
    name: "GoHighLevel CRM",
    type: "CRM",
    status: "operational" as const,
    lastSync: "47 sec ago",
    syncRate: "real-time",
    signalsToday: 2847,
    uptime: 99.97,
    latency: 42,
    dataPoints: ["Contacts", "Opportunities", "Pipelines", "Conversations", "Appointments"],
    icon: "GHL",
    color: "#00D4C8",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    type: "Finance",
    status: "operational" as const,
    lastSync: "3 min ago",
    syncRate: "every 5 min",
    signalsToday: 312,
    uptime: 99.91,
    latency: 128,
    dataPoints: ["Invoices", "Expenses", "P&L", "Cash Flow", "Payroll"],
    icon: "QB",
    color: "#10B981",
  },
  {
    id: "workforce",
    name: "Workforce Management",
    type: "Operations",
    status: "operational" as const,
    lastSync: "1 min ago",
    syncRate: "every 2 min",
    signalsToday: 1204,
    uptime: 99.84,
    latency: 67,
    dataPoints: ["Placements", "Schedules", "Utilization", "Compliance", "Timesheets"],
    icon: "WF",
    color: "#00D4C8",
  },
  {
    id: "analytics",
    name: "Business Analytics",
    type: "Intelligence",
    status: "degraded" as const,
    lastSync: "12 min ago",
    syncRate: "every 10 min",
    signalsToday: 89,
    uptime: 97.2,
    latency: 890,
    dataPoints: ["KPIs", "Benchmarks", "Forecasts", "Trends"],
    icon: "BA",
    color: "#F59E0B",
  },
  {
    id: "calendar",
    name: "Calendar & Scheduling",
    type: "Productivity",
    status: "operational" as const,
    lastSync: "8 sec ago",
    syncRate: "real-time",
    signalsToday: 156,
    uptime: 100,
    latency: 18,
    dataPoints: ["Meetings", "Tasks", "Reminders", "Availability"],
    icon: "CAL",
    color: "#10B981",
  },
  {
    id: "email",
    name: "Email Intelligence",
    type: "Communication",
    status: "offline" as const,
    lastSync: "2 hr ago",
    syncRate: "paused",
    signalsToday: 0,
    uptime: 0,
    latency: 0,
    dataPoints: ["Threads", "Sentiment", "Response Rates", "Key Contacts"],
    icon: "EM",
    color: "#EF4444",
  },
];

const SIGNAL_FEED = [
  { id: 1, time: "08:14:32", connector: "GoHighLevel", type: "opportunity", message: "Deal #GHL-4821 moved to Closed Won — $420,000", severity: "success" },
  { id: 2, time: "08:13:18", connector: "Workforce", type: "alert", message: "Utilization drop detected: Southeast region at 67%", severity: "warning" },
  { id: 3, time: "08:12:44", connector: "GoHighLevel", type: "contact", message: "847 contact records updated from morning campaign", severity: "info" },
  { id: 4, time: "08:11:02", connector: "QuickBooks", type: "finance", message: "Invoice #QB-8821 overdue — $62,400 — 31 days", severity: "warning" },
  { id: 5, time: "08:09:55", connector: "GoHighLevel", type: "pipeline", message: "3 new opportunities entered pipeline — total $1.8M", severity: "success" },
  { id: 6, time: "08:08:33", connector: "Workforce", type: "placement", message: "14 placement renewals due this week — action required", severity: "warning" },
  { id: 7, time: "08:07:12", connector: "Calendar", type: "schedule", message: "6 executive meetings scheduled — briefings prepared", severity: "info" },
  { id: 8, time: "08:05:48", connector: "QuickBooks", type: "finance", message: "Monthly P&L sync complete — $4.2M revenue confirmed", severity: "success" },
  { id: 9, time: "08:04:21", connector: "GoHighLevel", type: "contact", message: "New enterprise lead scored 94/100 — immediate follow-up", severity: "success" },
  { id: 10, time: "08:02:09", connector: "Email Intelligence", type: "error", message: "Connection timeout — authentication refresh required", severity: "error" },
];

const THROUGHPUT_DATA = [
  { time: "06:00", signals: 120 },
  { time: "06:30", signals: 180 },
  { time: "07:00", signals: 340 },
  { time: "07:30", signals: 520 },
  { time: "08:00", signals: 890 },
  { time: "08:14", signals: 1240 },
];

const LATENCY_DATA = [
  { time: "06:00", p50: 45, p95: 120 },
  { time: "06:30", p50: 42, p95: 110 },
  { time: "07:00", p50: 48, p95: 135 },
  { time: "07:30", p50: 44, p95: 118 },
  { time: "08:00", p50: 52, p95: 890 },
  { time: "08:14", p50: 47, p95: 142 },
];

const STATUS_COLORS = {
  operational: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#10B981", dot: "#10B981" },
  degraded: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#F59E0B", dot: "#F59E0B" },
  offline: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#EF4444", dot: "#EF4444" },
};

const SEVERITY_STYLES = {
  success: { color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  error: { color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
  info: { color: "#00D4C8", bg: "rgba(0,212,200,0.08)" },
};

export default function LiveStatus() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      setTicker((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const operational = CONNECTORS.filter((c) => c.status === "operational").length;
  const degraded = CONNECTORS.filter((c) => c.status === "degraded").length;
  const offline = CONNECTORS.filter((c) => c.status === "offline").length;
  const totalSignals = CONNECTORS.reduce((sum, c) => sum + c.signalsToday, 0);

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-8 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="section-label mb-3">Live Integration Status</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Signal Command Center
              </h1>
              <p className="text-sm text-[#E8EDF5]/50 mt-2">
                Real-time health of all connected business systems and data pipelines.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setAutoRefresh(!autoRefresh); setLastRefresh(new Date()); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  autoRefresh
                    ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[#10B981]"
                    : "border-[rgba(0,212,200,0.2)] text-[#E8EDF5]/50 hover:text-[#00D4C8]"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                {autoRefresh ? "AUTO REFRESH" : "PAUSED"}
              </button>
              <div className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Last: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">

        {/* ── SUMMARY METRICS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Operational", value: operational, total: CONNECTORS.length, color: "#10B981", icon: CheckCircle2 },
            { label: "Degraded", value: degraded, total: CONNECTORS.length, color: "#F59E0B", icon: AlertTriangle },
            { label: "Offline", value: offline, total: CONNECTORS.length, color: "#EF4444", icon: XCircle },
            { label: "Signals Today", value: totalSignals.toLocaleString(), total: null, color: "#00D4C8", icon: Signal },
          ].map((m) => (
            <div key={m.label} className="metric-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
                {m.total && (
                  <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    of {m.total}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {m.value}
              </div>
              <div className="text-[10px] text-[#E8EDF5]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── CONNECTOR GRID ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">Connected Systems</div>
            <Link href="/connected-apps" className="flex items-center gap-1 text-xs text-[#00D4C8] hover:text-[#00E8DB] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Manage connections <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONNECTORS.map((conn) => {
              const s = STATUS_COLORS[conn.status];
              return (
                <div key={conn.id} className="glass-card rounded-xl p-5 hover:border-[rgba(0,212,200,0.25)] transition-all duration-250">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${conn.color}15`, border: `1px solid ${conn.color}30`, color: conn.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {conn.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {conn.name}
                        </div>
                        <div className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {conn.type}
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      {conn.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <div className="text-[10px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIGNALS</div>
                      <div className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {conn.signalsToday.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>UPTIME</div>
                      <div className={`text-sm font-semibold ${conn.uptime >= 99 ? "text-[#10B981]" : conn.uptime >= 95 ? "text-[#F59E0B]" : "text-[#EF4444]"}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {conn.uptime}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LATENCY</div>
                      <div className={`text-sm font-semibold ${conn.latency < 100 ? "text-[#10B981]" : conn.latency < 500 ? "text-[#F59E0B]" : "text-[#EF4444]"}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {conn.latency > 0 ? `${conn.latency}ms` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {conn.dataPoints.slice(0, 3).map((dp) => (
                      <span key={dp} className="tag-teal">{dp}</span>
                    ))}
                    {conn.dataPoints.length > 3 && (
                      <span className="tag-teal">+{conn.dataPoints.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>Last sync: {conn.lastSync}</span>
                    <span>{conn.syncRate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signal Throughput */}
          <div className="glass-card rounded-2xl p-6">
            <div className="section-label mb-1">Signal Throughput</div>
            <div className="text-xs text-[#E8EDF5]/40 mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Signals processed per 30-min window today
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={THROUGHPUT_DATA}>
                <defs>
                  <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4C8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00D4C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0F1E35", border: "1px solid rgba(0,212,200,0.2)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v} signals`, ""]} />
                <Area type="monotone" dataKey="signals" stroke="#00D4C8" strokeWidth={2} fill="url(#throughputGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Latency */}
          <div className="glass-card rounded-2xl p-6">
            <div className="section-label mb-1">API Latency</div>
            <div className="text-xs text-[#E8EDF5]/40 mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              p50 and p95 response times (ms)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={LATENCY_DATA}>
                <XAxis dataKey="time" tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0F1E35", border: "1px solid rgba(0,212,200,0.2)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}ms`, ""]} />
                <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="p50" />
                <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="p95" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#10B981] rounded" /><span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>p50</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#F59E0B] rounded" /><span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>p95</span></div>
            </div>
          </div>
        </div>

        {/* ── SIGNAL FEED ── */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="section-label mb-1">Live Signal Feed</div>
              <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Most recent signals ingested by EEOS
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
            </div>
          </div>
          <div className="space-y-1">
            {SIGNAL_FEED.map((sig) => {
              const style = SEVERITY_STYLES[sig.severity as keyof typeof SEVERITY_STYLES];
              return (
                <div
                  key={sig.id}
                  className="flex items-start gap-4 px-4 py-3 rounded-lg transition-all duration-150 hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderLeft: `2px solid ${style.color}40` }}
                >
                  <span className="text-[10px] text-[#E8EDF5]/30 shrink-0 mt-0.5 w-16" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {sig.time}
                  </span>
                  <span
                    className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: style.bg, color: style.color, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {sig.connector}
                  </span>
                  <span className="text-xs text-[#E8EDF5]/70 flex-1">{sig.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[rgba(0,212,200,0.08)]">
          <Link
            href="/connect-ghl"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plug className="w-4 h-4" />
            Connect GoHighLevel
          </Link>
          <Link
            href="/connected-apps"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Database className="w-4 h-4" />
            Manage Connected Apps
          </Link>
          <Link
            href="/executive-home"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#E8EDF5]/60 border border-[rgba(232,237,245,0.1)] rounded-lg hover:border-[rgba(0,212,200,0.2)] hover:text-[#E8EDF5]/80 active:scale-[0.97] transition-all duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Eye className="w-4 h-4" />
            Open Executive Dashboard
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
