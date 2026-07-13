/**
 * EEOS Executive Home — Primary Dashboard
 * Sovereign Night design — aerospace command interface
 *
 * Data sources: live tRPC procedures
 *   - tenant.mySubaccounts → subaccount selector
 *   - memory.get → business score + KPIs
 *   - recommendations.list → IE recommendations
 *   - timeline.list → today's activity
 *   - ghl.connectionStatus → system status
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Bell, Settings, ChevronRight, ArrowRight, Activity, Zap,
  BarChart3, Users, DollarSign, Target, Clock, Brain,
  Shield, Globe, RefreshCw, MoreHorizontal,
  Star, ArrowUpRight, ArrowDownRight, Cpu, Database,
  Calendar, Eye, Plug, ChevronDown
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AreaChart, Area, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Business Score Ring Component
// ─────────────────────────────────────────────────────────────────────────────

function BusinessScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const animatedOffset = circumference - (animated / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,212,200,0.1)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#00D4C8" strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={animatedOffset}
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

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card Component
// ─────────────────────────────────────────────────────────────────────────────

type LiveRec = {
  id: number;
  title: string;
  why: string;
  whyNow: string;
  businessImpact: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendedAction: string;
  measurementPlan: string;
  confidenceScore: number;
  confidenceFactors: unknown;
  evidence: unknown;
  category: string;
  priority: string;
  status: string | null;
  createdAt: Date;
};

const RISK_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#00D4C8",
  low: "#10B981",
};

function RecommendationCard({ rec, index, tenantId }: { rec: LiveRec; index: number; tenantId: string }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const feedbackMutation = trpc.recommendations.feedback.useMutation({
    onSuccess: () => {
      utils.recommendations.list.invalidate({ tenantId });
    },
  });

  const color = RISK_COLOR[rec.riskLevel] ?? "#00D4C8";
  const evidence = Array.isArray(rec.evidence) ? rec.evidence as string[] : [];
  const timeAgo = (() => {
    const diffMs = Date.now() - new Date(rec.createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    return `${Math.floor(diffHr / 24)} days ago`;
  })();

  return (
    <div
      className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-250 hover:border-[rgba(0,212,200,0.3)]"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-1 rounded-full shrink-0 mt-1"
          style={{ height: expanded ? "auto" : "40px", minHeight: "40px", background: color, boxShadow: `0 0 8px ${color}60` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {rec.priority}
              </span>
              <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {rec.category} · {timeAgo}
              </span>
            </div>
            <div className="text-[10px] text-[#00D4C8] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {rec.confidenceScore}% confidence
            </div>
          </div>
          <h4 className="text-sm font-semibold text-[#E8EDF5] mb-1 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {rec.title}
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              IE · {rec.riskLevel} risk
            </span>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-[rgba(0,212,200,0.08)] space-y-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <div className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why This Matters</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.why}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why Now</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.whyNow}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Business Impact</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.businessImpact}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#00D4C8] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Recommended Action</div>
                <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">{rec.recommendedAction}</p>
              </div>
              {evidence.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#00D4C8] uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Supporting Signals</div>
                  <div className="flex flex-wrap gap-1.5">
                    {evidence.map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] text-[#00D4C8]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold text-[#E8EDF5]/40 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IE Confidence</div>
                  <div className="text-[10px] font-bold" style={{ color: rec.confidenceScore >= 85 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{rec.confidenceScore}%</div>
                </div>
                <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${rec.confidenceScore}%`, background: rec.confidenceScore >= 85 ? "#10B981" : "#F59E0B" }} />
                </div>
              </div>
              <div className="p-3 rounded-lg border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.05)]">
                <div className="text-[10px] font-bold text-[#6366F1] uppercase tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Measurement Plan</div>
                <p className="text-[11px] text-[#E8EDF5]/60 leading-relaxed">{rec.measurementPlan}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => feedbackMutation.mutate({ recommendationId: rec.id, tenantId, decision: "accepted" })}
                  disabled={feedbackMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md hover:bg-[#00E8DB] transition-all duration-200 disabled:opacity-50"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-3 h-3" />
                  Accept
                </button>
                <button
                  onClick={() => feedbackMutation.mutate({ recommendationId: rec.id, tenantId, decision: "deferred" })}
                  disabled={feedbackMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#E8EDF5]/60 border border-[rgba(255,255,255,0.1)] rounded-md hover:text-[#E8EDF5]/90 transition-all duration-200 disabled:opacity-50"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Defer
                </button>
                <button
                  onClick={() => feedbackMutation.mutate({ recommendationId: rec.id, tenantId, decision: "rejected" })}
                  disabled={feedbackMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#E8EDF5]/30 hover:text-[#EF4444] transition-all duration-200 disabled:opacity-50"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-[#E8EDF5]/30 shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ExecutiveHome() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showSubaccountPicker, setShowSubaccountPicker] = useState(false);

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

  // ── Live Data Queries ──

  // Subaccounts this user has access to
  const { data: subaccounts = [] } = trpc.tenant.mySubaccounts.useQuery(undefined, {
    enabled: !!user,
  });

  // Auto-select the first subaccount when data loads
  useEffect(() => {
    if (subaccounts.length > 0 && !selectedTenantId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [subaccounts, selectedTenantId]);

  const tenantId = selectedTenantId ?? subaccounts[0]?.ghlLocationId ?? "";
  const selectedSubaccount = subaccounts.find(s => s.ghlLocationId === tenantId);

  const { data: memory, isLoading: memoryLoading } = trpc.memory.get.useQuery(
    { tenantId },
    { enabled: !!tenantId, refetchInterval: 60000 }
  );

  const { data: recommendations = [], isLoading: recsLoading, refetch: refetchRecs } = trpc.recommendations.list.useQuery(
    { tenantId },
    { enabled: !!tenantId, refetchInterval: 120000 }
  );

  const { data: timelineEvents = [], isLoading: timelineLoading } = trpc.timeline.list.useQuery(
    { tenantId, limit: 7 },
    { enabled: !!tenantId, refetchInterval: 60000 }
  );

  const { data: ghlStatus } = trpc.ghl.connectionStatus.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const generateMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => refetchRecs(),
  });

  // ── Derived KPIs from Business Memory ──
  const healthScore = memory?.healthScore ?? 0;
  const healthComponents = (memory?.healthScoreComponents as Array<{ label: string; score: number; color: string }> | null) ?? [];

  const kpiCards = useMemo(() => {
    if (!memory) return [];
    return [
      {
        id: "k1", label: "Pipeline Value", value: `$${((memory.totalPipelineValue ?? 0) / 1000000).toFixed(1)}M`,
        delta: "", trend: "up" as const, sub: `${memory.activeOpportunities ?? 0} active opportunities`,
        color: "#10B981", icon: Target,
        sparkline: [0, 0, 0, 0, 0, 0, 0, memory.totalPipelineValue ?? 0],
      },
      {
        id: "k2", label: "Total Contacts", value: (memory.totalContacts ?? 0).toLocaleString(),
        delta: `+${memory.newContactsLast7d ?? 0} this week`, trend: "up" as const,
        sub: `${memory.newContactsLast30d ?? 0} new last 30 days`, color: "#00D4C8", icon: Users,
        sparkline: [0, 0, 0, 0, 0, 0, 0, memory.totalContacts ?? 0],
      },
      {
        id: "k3", label: "Appointments (7d)", value: (memory.appointmentsLast7d ?? 0).toString(),
        delta: "", trend: "up" as const, sub: `${memory.appointmentsLast30d ?? 0} last 30 days`,
        color: "#00D4C8", icon: Calendar,
        sparkline: [0, 0, 0, 0, 0, 0, 0, memory.appointmentsLast7d ?? 0],
      },
      {
        id: "k4", label: "Won (30d)", value: (memory.wonOpportunitiesLast30d ?? 0).toString(),
        delta: "", trend: "up" as const, sub: `${memory.lostOpportunitiesLast30d ?? 0} lost`,
        color: "#10B981", icon: Star,
        sparkline: [0, 0, 0, 0, 0, 0, 0, memory.wonOpportunitiesLast30d ?? 0],
      },
      {
        id: "k5", label: "Signals (24h)", value: (memory.signalCount24h ?? 0).toString(),
        delta: "", trend: "up" as const, sub: `${memory.signalCount7d ?? 0} this week`,
        color: "#6366F1", icon: Activity,
        sparkline: [0, 0, 0, 0, 0, 0, 0, memory.signalCount24h ?? 0],
      },
      {
        id: "k6", label: "Health Score", value: `${healthScore}/100`,
        delta: memory.healthScoreTrend === "up" ? "↑" : memory.healthScoreTrend === "down" ? "↓" : "—",
        trend: (memory.healthScoreTrend ?? "neutral") as "up" | "down" | "neutral",
        sub: "IE composite score", color: healthScore >= 70 ? "#10B981" : healthScore >= 50 ? "#F59E0B" : "#EF4444",
        icon: Brain,
        sparkline: [0, 0, 0, 0, 0, 0, 0, healthScore],
      },
    ];
  }, [memory, healthScore]);

  const isConnected = ghlStatus?.connected ?? false;
  const criticalCount = recommendations.filter(r => r.riskLevel === "critical").length;

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

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
                    {userInitials}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </div>
                  <div className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {dateStr}
                  </div>
                </div>
              </div>

              {/* Subaccount Selector + Status + Actions */}
              <div className="flex items-center gap-3">
                {/* Subaccount Picker */}
                {subaccounts.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSubaccountPicker(!showSubaccountPicker)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.04)] text-[#E8EDF5]/70 hover:text-[#00D4C8] hover:border-[rgba(0,212,200,0.4)] transition-all duration-200"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {selectedSubaccount?.name ?? "Select Subaccount"}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSubaccountPicker && (
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-[#0A1628] border border-[rgba(0,212,200,0.2)] rounded-xl shadow-xl overflow-hidden">
                        {subaccounts.map((sub) => (
                          <button
                            key={sub.ghlLocationId}
                            onClick={() => { setSelectedTenantId(sub.ghlLocationId); setShowSubaccountPicker(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(0,212,200,0.06)] transition-colors ${
                              sub.ghlLocationId === tenantId ? "bg-[rgba(0,212,200,0.08)] text-[#00D4C8]" : "text-[#E8EDF5]/70"
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${sub.ghlLocationId === tenantId ? "bg-[#00D4C8]" : "bg-[rgba(255,255,255,0.2)]"}`} />
                            <div>
                              <div className="text-xs font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{sub.name}</div>
                              <div className="text-[9px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sub.orgName}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Connection Status */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  isConnected
                    ? "bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)]"
                    : "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#10B981] animate-pulse" : "bg-[#EF4444]"}`} />
                  <span className={`text-[10px] font-medium ${isConnected ? "text-[#10B981]" : "text-[#EF4444]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {isConnected ? "GHL CONNECTED" : "NOT CONNECTED"}
                  </span>
                </div>

                {/* Notification badge */}
                {criticalCount > 0 && (
                  <Link
                    href="/ai-recommendations"
                    className="relative p-2 rounded-lg border border-[rgba(239,68,68,0.3)] text-[#EF4444] hover:border-[rgba(239,68,68,0.5)] transition-all duration-200"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center font-bold">
                      {criticalCount}
                    </span>
                  </Link>
                )}

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

        {/* ── No Subaccount State ── */}
        {!user && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Brain className="w-12 h-12 text-[#00D4C8]/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#E8EDF5] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sign in to access your EEOS dashboard
            </h3>
            <p className="text-sm text-[#E8EDF5]/50 mb-6">
              The Intelligence Engine is ready. Connect your GoHighLevel account to begin.
            </p>
            <Link
              href="/connect-ghl"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plug className="w-4 h-4" />
              Connect GoHighLevel
            </Link>
          </div>
        )}

        {user && !tenantId && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Database className="w-12 h-12 text-[#00D4C8]/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#E8EDF5] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              No GoHighLevel subaccounts connected
            </h3>
            <p className="text-sm text-[#E8EDF5]/50 mb-6">
              Connect a GoHighLevel location to activate the EEOS Intelligence Engine for your business.
            </p>
            <Link
              href="/connect-ghl"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plug className="w-4 h-4" />
              Connect GoHighLevel
            </Link>
          </div>
        )}

        {user && tenantId && (
          <>
            {/* ── ROW 1: Business Score + KPIs ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Business Score Card */}
              <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="section-label mb-4">Business Score</div>
                {memoryLoading ? (
                  <div className="w-[140px] h-[140px] rounded-full bg-[rgba(0,212,200,0.05)] animate-pulse" />
                ) : (
                  <>
                    <div className="relative">
                      <BusinessScoreRing score={healthScore} size={140} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {healthScore}
                        </span>
                        <div className={`flex items-center gap-1 text-xs mt-0.5 ${
                          memory?.healthScoreTrend === "up" ? "text-[#10B981]" : memory?.healthScoreTrend === "down" ? "text-[#EF4444]" : "text-[#F59E0B]"
                        }`}>
                          {memory?.healthScoreTrend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          IE Score
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 w-full space-y-2">
                      {healthComponents.length > 0 ? healthComponents.map((c) => (
                        <div key={c.label} className="flex items-center gap-2">
                          <div className="text-[10px] text-[#E8EDF5]/50 flex-1 text-left truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {c.label}
                          </div>
                          <div className="w-16 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${c.score}%`, background: c.color }} />
                          </div>
                          <div className="text-[10px] font-semibold text-[#E8EDF5]/70 w-6 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {c.score}
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] text-[#E8EDF5]/30 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Awaiting signals from GoHighLevel
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* KPI Grid */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {memoryLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="metric-card rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded mb-2" />
                      <div className="h-6 bg-[rgba(255,255,255,0.05)] rounded mb-1" />
                      <div className="h-3 bg-[rgba(255,255,255,0.03)] rounded" />
                    </div>
                  ))
                ) : kpiCards.map((kpi) => (
                  <div key={kpi.id} className="metric-card rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-[rgba(0,212,200,0.08)]">
                        <kpi.icon className="w-3.5 h-3.5 text-[#00D4C8]" />
                      </div>
                      {kpi.delta && (
                        <div className={`flex items-center gap-0.5 text-xs font-medium ${
                          kpi.trend === "up" ? "text-[#10B981]" : kpi.trend === "down" ? "text-[#EF4444]" : "text-[#F59E0B]"
                        }`}>
                          {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {kpi.delta}
                        </div>
                      )}
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

            {/* ── ROW 2: IE Recommendations + Today's Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* AI Recommendations */}
              <div className="lg:col-span-3 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="section-label mb-1">IE Recommendations</div>
                    <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {recommendations.length} active · Intelligence Engine
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateMutation.mutate({ tenantId })}
                      disabled={generateMutation.isPending || !isConnected}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.25)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200 disabled:opacity-40"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      title={!isConnected ? "Connect GoHighLevel first" : "Run Intelligence Engine"}
                    >
                      <RefreshCw className={`w-3 h-3 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                      Run IE
                    </button>
                    <Link
                      href="/ai-recommendations"
                      className="flex items-center gap-1 text-xs text-[#00D4C8] hover:text-[#00E8DB] transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {recsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded mb-2 w-3/4" />
                        <div className="h-3 bg-[rgba(255,255,255,0.03)] rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-10 h-10 text-[#E8EDF5]/15 mx-auto mb-3" />
                    <p className="text-sm text-[#E8EDF5]/40 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {isConnected ? "No active recommendations" : "GoHighLevel not connected"}
                    </p>
                    <p className="text-xs text-[#E8EDF5]/25">
                      {isConnected
                        ? "Click \"Run IE\" to generate recommendations from your live data."
                        : "Connect GoHighLevel to activate the Intelligence Engine."}
                    </p>
                    {!isConnected && (
                      <Link
                        href="/connect-ghl"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <Plug className="w-3 h-3" />
                        Connect GoHighLevel
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.slice(0, 3).map((rec, i) => (
                      <RecommendationCard key={rec.id} rec={rec} index={i} tenantId={tenantId} />
                    ))}
                    {recommendations.length > 3 && (
                      <Link
                        href="/ai-recommendations"
                        className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-[#00D4C8]/70 hover:text-[#00D4C8] border border-[rgba(0,212,200,0.1)] hover:border-[rgba(0,212,200,0.25)] rounded-xl transition-all duration-200"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        View {recommendations.length - 3} more recommendations
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Today's Activity (Timeline) */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="section-label mb-1">Recent Activity</div>
                    <div className="text-xs text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {dateStr}
                    </div>
                  </div>
                  <Link href="/executive-timeline" className="text-[10px] text-[#00D4C8] hover:text-[#00E8DB] transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Full timeline →
                  </Link>
                </div>

                {timelineLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.04)] shrink-0" />
                        <div className="flex-1">
                          <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded mb-1 w-full" />
                          <div className="h-2 bg-[rgba(255,255,255,0.03)] rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-[#E8EDF5]/15 mx-auto mb-2" />
                    <p className="text-xs text-[#E8EDF5]/35">No activity yet. Signals will appear here as GoHighLevel events are processed.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {timelineEvents.map((event, i) => {
                      const sigColor = event.significance === "critical" ? "#EF4444"
                        : event.significance === "high" ? "#F59E0B"
                        : event.significance === "medium" ? "#00D4C8" : "#E8EDF5";
                      const timeStr = new Date(event.occurredAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={event.id} className="flex items-start gap-3 py-3 border-b border-[rgba(0,212,200,0.05)] last:border-0">
                          <div className="flex flex-col items-center shrink-0 mt-0.5">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${sigColor}12`, border: `1px solid ${sigColor}25` }}>
                              <Activity className="w-3 h-3" style={{ color: sigColor }} />
                            </div>
                            {i < timelineEvents.length - 1 && (
                              <div className="w-px h-full mt-1 bg-[rgba(0,212,200,0.06)]" style={{ minHeight: "12px" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#E8EDF5]/75 leading-snug">{event.title}</p>
                            {event.entityName && (
                              <p className="text-[10px] text-[#E8EDF5]/35 mt-0.5">{event.entityName}</p>
                            )}
                          </div>
                          <div className="text-[9px] text-[#E8EDF5]/25 shrink-0 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {timeStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 3: Quick Actions + System Status ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Quick Actions */}
              <div className="glass-card rounded-2xl p-6">
                <div className="section-label mb-4">Quick Actions</div>
                <div className="space-y-2">
                  {[
                    { label: "Connect GoHighLevel", href: "/connect-ghl", icon: Plug, primary: !isConnected },
                    { label: "AI Recommendations", href: "/ai-recommendations", icon: Brain, primary: false },
                    { label: "Business Health", href: "/business-health", icon: BarChart3, primary: false },
                    { label: "Live Signals", href: "/live-signals", icon: Zap, primary: false },
                    { label: "Executive Timeline", href: "/executive-timeline", icon: Clock, primary: false },
                    { label: "Knowledge Graph", href: "/knowledge-graph", icon: Globe, primary: false },
                    { label: "Integration Health", href: "/integration-health", icon: Activity, primary: false },
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

              {/* System Status */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="section-label">System Status</div>
                  <Link href="/integration-health" className="text-[10px] text-[#00D4C8] hover:text-[#00E8DB] transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Full report →
                  </Link>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "GoHighLevel",
                      status: isConnected ? (ghlStatus?.isExpired ? "Token Expired" : "Connected") : "Not Connected",
                      color: isConnected && !ghlStatus?.isExpired ? "#10B981" : isConnected ? "#F59E0B" : "#EF4444",
                    },
                    {
                      label: "Intelligence Engine",
                      status: recommendations.length > 0 ? "Active" : "Idle",
                      color: recommendations.length > 0 ? "#10B981" : "#F59E0B",
                    },
                    {
                      label: "Signal Pipeline",
                      status: (memory?.signalCount24h ?? 0) > 0 ? `${memory?.signalCount24h} signals/24h` : "No signals",
                      color: (memory?.signalCount24h ?? 0) > 0 ? "#10B981" : "#F59E0B",
                    },
                    {
                      label: "Business Memory",
                      status: memory ? "Synced" : "Empty",
                      color: memory ? "#10B981" : "#F59E0B",
                    },
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

              {/* IE Accuracy */}
              <div className="glass-card rounded-2xl p-6">
                <div className="section-label mb-4">IE Accuracy</div>
                <IeAccuracyPanel tenantId={tenantId} />
              </div>
            </div>
          </>
        )}

        {/* ── BOTTOM CTA ── */}
        {!isConnected && user && (
          <div className="border-t border-[rgba(0,212,200,0.08)] pt-8 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Connect your GoHighLevel account. The IE turns approved signals into executive recommendations.
                </p>
                <p className="text-xs text-[#E8EDF5]/40 mt-0.5">
                  Engineering Principle: "Don't Build More. Build Accurate." — Every recommendation is grounded in real data.
                </p>
              </div>
              <Link
                href="/connect-ghl"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)] shrink-0"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Plug className="w-4 h-4" />
                Connect GoHighLevel
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IE Accuracy Panel — shows continuous learning metrics
// ─────────────────────────────────────────────────────────────────────────────

function IeAccuracyPanel({ tenantId }: { tenantId: string }) {
  const { data: metrics } = trpc.ie.metrics.useQuery({ tenantId }, { enabled: !!tenantId });

  if (!metrics) {
    return (
      <div className="text-center py-6">
        <Cpu className="w-8 h-8 text-[#E8EDF5]/15 mx-auto mb-2" />
        <p className="text-xs text-[#E8EDF5]/30">
          IE accuracy metrics will appear here after executive feedback is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[
        { label: "Acceptance Rate", value: `${((metrics.acceptanceRate ?? 0) * 100).toFixed(0)}%`, color: "#10B981" },
        { label: "Avg Confidence", value: `${((metrics.avgPredictedConfidence ?? 0) * 100).toFixed(0)}%`, color: "#00D4C8" },
        { label: "Calibration Error", value: `${((metrics.calibrationError ?? 0) * 100).toFixed(1)}%`, color: (metrics.calibrationError ?? 0) < 0.1 ? "#10B981" : "#F59E0B" },
        { label: "F1 Score", value: (metrics.f1Score ?? 0).toFixed(2), color: "#6366F1" },
        { label: "Total Feedback", value: (metrics.totalRecommendations ?? 0).toString(), color: "#E8EDF5" },
      ].map((m) => (
        <div key={m.label} className="flex items-center justify-between">
          <span className="text-[11px] text-[#E8EDF5]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</span>
          <span className="text-[11px] font-bold" style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}
