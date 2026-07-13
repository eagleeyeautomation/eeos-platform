// BusinessHealth.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Business Health: revenue health, pipeline, team utilization, client retention
// All visualizations designed to consume real GoHighLevel data once backend is live.
// Data shape: { source: "ghl" | "demo", lastSync: ISO8601, metrics: GHLMetric[] }

import { useState } from "react";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, Users, DollarSign, Target,
  Heart, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw,
  BarChart3, Activity, Zap
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
// When backend is live, replace these with API responses from:
// GET /api/ghl/business-health?tenantId=xxx&period=30d

const DATA_SOURCE = {
  source: "demo" as "demo" | "ghl",
  lastSync: new Date().toISOString(),
  tenantId: "demo-prn-staffers",
  period: "30d",
};

const HEALTH_SCORE = {
  overall: 78,
  trend: "up" as "up" | "down" | "neutral",
  change: "+4 pts",
  components: [
    { label: "Revenue Health", score: 82, weight: 0.30, trend: "up" },
    { label: "Pipeline Strength", score: 71, weight: 0.25, trend: "neutral" },
    { label: "Team Utilization", score: 85, weight: 0.20, trend: "up" },
    { label: "Client Retention", score: 91, weight: 0.15, trend: "up" },
    { label: "Cash Flow", score: 68, weight: 0.10, trend: "down" },
  ],
};

const REVENUE_TREND = [
  { month: "Jan", actual: 420000, target: 400000, forecast: null },
  { month: "Feb", actual: 445000, target: 415000, forecast: null },
  { month: "Mar", actual: 398000, target: 430000, forecast: null },
  { month: "Apr", actual: 467000, target: 445000, forecast: null },
  { month: "May", actual: 512000, target: 460000, forecast: null },
  { month: "Jun", actual: 489000, target: 475000, forecast: null },
  { month: "Jul", actual: null, target: 490000, forecast: 524000 },
  { month: "Aug", actual: null, target: 505000, forecast: 548000 },
];

const PIPELINE_STAGES = [
  { stage: "Prospect", count: 48, value: 1240000, color: "#334155" },
  { stage: "Qualified", count: 31, value: 890000, color: "#1E40AF" },
  { stage: "Proposal", count: 18, value: 620000, color: "#0369A1" },
  { stage: "Negotiation", count: 9, value: 380000, color: "#0891B2" },
  { stage: "Closing", count: 4, value: 210000, color: "#00D4C8" },
];

const TEAM_UTILIZATION = [
  { dept: "Recruiting", utilization: 92, capacity: 100, headcount: 12 },
  { dept: "Account Mgmt", utilization: 78, capacity: 100, headcount: 8 },
  { dept: "Operations", utilization: 85, capacity: 100, headcount: 6 },
  { dept: "Sales", utilization: 71, capacity: 100, headcount: 5 },
  { dept: "Admin", utilization: 65, capacity: 100, headcount: 4 },
];

const CLIENT_HEALTH = [
  { name: "Northstar Health", score: 94, status: "healthy", revenue: 128000, risk: "low" },
  { name: "Apex Industries", score: 87, status: "healthy", revenue: 96000, risk: "low" },
  { name: "Meridian Group", score: 72, status: "watch", revenue: 84000, risk: "medium" },
  { name: "Cascade Partners", score: 61, status: "at-risk", revenue: 72000, risk: "high" },
  { name: "Summit Logistics", score: 89, status: "healthy", revenue: 68000, risk: "low" },
  { name: "Vertex Solutions", score: 55, status: "at-risk", revenue: 54000, risk: "high" },
];

const ALERTS = [
  { id: 1, type: "warning", message: "Cascade Partners engagement dropped 34% this month", action: "Review account" },
  { id: 2, type: "warning", message: "Cash flow projection shows 18-day gap in Q3", action: "View forecast" },
  { id: 3, type: "info", message: "Pipeline conversion rate improved to 8.3% (+1.2%)", action: "See details" },
  { id: 4, type: "success", message: "Team utilization at 85% — highest in 6 months", action: "View breakdown" },
];

// ── HELPERS ────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Watch";
  return "At Risk";
}

