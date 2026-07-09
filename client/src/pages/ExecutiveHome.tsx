// EEOS Executive Home Dashboard
// Sovereign Night design — aerospace command interface
// The executive operating system home: Business Score, AI Recommendations, Today's Activity, KPIs

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Bell, Settings, ChevronRight, ArrowRight, Activity, Zap,
  BarChart3, Users, DollarSign, Target, Clock, Brain,
  Lightbulb, Shield, Globe, RefreshCw, MoreHorizontal,
  Star, ArrowUpRight, ArrowDownRight, Cpu, Database,
  MessageSquare, Calendar, FileText, Eye, Plug
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

// ── DEMO DATA ──
const EXEC_PROFILE = {
  name: "Marcus Chen",
  title: "Chief Executive Officer",
  company: "PRN Staffers",
  avatar: "MC",
  lastLogin: "Today, 6:42 AM",
  timezone: "EST",
};

const BUSINESS_SCORE = {
  overall: 84,
  delta: +3,
  trend: "up" as const,
  components: [
    { label: "Revenue Health", score: 91, delta: +2, color: "#10B981" },
    { label: "Operational Efficiency", score: 78, delta: +5, color: "#00D4C8" },
    { label: "Team Performance", score: 88, delta: -1, color: "#10B981" },
    { label: "Pipeline Strength", score: 82, delta: +4, color: "#00D4C8" },
    { label: "Client Satisfaction", score: 79, delta: +3, color: "#F59E0B" },
    { label: "Financial Position", score: 86, delta: 0, color: "#10B981" },
  ],
  history: [72, 74, 75, 78, 76, 79, 81, 80, 82, 84],
};

const AI_RECOMMENDATIONS = [
  {
    id: "rec-1",
    priority: "Critical",
    category: "Revenue",
    title: "Accelerate Q3 close — 3 enterprise deals at risk",
    insight: "GoHighLevel pipeline data shows 3 deals ($2.1M combined) have been stalled for 14+ days. Competitor activity detected in 2 accounts. Recommend executive outreach within 48 hours.",
    action: "Schedule executive calls",
    impact: "$2.1M revenue at risk",
    confidence: 94,
    source: "GoHighLevel CRM",
    time: "2 min ago",
    icon: DollarSign,
    color: "#EF4444",
  },
  {
    id: "rec-2",
    priority: "High",
    category: "Operations",
    title: "Staffing utilization below threshold in 2 regions",
    insight: "Southeast and Midwest regions showing 67% utilization vs. 82% target. 14 available placements unfilled. Reallocation opportunity identified across 3 client accounts.",
    action: "Review regional allocation",
    impact: "+$340K monthly revenue opportunity",
    confidence: 87,
    source: "Workforce Management",
    time: "18 min ago",
    icon: Users,
    color: "#F59E0B",
  },
  {
    id: "rec-3",
    priority: "High",
    category: "Growth",
    title: "Healthcare vertical showing 40% faster conversion",
    insight: "Analysis of last 90 days shows healthcare clients converting 40% faster than average. Current pipeline has 8 healthcare prospects. Recommend prioritizing dedicated outreach sequence.",
    action: "Launch healthcare campaign",
    impact: "Estimated 2.3x pipeline velocity",
    confidence: 91,
    source: "EEOS Pattern Analysis",
    time: "1 hr ago",
    icon: TrendingUp,
    color: "#00D4C8",
  },
  {
    id: "rec-4",
    priority: "Medium",
    category: "Finance",
    title: "Cash flow optimization — 3 invoices overdue",
    insight: "3 client invoices totaling $187K are 30+ days overdue. Automated reminders sent with no response. Direct account manager escalation recommended before end of week.",
    action: "Escalate collections",
    impact: "$187K outstanding",
    confidence: 99,
    source: "Financial Systems",
    time: "3 hr ago",
    icon: AlertTriangle,
    color: "#F59E0B",
  },
];

