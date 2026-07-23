/**
 * EEOS — AI Recommendations (Intelligence Engine Output)
 *
 * Every recommendation answers SEVEN executive questions:
 * 1. Why?            → why
 * 2. Why now?        → whyNow
 * 3. Why trust this? → confidenceScore + evidence
 * 4. What's at stake? → businessImpact + riskLevel
 * 5. What do I do?   → recommendedAction
 * 6. What signals?   → evidence (supporting signals)
 * 7. How will I know it worked? → measurementPlan
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign,
  ArrowRight, Zap, ChevronDown, ChevronUp, Shield,
  TrendingUp, TrendingDown, Activity, BarChart3, Brain,
  XCircle, Target, Eye, Lightbulb, Database, ClipboardCheck,
  Loader2, RefreshCw, Building2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { useOwnerConnectionState } from "@/hooks/useOwnerConnectionState";
import { startLogin } from "@/const";

// ─────────────────────────────────────────────────────────────────────────────
// Types — aligned with DB schema
// ─────────────────────────────────────────────────────────────────────────────

type RiskLevel = "critical" | "high" | "medium" | "low";
type Category = "revenue" | "retention" | "operations" | "growth" | "risk";

type LiveRec = {
  id: number;
  tenantId: string;
  title: string;
  why: string;
  whyNow: string;
  businessImpact: string;
  riskLevel: RiskLevel;
  recommendedAction: string;
  measurementPlan: string;
  confidenceScore: number;
  confidenceFactors: unknown;
  evidence: unknown;
  category: string;
  priority: string;
  status: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "Critical Risk", icon: XCircle },
  high: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", label: "High Risk", icon: AlertTriangle },
  medium: { color: "#0F2747", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", label: "Medium Risk", icon: Activity },
  low: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", label: "Low Risk", icon: CheckCircle2 },
};

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  revenue: { color: "#10B981", label: "Revenue" },
  retention: { color: "#EF4444", label: "Retention" },
  operations: { color: "#F59E0B", label: "Operations" },
  growth: { color: "#C9A227", label: "Growth" },
  risk: { color: "#7C3AED", label: "Risk" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ConfidenceBar({ value, rationale }: { value: number; rationale: string }) {
  const color = value >= 85 ? "#10B981" : value >= 70 ? "#F59E0B" : "#EF4444";
  const label = value >= 85 ? "High Confidence" : value >= 70 ? "Moderate Confidence" : "Lower Confidence";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
            {label} — {value}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <p className="text-[11px] text-[#FFFFFF]/45 leading-relaxed italic" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {rationale}
      </p>
    </div>
  );
}

function EvidenceRow({ source, field, value, interpretation }: {
  source: string; field: string; value: string; interpretation: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{source}</span>
          <span className="text-[10px] text-[#FFFFFF]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>·</span>
          <span className="text-[10px] text-[#FFFFFF]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{field}</span>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-xs font-semibold text-[#FFFFFF]/80">{value}</span>
          <span className="text-xs text-[#FFFFFF]/45">— {interpretation}</span>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  tenantId,
  onFeedback,
}: {
  rec: LiveRec;
  tenantId: string;
  onFeedback: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const riskLevel = (rec.riskLevel ?? "medium") as RiskLevel;
  const rConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.medium;
  const cConfig = CATEGORY_CONFIG[rec.category] ?? { color: "#FFFFFF", label: rec.category };
  const RiskIcon = rConfig.icon;

  const utils = trpc.useUtils();
  const feedbackMutation = trpc.recommendations.feedback.useMutation({
    onSuccess: () => {
      onFeedback();
      utils.recommendations.list.invalidate({ tenantId });
    },
  });

  // Parse evidence from JSON
  const evidenceItems: Array<{ source: string; field: string; value: string; interpretation: string }> =
    Array.isArray(rec.evidence) ? rec.evidence as Array<{ source: string; field: string; value: string; interpretation: string }> : [];

  // Parse confidence factors
  const confidenceFactors = rec.confidenceFactors as { rationale?: string } | null;
  const confidenceRationale = confidenceFactors?.rationale ?? `${rec.confidenceScore}% confidence based on live GoHighLevel signals.`;

  const confidencePct = Math.round(rec.confidenceScore * 100);
  const isActioned = rec.status === "accepted" || rec.status === "rejected";

  const timeAgo = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  return (
    <div
      className="rounded-2xl border transition-all duration-300"
      style={{ background: rConfig.bg, borderColor: expanded ? rConfig.color : rConfig.border }}
    >
      {/* Card Header */}
      <button
        className="w-full text-left p-5 sm:p-6"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${rec.title} — ${rConfig.label}`}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-1 rounded-full shrink-0 mt-1 self-stretch min-h-[48px]"
            style={{ background: rConfig.color, boxShadow: `0 0 8px ${rConfig.color}50` }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${rConfig.color}18`, color: rConfig.color, border: `1px solid ${rConfig.color}30`, fontFamily: "'JetBrains Mono', monospace" }}
              >
                <RiskIcon className="w-3 h-3" />
                {rConfig.label.toUpperCase()}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ background: `${cConfig.color}12`, color: cConfig.color, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {cConfig.label.toUpperCase()}
              </span>
              {rec.status === "accepted" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[rgba(16,185,129,0.12)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ACCEPTED
                </span>
              )}
              {rec.status === "rejected" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#EF4444]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  REJECTED
                </span>
              )}
              <span className="text-[10px] text-[#FFFFFF]/30 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(rec.createdAt)}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#FFFFFF] leading-snug mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {rec.title}
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" style={{ color: confidencePct >= 85 ? "#10B981" : "#F59E0B" }} />
                <span className="text-xs font-semibold" style={{ color: confidencePct >= 85 ? "#10B981" : "#F59E0B" }}>
                  {confidencePct}% confidence
                </span>
              </div>
              {rec.expiresAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-xs text-[#FFFFFF]/60">
                    Expires {new Date(rec.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 mt-1">
            {expanded ? <ChevronUp className="w-5 h-5 text-[#FFFFFF]/40" /> : <ChevronDown className="w-5 h-5 text-[#FFFFFF]/40" />}
          </div>
        </div>
      </button>

      {/* Expanded Trust Anatomy */}
      {expanded && (
        <div className="px-5 sm:px-6 pb-6 border-t border-[rgba(255,255,255,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">

            {/* Left column */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why This Matters</span>
                </div>
                <p className="text-sm text-[#FFFFFF]/75 leading-relaxed">{rec.why}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why Now</span>
                </div>
                <p className="text-sm text-[#FFFFFF]/75 leading-relaxed">{rec.whyNow}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Business Impact</span>
                </div>
                <p className="text-sm text-[#FFFFFF]/75 leading-relaxed">{rec.businessImpact}</p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-[rgba(201,162,39,0.2)] bg-[rgba(201,162,39,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-xs font-bold text-[#C9A227] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Recommended Action</span>
                </div>
                <p className="text-sm text-[#FFFFFF]/80 leading-relaxed">{rec.recommendedAction}</p>
              </div>

              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <ConfidenceBar value={confidencePct} rationale={confidenceRationale} />
              </div>

              {evidenceItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#C9A227]" />
                    <span className="text-xs font-bold text-[#C9A227] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Supporting Business Signals</span>
                  </div>
                  <div className="rounded-xl bg-[rgba(201,162,39,0.03)] border border-[rgba(201,162,39,0.1)] overflow-hidden">
                    {evidenceItems.map((item, i) => (
                      <EvidenceRow key={i} {...item} />
                    ))}
                  </div>
                </div>
              )}

              {rec.measurementPlan && (
                <div className="p-4 rounded-xl border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.05)]">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck className="w-4 h-4 text-[#0F2747]" />
                    <span className="text-xs font-bold text-[#0F2747] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Measurement Plan</span>
                  </div>
                  <p className="text-xs text-[#FFFFFF]/65 leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {rec.measurementPlan}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action CTA */}
          {!isActioned && (
            <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
              <button
                onClick={() => feedbackMutation.mutate({
                  recommendationId: rec.id,
                  tenantId,
                  decision: "accepted",
                })}
                disabled={feedbackMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)] disabled:opacity-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {feedbackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Accept & Act
              </button>
              <button
                onClick={() => feedbackMutation.mutate({
                  recommendationId: rec.id,
                  tenantId,
                  decision: "deferred",
                })}
                disabled={feedbackMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FFFFFF]/60 border border-[rgba(255,255,255,0.1)] rounded-lg hover:text-[#FFFFFF]/90 hover:border-[rgba(255,255,255,0.2)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Defer
              </button>
              <button
                onClick={() => feedbackMutation.mutate({
                  recommendationId: rec.id,
                  tenantId,
                  decision: "rejected",
                })}
                disabled={feedbackMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FFFFFF]/40 hover:text-[#EF4444]/70 active:scale-[0.97] transition-all duration-200 ml-auto disabled:opacity-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Dismiss
              </button>
            </div>
          )}

          {isActioned && (
            <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#FFFFFF]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Feedback recorded — IE will incorporate this into future recommendations.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AIRecommendations() {
  const ownerConnectionState = useOwnerConnectionState();
  const { isAuthenticated, subaccounts, hasConnectedLocations, connectionsLoading, accessState } = ownerConnectionState;
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Auto-select first subaccount
  useEffect(() => {
    if (subaccounts.length > 0 && !selectedTenantId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [subaccounts, selectedTenantId]);

  const tenantId = selectedTenantId || subaccounts[0]?.ghlLocationId || "";

  // Load live recommendations
  const { data: recommendations = [], isLoading, refetch } = trpc.recommendations.list.useQuery(
    { tenantId },
    { enabled: !!tenantId, refetchInterval: 60_000 }
  );

  // IE generate mutation
  const generateMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => refetch(),
  });

  const filtered = activeFilter === "all"
    ? recommendations
    : recommendations.filter(r => r.category === activeFilter);

  const criticalCount = recommendations.filter(r => r.riskLevel === "critical").length;
  const highCount = recommendations.filter(r => r.riskLevel === "high").length;
  const categories = Array.from(new Set(recommendations.map(r => r.category)));

  const noSubaccounts = isAuthenticated && !hasConnectedLocations;

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
                  <div className="section-label">Intelligence Engine</div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    LIVE
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Executive Recommendations
                </h1>
                <p className="text-sm text-[#FFFFFF]/50 mt-1 max-w-xl">
                  Every recommendation answers: <span className="text-[#C9A227]">Why?</span>{" "}
                  <span className="text-[#C9A227]">Why now?</span>{" "}
                  <span className="text-[#C9A227]">Why trust this?</span>{" "}
                  <span className="text-[#C9A227]">What if I ignore it?</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {tenantId && (
                  <button
                    onClick={() => generateMutation.mutate({ tenantId })}
                    disabled={generateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.2)] rounded-lg hover:bg-[rgba(201,162,39,0.06)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Run IE
                  </button>
                )}
                {!hasConnectedLocations && (
                  <Link
                    href="/connect-ghl"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)]"
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

      {/* IE Principle Banner */}
      <section className="py-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={80}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.15)]">
              <Brain className="w-4 h-4 text-[#C9A227] shrink-0" />
              <p className="text-xs text-[#FFFFFF]/60 leading-relaxed">
                <span className="text-[#C9A227] font-semibold">Eagle Eye Automation Engineering Principle #1:</span>{" "}
                "Don't Build More. Build Accurate." Every recommendation is grounded in real GoHighLevel data signals, not guesswork.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Summary Stats */}
      {recommendations.length > 0 && (
        <section className="py-4">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection delay={120}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Active", value: recommendations.length.toString(), color: "#C9A227", icon: Brain },
                  { label: "Critical", value: criticalCount.toString(), color: "#EF4444", icon: XCircle },
                  { label: "High Risk", value: highCount.toString(), color: "#F59E0B", icon: AlertTriangle },
                  { label: "Feedback Given", value: feedbackCount.toString(), color: "#10B981", icon: CheckCircle2 },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                      <div className="text-[10px] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.label.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Category Filter */}
      {recommendations.length > 0 && (
        <section className="py-3">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
              {(["all", ...categories] as string[]).map((f) => {
                const count = f === "all" ? recommendations.length : recommendations.filter(r => r.category === f).length;
                const config = f !== "all" ? CATEGORY_CONFIG[f] : null;
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
                    {f === "all" ? "All" : (config?.label ?? f)}
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

      {/* Recommendations List */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Not authenticated */}
          {accessState === "loading" && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
            </div>
          )}

          {accessState === "signin" && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Brain className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Sign in to view recommendations
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-6">
                  The Intelligence Engine generates recommendations scoped to your EEOS account.
                </p>
                <button
                  onClick={() => startLogin()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            </AnimatedSection>
          )}

          {/* No subaccounts connected */}
          {noSubaccounts && !connectionsLoading && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Database className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No GoHighLevel subaccounts connected
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-6">
                  Connect your GoHighLevel subaccounts to start generating executive recommendations.
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

          {/* Loading */}
          {isAuthenticated && tenantId && isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
            </div>
          )}

          {/* Empty state — connected but no recommendations yet */}
          {isAuthenticated && tenantId && !isLoading && recommendations.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Brain className="w-12 h-12 text-[#FFFFFF]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#FFFFFF]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No active recommendations
                </h3>
                <p className="text-sm text-[#FFFFFF]/30 mb-6">
                  Run the Intelligence Engine to generate recommendations from your live GoHighLevel signals.
                </p>
                <button
                  onClick={() => generateMutation.mutate({ tenantId })}
                  disabled={generateMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200 disabled:opacity-50"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Run Intelligence Engine
                </button>
              </div>
            </AnimatedSection>
          )}

          {/* Recommendations */}
          <div className="space-y-4">
            {filtered.map((rec, i) => (
              <AnimatedSection key={rec.id} delay={i * 60}>
                <RecommendationCard
                  rec={rec as LiveRec}
                  tenantId={tenantId}
                  onFeedback={() => setFeedbackCount(c => c + 1)}
                />
              </AnimatedSection>
            ))}
          </div>

          {/* No results for filter */}
          {isAuthenticated && tenantId && !isLoading && recommendations.length > 0 && filtered.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-12 glass-card rounded-2xl">
                <p className="text-sm text-[#FFFFFF]/40">No recommendations in the "{activeFilter}" category.</p>
                <button
                  onClick={() => setActiveFilter("all")}
                  className="mt-3 text-xs text-[#C9A227] hover:text-[#D8B84A] transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
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