function formatCurrency(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 text-xs border border-[rgba(0,212,200,0.2)]">
      <div className="text-[#00D4C8] font-semibold mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#E8EDF5]/70">{p.name}:</span>
          <span className="text-[#E8EDF5] font-semibold">{typeof p.value === "number" ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function BusinessHealth() {
  const [activeTab, setActiveTab] = useState<"revenue" | "pipeline" | "team" | "clients">("revenue");

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Business Health</div>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                      DATA_SOURCE.source === "ghl"
                        ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                        : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${DATA_SOURCE.source === "ghl" ? "bg-[#10B981]" : "bg-[#F59E0B]"} animate-pulse`} />
                    {DATA_SOURCE.source === "ghl" ? "LIVE · GHL" : "DEMO DATA"}
                  </div>
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Business Health Overview
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1 max-w-xl">
                  EEOS transforms business data into accurate executive intelligence. {DATA_SOURCE.source === "ghl" ? "Showing live GoHighLevel data." : "Showing demonstration data — connect GoHighLevel to see your real business health score."}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  aria-label="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Health Score Banner */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="glass-card rounded-2xl p-6 border border-[rgba(0,212,200,0.15)]">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                {/* Score Ring */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-label={`Business health score: ${HEALTH_SCORE.overall}`}>
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(0,212,200,0.1)" strokeWidth="8" />
                      <circle
                        cx="48" cy="48" r="40" fill="none"
                        stroke={scoreColor(HEALTH_SCORE.overall)}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - HEALTH_SCORE.overall / 100)}`}
                        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.23,1,0.32,1)" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {HEALTH_SCORE.overall}
                      </span>
                      <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>/ 100</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#E8EDF5]/50 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>OVERALL HEALTH</div>
                    <div className="text-2xl font-bold" style={{ color: scoreColor(HEALTH_SCORE.overall), fontFamily: "'Space Grotesk', sans-serif" }}>
                      {scoreLabel(HEALTH_SCORE.overall)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-[#10B981]" />
                      <span className="text-xs text-[#10B981]">{HEALTH_SCORE.change} this month</span>
                    </div>
                    <div className="mt-2 text-[10px] text-[#E8EDF5]/35 leading-relaxed max-w-[180px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Weighted composite of 5 GHL signal categories. Updated on each sync.
                    </div>
                  </div>
                </div>

                {/* Component Scores */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                  {HEALTH_SCORE.components.map((comp) => (
                    <div key={comp.label} className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,212,200,0.2)] transition-colors duration-200">
                      <div className="text-[10px] text-[#E8EDF5]/45 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {comp.label.toUpperCase()}
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {comp.score}
                        </span>
                        <div className="flex flex-col items-end gap-0.5">
                          {comp.trend === "up" && <TrendingUp className="w-3 h-3 text-[#10B981]" />}
                          {comp.trend === "down" && <TrendingDown className="w-3 h-3 text-[#EF4444]" />}
                          {comp.trend === "neutral" && <Minus className="w-3 h-3 text-[#F59E0B]" />}
                          <span className="text-[9px]" style={{ color: scoreColor(comp.score), fontFamily: "'JetBrains Mono', monospace" }}>{scoreLabel(comp.score)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${comp.score}%`, background: scoreColor(comp.score) }}
                        />
                      </div>
                      <div className="text-[9px] text-[#E8EDF5]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Weight: {Math.round(comp.weight * 100)}% of score
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Alerts */}
      {ALERTS.length > 0 && (
        <section className="pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection delay={150}>
              <div className="space-y-2">
                {ALERTS.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm ${
                      alert.type === "warning"
                        ? "bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)] text-[#F59E0B]"
                        : alert.type === "success"
                        ? "bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)] text-[#10B981]"
                        : "bg-[rgba(0,212,200,0.06)] border-[rgba(0,212,200,0.15)] text-[#00D4C8]"
                    }`}
                    role="alert"
                  >
                    <div className="flex items-center gap-3">
                      {alert.type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0" />}
                      {alert.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      {alert.type === "info" && <Activity className="w-4 h-4 shrink-0" />}
                      <span className="text-[#E8EDF5]/80">{alert.message}</span>
                    </div>
                    <button className="text-xs font-semibold shrink-0 hover:underline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {alert.action} →
                    </button>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Business health sections">
            {(["revenue", "pipeline", "team", "clients"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-[rgba(0,212,200,0.12)] text-[#00D4C8] border border-[rgba(0,212,200,0.3)]"
                    : "text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80 hover:bg-[rgba(255,255,255,0.04)]"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {tab === "revenue" && "Revenue Trend"}
                {tab === "pipeline" && "Pipeline"}
                {tab === "team" && "Team Utilization"}
                {tab === "clients" && "Client Health"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Content */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Revenue */}
          {activeTab === "revenue" && (
            <AnimatedSection>
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Revenue vs Target</h2>
                    <p className="text-xs text-[#E8EDF5]/45 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      GHL data field: contact.revenue_ytd · opportunity.value · pipeline.stage
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#00D4C8]" /><span className="text-[#E8EDF5]/50">Actual</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#E8EDF5]/30 border-dashed" /><span className="text-[#E8EDF5]/50">Target</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#7C3AED]" /><span className="text-[#E8EDF5]/50">Forecast</span></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={REVENUE_TREND} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4C8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00D4C8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "rgba(232,237,245,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: "rgba(232,237,245,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="actual" name="Actual" stroke="#00D4C8" strokeWidth={2} fill="url(#actualGrad)" connectNulls={false} dot={{ fill: "#00D4C8", r: 3 }} />
                    <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#7C3AED" strokeWidth={2} strokeDasharray="4 4" fill="url(#forecastGrad)" connectNulls={false} dot={{ fill: "#7C3AED", r: 3 }} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="rgba(232,237,245,0.3)" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnimatedSection>
          )}

          {/* Pipeline */}
          {activeTab === "pipeline" && (
            <AnimatedSection>
              <div className="glass-card rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Pipeline by Stage</h2>
                  <p className="text-xs text-[#E8EDF5]/45 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    GHL data field: opportunity.pipeline_stage · opportunity.monetary_value · opportunity.status
                  </p>
                </div>
                <div className="grid lg:grid-cols-2 gap-8">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={PIPELINE_STAGES} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fill: "rgba(232,237,245,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="stage" tick={{ fill: "rgba(232,237,245,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Pipeline Value" radius={[0, 4, 4, 0]}>
                        {PIPELINE_STAGES.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {PIPELINE_STAGES.map((stage) => (
                      <div key={stage.stage} className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                          <span className="text-sm text-[#E8EDF5]/80">{stage.stage}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(stage.value)}</div>
                          <div className="text-[10px] text-[#E8EDF5]/40">{stage.count} deals</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-[rgba(0,212,200,0.06)] rounded-xl border border-[rgba(0,212,200,0.2)] mt-2">
                      <span className="text-sm font-semibold text-[#00D4C8]">Total Pipeline</span>
                      <span className="text-sm font-bold text-[#00D4C8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {formatCurrency(PIPELINE_STAGES.reduce((s, p) => s + p.value, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Team */}
          {activeTab === "team" && (
            <AnimatedSection>
              <div className="glass-card rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Team Utilization by Department</h2>
                  <p className="text-xs text-[#E8EDF5]/45 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    GHL data field: user.department · task.assigned_to · calendar.booked_slots
                  </p>
                </div>
                <div className="space-y-4">
                  {TEAM_UTILIZATION.map((dept) => (
                    <div key={dept.dept} className="p-4 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-[#00D4C8]" />
                          <span className="text-sm font-semibold text-[#E8EDF5]">{dept.dept}</span>
                          <span className="text-xs text-[#E8EDF5]/40">{dept.headcount} people</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-lg font-bold"
                            style={{ color: scoreColor(dept.utilization), fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {dept.utilization}%
                          </span>
                          {dept.utilization >= 80 ? (
                            <TrendingUp className="w-4 h-4 text-[#10B981]" />
                          ) : dept.utilization >= 65 ? (
                            <Minus className="w-4 h-4 text-[#F59E0B]" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${dept.utilization}%`, background: scoreColor(dept.utilization) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* Clients */}
          {activeTab === "clients" && (
            <AnimatedSection>
              <div className="glass-card rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Client Health Scores</h2>
                  <p className="text-xs text-[#E8EDF5]/45 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    GHL data field: contact.last_activity · opportunity.close_date · conversation.response_time
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CLIENT_HEALTH.map((client) => (
                    <div
                      key={client.name}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:border-[rgba(0,212,200,0.3)] ${
                        client.risk === "high"
                          ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)]"
                          : client.risk === "medium"
                          ? "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)]"
                          : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold text-[#E8EDF5]">{client.name}</div>
                          <div className="text-xs text-[#E8EDF5]/40 mt-0.5">{formatCurrency(client.revenue)}/yr</div>
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{ color: scoreColor(client.score), fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {client.score}
                        </div>
                      </div>
                      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${client.score}%`, background: scoreColor(client.score) }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            client.risk === "high"
                              ? "bg-[rgba(239,68,68,0.15)] text-[#EF4444]"
                              : client.risk === "medium"
                              ? "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                              : "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                          }`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {client.risk.toUpperCase()} RISK
                        </span>
                        <Heart className="w-3.5 h-3.5" style={{ color: scoreColor(client.score) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0A1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 glass-card rounded-2xl border border-[rgba(0,212,200,0.15)]">
              <div>
                <div className="text-xs text-[#00D4C8] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EAGLE EYE AUTOMATION · EEOS</div>
                <h2 className="text-xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  See your real business health.
                </h2>
                <p className="text-sm text-[#E8EDF5]/55 mt-1">
                  Connect GoHighLevel and these metrics populate with your live data — instantly.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
                <Link
                  href="/executive-home"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
