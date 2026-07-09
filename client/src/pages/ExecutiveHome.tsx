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
    riskLevel: "critical" as const,
    category: "Revenue",
    title: "3 Enterprise Deals Stalled — $2.1M at Risk",
    whyThisMatters: "GoHighLevel pipeline shows 3 deals ($2.1M combined) stalled for 14+ days. Win probability drops 40% after day 14 and below 30% after day 21.",
    urgencyReason: "Two of three prospects have not opened the proposal in 7 days. Competitor activity detected in 2 accounts this week.",
    businessImpact: "$2.1M revenue at risk. At current close rate, these 3 deals represent 29% of Q3 target.",
    riskIfIgnored: "Proposals expire from active consideration. Competitors who follow up consistently win 68% of stalled deals in this segment.",
    action: "Schedule executive outreach within 48 hours. Reference each prospect's stated pain point — not a generic follow-up.",
    actionDeadline: "Within 48 hours",
    confidence: 94,
    confidenceNote: "Based on pipeline stage duration, document engagement, and 1,200+ historical deal patterns.",
    signals: ["opportunity.stage: Proposal 14+ days", "opportunity.last_stage_change_date", "proposal_open_count_7d: 0"],
    estimatedValue: "$2.1M",
    measurementPlan: "Monitor pipeline stage changes in GoHighLevel daily. Success = at least 2 of 3 deals advance to negotiation within 10 days. Track proposal document open rates as a leading indicator.",
    source: "GoHighLevel CRM",
    time: "2 min ago",
    icon: DollarSign,
    color: "#EF4444",
  },
  {
    id: "rec-2",
    priority: "High",
    riskLevel: "high" as const,
    category: "Operations",
    title: "Staffing Utilization Below Threshold — 2 Regions",
    whyThisMatters: "Southeast and Midwest regions at 67% utilization vs. 82% target. 14 available placements unfilled across 3 client accounts.",
    urgencyReason: "Unfilled placements for 7+ days trigger SLA review clauses in 2 contracts. Client satisfaction scores drop measurably after day 10.",
    businessImpact: "$340K monthly revenue opportunity from reallocation. SLA breach risk on 2 active contracts.",
    riskIfIgnored: "Client escalation likely within 5 days. SLA breach triggers penalty clauses and increases churn probability by 34%.",
    action: "Reallocate 14 available placements from low-utilization recruiters to Southeast and Midwest accounts today.",
    actionDeadline: "Today",
    confidence: 87,
    confidenceNote: "Based on utilization tracking, SLA contract terms, and historical churn correlation data.",
    signals: ["user.task_count: below threshold", "calendar.booked_slots: 67%", "contact.assigned_to: 14 unassigned"],
    estimatedValue: "$340K",
    measurementPlan: "Track utilization rates in GoHighLevel daily. Success = Southeast and Midwest regions reach 80%+ utilization within 5 days. All 14 placements assigned and confirmed by end of week.",
    source: "Workforce Management",
    time: "18 min ago",
    icon: Users,
    color: "#F59E0B",
  },
  {
    id: "rec-3",
    priority: "High",
    riskLevel: "high" as const,
    category: "Growth",
    title: "Healthcare Vertical Converting at 2.3x Average Rate",
    whyThisMatters: "Healthcare contacts convert at 11.2% vs. 4.8% overall. Email open rates are 3.1x higher. Only 18% of pipeline is healthcare despite superior economics.",
    urgencyReason: "Q3 healthcare budget cycles open in 30 days. Decisions made now determine Q4 contract awards.",
    businessImpact: "Reallocating 30% of outbound to healthcare could generate $180K–$240K additional annual revenue.",
    riskIfIgnored: "Missing Q3 budget cycle means waiting until Q1 next year. Competitors with healthcare focus are actively prospecting.",
    action: "Reallocate 30% of outbound to healthcare-tagged contacts. Launch dedicated sequence to 47 nurture-stage healthcare contacts.",
    actionDeadline: "Next 30 days",
    confidence: 91,
    confidenceNote: "Based on 6-month conversion analysis, email engagement data, and Q3 budget cycle timing patterns.",
    signals: ["email.open_rate: 68% healthcare vs 22% avg", "opportunity.source: healthcare 11.2% close rate", "contact.industry: 18% concentration"],
    estimatedValue: "$180K–$240K",
    measurementPlan: "Track healthcare pipeline concentration weekly. Success = healthcare contacts reach 30% of active pipeline within 60 days. Review email open rates and conversion rates at Q3 pipeline audit.",
    source: "EEOS Pattern Analysis",
    time: "1 hr ago",
    icon: TrendingUp,
    color: "#00D4C8",
  },
  {
    id: "rec-4",
    priority: "Medium",
    riskLevel: "medium" as const,
    category: "Finance",
    title: "$187K Overdue — Cash Flow Gap Projected",
    whyThisMatters: "3 client invoices totaling $187K are 30+ days overdue. Automated reminders sent with no response. Combined with Q3 payroll cycle, a gap is projected.",
    urgencyReason: "Payroll is a fixed obligation. The current window is sufficient to resolve through collections if action begins today.",
    businessImpact: "$187K outstanding. If financing is required, cost is $3,100–$4,800 in interest at current rates.",
    riskIfIgnored: "Cash flow gap grows. Short-term financing required. Repeated gaps increase operational risk score.",
    action: "Initiate direct account manager escalation on all 3 overdue accounts before end of week. Offer 2% early payment discount.",
    actionDeadline: "This week",
    confidence: 99,
    confidenceNote: "Based on invoice aging data, payment history, and payroll cycle timing. Highest-confidence recommendation.",
    signals: ["invoice.status: 30+ days overdue", "invoice.due_date: oldest 47 days", "payment.received_date: 31 days ago"],
    estimatedValue: "$187K",
    measurementPlan: "Monitor GoHighLevel Payments daily. Success = at least $187K collected before end of week. Track invoice status changes. If collections fall short by day 3, initiate financing process immediately.",
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
            <span className="text-xs font-semibold text-[#10B981]">{rec.estimatedValue}</span>
            <span className="text-[10px] text-[#E8EDF5]/25">·</span>
            <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              via {rec.source}
            </span>
            <span className="text-[10px] text-[#E8EDF5]/25">·</span>
            <span className="text-[10px] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.actionDeadline}</span>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-[rgba(0,212,200,0.08)] space-y-3">
              {/* Why This Matters */}
              <div>
                <div className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why This Matters</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.whyThisMatters}</p>
              </div>
              {/* Why Now */}
              <div>
                <div className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why Now</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.urgencyReason}</p>
              </div>
              {/* Business Impact */}
              <div>
                <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Business Impact</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.businessImpact}</p>
              </div>
              {/* Risk If Ignored */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: rec.color, fontFamily: "'JetBrains Mono', monospace" }}>Risk If Ignored</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.riskIfIgnored}</p>
              </div>
              {/* Signals */}
              <div>
                <div className="text-[10px] font-bold text-[#00D4C8] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Supporting Signals</div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.signals.map((s: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] text-[#00D4C8]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
                  ))}
                </div>
              </div>
              {/* Confidence */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold text-[#E8EDF5]/40 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Confidence</div>
                  <div className="text-[10px] font-bold" style={{ color: rec.confidence >= 85 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{rec.confidence}%</div>
                </div>
                <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mb-1">
                  <div className="h-full rounded-full" style={{ width: `${rec.confidence}%`, background: rec.confidence >= 85 ? "#10B981" : "#F59E0B" }} />
                </div>
                <p className="text-[10px] text-[#E8EDF5]/35 italic" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.confidenceNote}</p>
              </div>
              {/* Measurement Plan */}
              <div className="p-3 rounded-lg border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.05)]">
                <div className="text-[10px] font-bold text-[#6366F1] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Measurement Plan</div>
                <p className="text-[11px] text-[#E8EDF5]/60 leading-relaxed">{rec.measurementPlan}</p>
              </div>
              {/* Action */}
              <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <Link
                  href="/ai-recommendations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md hover:bg-[#00E8DB] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-3 h-3" />
                  Take Action
                </Link>
                <span className="text-[10px] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Deadline: {rec.actionDeadline}</span>
              </div>
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