const TODAY_ACTIVITY = [
  { time: "08:14", type: "signal", label: "GoHighLevel synced 847 new contact updates", icon: Plug, color: "#00D4C8" },
  { time: "08:02", type: "alert", label: "Revenue alert: Deal #GHL-4821 moved to Closed Won ($420K)", icon: DollarSign, color: "#10B981" },
  { time: "07:51", type: "insight", label: "EEOS generated 4 new executive recommendations", icon: Brain, color: "#00D4C8" },
  { time: "07:30", type: "system", label: "Morning intelligence briefing compiled — 12 signals processed", icon: Cpu, color: "#E8EDF5" },
  { time: "07:15", type: "alert", label: "Staffing alert: 2 placements ending this week — renewal needed", icon: AlertTriangle, color: "#F59E0B" },
  { time: "06:58", type: "signal", label: "Calendar sync: 6 executive meetings scheduled today", icon: Calendar, color: "#00D4C8" },
  { time: "06:42", type: "system", label: "Executive session opened — all systems nominal", icon: Shield, color: "#10B981" },
];

const KPI_CARDS = [
  {
    id: "k1", label: "Monthly Revenue", value: "$4.2M", delta: "+12%", trend: "up" as const,
    sub: "vs. $3.75M last month", color: "#10B981",
    sparkline: [3.1, 3.3, 3.5, 3.4, 3.7, 3.9, 4.0, 4.2],
    icon: DollarSign,
  },
  {
    id: "k2", label: "Active Placements", value: "1,247", delta: "+8%", trend: "up" as const,
    sub: "across 34 clients", color: "#00D4C8",
    sparkline: [1050, 1080, 1120, 1100, 1150, 1190, 1220, 1247],
    icon: Users,
  },
  {
    id: "k3", label: "Pipeline Value", value: "$18.4M", delta: "+5%", trend: "up" as const,
    sub: "47 active opportunities", color: "#00D4C8",
    sparkline: [15.2, 15.8, 16.1, 16.5, 17.0, 17.4, 17.9, 18.4],
    icon: Target,
  },
  {
    id: "k4", label: "Avg. Fill Time", value: "4.2 days", delta: "-18%", trend: "up" as const,
    sub: "industry avg: 7.1 days", color: "#10B981",
    sparkline: [6.1, 5.8, 5.5, 5.2, 4.9, 4.7, 4.4, 4.2],
    icon: Clock,
  },
  {
    id: "k5", label: "Client Retention", value: "94.2%", delta: "+1.3%", trend: "up" as const,
    sub: "12-month rolling", color: "#10B981",
    sparkline: [91, 91.5, 92, 92.3, 92.8, 93.2, 93.8, 94.2],
    icon: Star,
  },
  {
    id: "k6", label: "EBITDA Margin", value: "22.4%", delta: "-0.8%", trend: "down" as const,
    sub: "target: 24%", color: "#F59E0B",
    sparkline: [23.5, 23.2, 23.0, 22.8, 22.6, 22.5, 22.4, 22.4],
    icon: BarChart3,
  },
];

const REVENUE_CHART = [
  { month: "Jan", revenue: 3.1, target: 3.2 },
  { month: "Feb", revenue: 3.3, target: 3.3 },
  { month: "Mar", revenue: 3.5, target: 3.4 },
  { month: "Apr", revenue: 3.4, target: 3.5 },
  { month: "May", revenue: 3.7, target: 3.6 },
  { month: "Jun", revenue: 3.9, target: 3.7 },
  { month: "Jul", revenue: 4.2, target: 3.8 },
];

// ── BUSINESS SCORE RING ──
function BusinessScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const animatedOffset = circumference - (animated / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(0,212,200,0.1)" strokeWidth={8}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="#00D4C8"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animatedOffset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.23, 1, 0.32, 1)" }}
        filter="url(#tealGlow)"
      />
      <defs>
        <filter id="tealGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

// ── RECOMMENDATION CARD ──
function RecommendationCard({ rec, index }: { rec: typeof AI_RECOMMENDATIONS[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-250 hover:border-[rgba(0,212,200,0.3)]"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        {/* Priority indicator */}
        <div
          className="w-1 rounded-full shrink-0 mt-1"
          style={{
            height: expanded ? "auto" : "40px",
            minHeight: "40px",
            background: rec.color,
            boxShadow: `0 0 8px ${rec.color}60`,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded"
                style={{
                  background: `${rec.color}18`,
                  color: rec.color,
                  border: `1px solid ${rec.color}30`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {rec.priority}
              </span>
              <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {rec.category} · {rec.time}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="text-[10px] text-[#00D4C8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {rec.confidence}% confidence
              </div>
            </div>
          </div>
          <h4 className="text-sm font-semibold text-[#E8EDF5] mb-1 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {rec.title}
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#E8EDF5]/40">{rec.impact}</span>
            <span className="text-[10px] text-[#E8EDF5]/25">·</span>
            <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              via {rec.source}
            </span>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-[rgba(0,212,200,0.08)]">
              <p className="text-xs text-[#E8EDF5]/60 leading-relaxed mb-3">{rec.insight}</p>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md hover:bg-[#00E8DB] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                onClick={(e) => e.stopPropagation()}
              >
                <Zap className="w-3 h-3" />
                {rec.action}
              </button>
            </div>
          )}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-[#E8EDF5]/30 shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </div>
    </div>
  );
}

// ── MAIN PAGE ──
export default function ExecutiveHome() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifCount] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = (() => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Executive Header Bar */}
      <div className="pt-16">
        <div className="bg-[#0A1628] border-b border-[rgba(0,212,200,0.08)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.3)] flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#00D4C8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {EXEC_PROFILE.avatar}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {greeting}, {EXEC_PROFILE.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {EXEC_PROFILE.title} · {EXEC_PROFILE.company} · {dateStr}
                  </div>
                </div>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] text-[#10B981] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    ALL SYSTEMS NOMINAL
                  </span>
                </div>
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg border border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/60 hover:text-[#00D4C8] hover:border-[rgba(0,212,200,0.35)] transition-all duration-200"
                >
                  <Bell className="w-4 h-4" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center font-bold">
                      {notifCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/integration-health"
                  className="hidden sm:flex items-center gap-1.5 p-2 rounded-lg border border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/60 hover:text-[#00D4C8] hover:border-[rgba(0,212,200,0.35)] transition-all duration-200"
                >
                  <Activity className="w-4 h-4" />
                </Link>
                <Link
                  href="/settings"
                  className="hidden sm:flex items-center gap-1.5 p-2 rounded-lg border border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/60 hover:text-[#E8EDF5]/80 hover:border-[rgba(0,212,200,0.2)] transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── ROW 1: Business Score + KPIs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Business Score Card */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="section-label mb-4">Business Score</div>
            <div className="relative">
              <BusinessScoreRing score={BUSINESS_SCORE.overall} size={140} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {BUSINESS_SCORE.overall}
                </span>
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${BUSINESS_SCORE.delta > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {BUSINESS_SCORE.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(BUSINESS_SCORE.delta)} pts
                </div>
              </div>
            </div>
            <div className="mt-4 w-full space-y-2">
              {BUSINESS_SCORE.components.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className="text-[10px] text-[#E8EDF5]/50 flex-1 text-left truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {c.label}
                  </div>
                  <div className="w-16 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${c.score}%`, background: c.color }}
                    />
                  </div>
                  <div className="text-[10px] font-semibold text-[#E8EDF5]/70 w-6 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {c.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.id} className="metric-card rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-[rgba(0,212,200,0.08)]">
                    <kpi.icon className="w-3.5 h-3.5 text-[#00D4C8]" />
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${
                    kpi.trend === "up" ? "text-[#10B981]" : kpi.trend === "down" ? "text-[#EF4444]" : "text-[#F59E0B]"
                  }`}>
                    {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.delta}
                  </div>
                </div>
                <div className="text-xl font-bold text-[#E8EDF5] mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {kpi.value}
                </div>
                <div className="text-[10px] text-[#E8EDF5]/40 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {kpi.label}
                </div>
                <ResponsiveContainer width="100%" height={28}>
                  <LineChart data={kpi.sparkline.map((v, i) => ({ v, i }))}>
                    <Line type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-[9px] text-[#E8EDF5]/25 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 2: Revenue Chart + AI Recommendations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-1">Revenue Performance</div>
                <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Actual vs. Target · 2026
                </div>
              </div>
              <button className="p-1.5 rounded-lg text-[#E8EDF5]/30 hover:text-[#00D4C8] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={REVENUE_CHART}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4C8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00D4C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "rgba(232,237,245,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#0F1E35", border: "1px solid rgba(0,212,200,0.2)", borderRadius: "8px", fontSize: "11px" }}
                  labelStyle={{ color: "#E8EDF5", fontFamily: "'JetBrains Mono', monospace" }}
                  formatter={(v: number) => [`$${v}M`, ""]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00D4C8" strokeWidth={2} fill="url(#revenueGrad)" dot={false} name="Actual" />
                <Line type="monotone" dataKey="target" stroke="rgba(232,237,245,0.2)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#00D4C8] rounded" />
                <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[rgba(232,237,245,0.2)] rounded" style={{ borderTop: "1px dashed rgba(232,237,245,0.2)" }} />
                <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Target</span>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-1">AI Recommendations</div>
                <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {AI_RECOMMENDATIONS.length} active · updated 2 min ago
                </div>
              </div>
              <Link
                href="/ai-recommendations"
                className="flex items-center gap-1 text-xs text-[#00D4C8] hover:text-[#00E8DB] transition-colors"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                aria-label="View all AI recommendations"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {AI_RECOMMENDATIONS.map((rec, i) => (
                <RecommendationCard key={rec.id} rec={rec} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 3: Today's Activity + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Today's Activity */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-1">Today's Activity</div>
                <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {TODAY_ACTIVITY.length} events · {dateStr}
                </div>
              </div>
              <button className="flex items-center gap-1 text-xs text-[#E8EDF5]/40 hover:text-[#00D4C8] transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-0">
              {TODAY_ACTIVITY.map((event, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-[rgba(0,212,200,0.05)] last:border-0">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 mt-0.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${event.color}12`, border: `1px solid ${event.color}25` }}
                    >
                      <event.icon className="w-3.5 h-3.5" style={{ color: event.color }} />
                    </div>
                    {i < TODAY_ACTIVITY.length - 1 && (
                      <div className="w-px h-full mt-1 bg-[rgba(0,212,200,0.06)]" style={{ minHeight: "12px" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#E8EDF5]/80 leading-snug">{event.label}</p>
                  </div>
                  <div className="text-[10px] text-[#E8EDF5]/30 shrink-0 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {event.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions + System Status */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
              <div className="section-label mb-4">Quick Actions</div>
              <div className="space-y-2">
                {[
                  { label: "Connect GoHighLevel", href: "/connect-ghl", icon: Plug, primary: true },
                  { label: "Open Executive Dashboard", href: "/demo", icon: Eye, primary: false },
                  { label: "View Integration Health", href: "/integration-health", icon: Activity, primary: false },
                  { label: "Business Health", href: "/business-health", icon: BarChart3, primary: false },
                  { label: "AI Recommendations", href: "/ai-recommendations", icon: Brain, primary: false },
                  { label: "Live Signals", href: "/live-signals", icon: Zap, primary: false },
                  { label: "Executive Timeline", href: "/executive-timeline", icon: Clock, primary: false },
                  { label: "Knowledge Graph", href: "/knowledge-graph", icon: Globe, primary: false },
                  { label: "Review Notifications", href: "/notifications", icon: Bell, primary: false },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      action.primary
                        ? "bg-[rgba(0,212,200,0.12)] border border-[rgba(0,212,200,0.3)] text-[#00D4C8] hover:bg-[rgba(0,212,200,0.18)]"
                        : "text-[#E8EDF5]/65 hover:text-[#E8EDF5]/90 hover:bg-[rgba(255,255,255,0.04)] border border-transparent hover:border-[rgba(0,212,200,0.1)]"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <action.icon className="w-4 h-4 shrink-0" />
                    {action.label}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                  </Link>
                ))}
              </div>
            </div>

            {/* System Status Mini */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">System Status</div>
                <Link href="/system-health" className="text-[10px] text-[#00D4C8] hover:text-[#00E8DB] transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Full report →
                </Link>
              </div>
              <div className="space-y-2">
                {[
                  { label: "GoHighLevel Sync", status: "Operational", color: "#10B981" },
                  { label: "EEOS Intelligence", status: "Operational", color: "#10B981" },
                  { label: "Data Pipeline", status: "Operational", color: "#10B981" },
                  { label: "API Gateway", status: "Degraded", color: "#F59E0B" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-[#E8EDF5]/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px]" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div className="border-t border-[rgba(0,212,200,0.08)] pt-8 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Connect your business systems. EEOS turns approved signals into executive recommendations.
              </p>
              <p className="text-xs text-[#E8EDF5]/40 mt-0.5">
                All data shown is demonstration data. Connect your live systems to activate real intelligence.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/connect-ghl"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                aria-label="Connect GoHighLevel to activate live EEOS intelligence"
              >
                <Plug className="w-4 h-4" />
                Connect GoHighLevel
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Eye className="w-4 h-4" />
                Open Executive Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
