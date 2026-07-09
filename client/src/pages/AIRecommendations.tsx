// AIRecommendations.tsx
// Eagle Eye Automation — EEOS Executive Experience
// AI Recommendations: actionable intelligence cards surfaced from business signals
// All data shapes designed to consume real GoHighLevel data once backend is live.
// GHL data fields annotated inline for each recommendation type.

import { useState } from "react";
import { Link } from "wouter";
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, DollarSign, Users, Target, ArrowRight, Zap, Filter,
  ChevronRight, Star, Activity
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
// When backend is live, replace with:
// GET /api/eeos/recommendations?tenantId=xxx&limit=20&category=all

type RecommendationCategory = "revenue" | "retention" | "operations" | "growth" | "risk";
type RecommendationPriority = "critical" | "high" | "medium" | "low";
type RecommendationStatus = "new" | "in-progress" | "dismissed" | "completed";

interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  insight: string;
  action: string;
  impact: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
  confidence: number; // 0–100
  ghlSignals: string[]; // GHL data fields that triggered this recommendation
  estimatedValue: string;
  createdAt: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    category: "retention",
    priority: "critical",
    status: "new",
    title: "Cascade Partners showing disengagement signals",
    insight: "Contact activity dropped 67% over 30 days. Last meaningful conversation was 23 days ago. No open opportunities in pipeline.",
    action: "Schedule executive check-in call within 48 hours. Prepare account review with utilization data.",
    impact: "Prevents potential $72K annual revenue loss",
    effort: "low",
    timeframe: "This week",
    confidence: 91,
    ghlSignals: ["contact.last_activity_date", "conversation.last_message_date", "opportunity.status"],
    estimatedValue: "$72,000",
    createdAt: "2 hours ago",
  },
  {
    id: "r2",
    category: "revenue",
    priority: "high",
    status: "new",
    title: "3 qualified leads stalled in proposal stage for 14+ days",
    insight: "Northstar Health, Apex Logistics, and Summit Group have not progressed since proposal submission. Combined value: $340K.",
    action: "Trigger automated follow-up sequence. Assign senior account rep to each. Offer discovery call.",
    impact: "Recover $340K in stalled pipeline",
    effort: "low",
    timeframe: "Next 3 days",
    confidence: 84,
    ghlSignals: ["opportunity.stage", "opportunity.last_stage_change_date", "opportunity.monetary_value"],
    estimatedValue: "$340,000",
    createdAt: "4 hours ago",
  },
  {
    id: "r3",
    category: "operations",
    priority: "high",
    status: "new",
    title: "Recruiting team approaching capacity ceiling",
    insight: "Recruiting department at 92% utilization. 4 new client requisitions pending assignment. Risk of SLA breach in 6 days.",
    action: "Pre-approve 2 contract recruiter engagements. Redistribute 3 lower-priority requisitions to Q3.",
    impact: "Protect $128K Northstar Health contract SLA",
    effort: "medium",
    timeframe: "This week",
    confidence: 88,
    ghlSignals: ["user.task_count", "calendar.booked_slots", "contact.assigned_to"],
    estimatedValue: "$128,000",
    createdAt: "6 hours ago",
  },
  {
    id: "r4",
    category: "growth",
    priority: "medium",
    status: "new",
    title: "Healthcare vertical showing 3x engagement vs other sectors",
    insight: "Healthcare contacts open 3.1x more emails, respond 2.4x faster, and convert at 11.2% vs 4.8% overall. Only 18% of pipeline is healthcare.",
    action: "Reallocate 30% of outbound capacity to healthcare vertical. Create healthcare-specific case study.",
    impact: "Potential $180K additional annual revenue",
    effort: "medium",
    timeframe: "Next 30 days",
    confidence: 76,
    ghlSignals: ["email.open_rate", "conversation.response_time", "opportunity.source", "contact.industry"],
    estimatedValue: "$180,000",
    createdAt: "1 day ago",
  },
  {
    id: "r5",
    category: "risk",
    priority: "medium",
    status: "in-progress",
    title: "Cash flow gap projected in 18 days",
    insight: "Accounts receivable aging shows $94K overdue 30+ days. Combined with Q3 payroll cycle, a $62K gap is projected.",
    action: "Initiate collections on 4 overdue accounts. Negotiate 45-day payment terms with 2 new clients.",
    impact: "Prevent $62K cash flow shortfall",
    effort: "medium",
    timeframe: "Next 2 weeks",
    confidence: 82,
    ghlSignals: ["invoice.status", "invoice.due_date", "payment.received_date"],
    estimatedValue: "$62,000",
    createdAt: "2 days ago",
  },
  {
    id: "r6",
    category: "retention",
    priority: "medium",
    status: "new",
    title: "Vertex Solutions contract renewal in 45 days — low engagement",
    insight: "Contract renewal due Sept 15. Contact engagement score dropped to 55. No renewal conversation initiated.",
    action: "Schedule renewal review meeting. Prepare ROI report showing placement success metrics.",
    impact: "Retain $54K annual contract",
    effort: "low",
    timeframe: "Next 2 weeks",
    confidence: 79,
    ghlSignals: ["contact.engagement_score", "opportunity.close_date", "conversation.last_message_date"],
    estimatedValue: "$54,000",
    createdAt: "3 days ago",
  },
  {
    id: "r7",
    category: "growth",
    priority: "low",
    status: "new",
    title: "Referral program untapped — 12 satisfied clients with no referral activity",
    insight: "12 clients with health scores above 85 have never been asked for a referral. Average referral value in your sector: $28K.",
    action: "Launch referral outreach campaign to top 12 accounts. Offer service credit incentive.",
    impact: "Potential $336K in referred revenue",
    effort: "low",
    timeframe: "Next 60 days",
    confidence: 68,
    ghlSignals: ["contact.health_score", "contact.referral_source", "opportunity.source"],
    estimatedValue: "$336,000",
    createdAt: "5 days ago",
  },
];

const CATEGORIES: { id: RecommendationCategory | "all"; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Lightbulb },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "retention", label: "Retention", icon: Users },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "risk", label: "Risk", icon: AlertTriangle },
];

const PRIORITY_CONFIG = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", label: "CRITICAL" },
  high: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", label: "HIGH" },
  medium: { color: "#00D4C8", bg: "rgba(0,212,200,0.08)", border: "rgba(0,212,200,0.2)", label: "MEDIUM" },
  low: { color: "#6B7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)", label: "LOW" },
};

const CATEGORY_CONFIG: Record<RecommendationCategory, { color: string; icon: any }> = {
  revenue: { color: "#10B981", icon: DollarSign },
  retention: { color: "#00D4C8", icon: Users },
  operations: { color: "#7C3AED", icon: Activity },
  growth: { color: "#F59E0B", icon: TrendingUp },
  risk: { color: "#EF4444", icon: AlertTriangle },
};

export default function AIRecommendations() {
  const [activeCategory, setActiveCategory] = useState<RecommendationCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>("r1");

  const filtered = activeCategory === "all"
    ? RECOMMENDATIONS
    : RECOMMENDATIONS.filter((r) => r.category === activeCategory);

  const totalValue = RECOMMENDATIONS.reduce((sum, r) => {
    const n = parseInt(r.estimatedValue.replace(/[$,]/g, ""));
    return sum + n;
  }, 0);

  function formatCurrency(n: number) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
  }

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
                  <div className="section-label">AI Recommendations</div>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    DEMO DATA
                  </div>
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Executive Recommendations
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1">
                  EEOS surfaces actionable intelligence from your GoHighLevel signals — no manual analysis required.
                </p>
              </div>
              <Link
                href="/connect-ghl"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)] shrink-0 self-start"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-4 h-4" />
                Connect GoHighLevel
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Summary Bar */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Recommendations", value: RECOMMENDATIONS.length.toString(), color: "#00D4C8", icon: Lightbulb },
                { label: "Critical / High", value: RECOMMENDATIONS.filter(r => r.priority === "critical" || r.priority === "high").length.toString(), color: "#F59E0B", icon: AlertTriangle },
                { label: "Estimated Value", value: formatCurrency(totalValue), color: "#10B981", icon: DollarSign },
                { label: "Avg Confidence", value: `${Math.round(RECOMMENDATIONS.reduce((s, r) => s + r.confidence, 0) / RECOMMENDATIONS.length)}%`, color: "#7C3AED", icon: Star },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif", color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px] text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.label.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Recommendation categories">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all" ? RECOMMENDATIONS.length : RECOMMENDATIONS.filter(r => r.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "bg-[rgba(0,212,200,0.12)] text-[#00D4C8] border border-[rgba(0,212,200,0.3)]"
                      : "text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? "bg-[rgba(0,212,200,0.2)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recommendations List */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {filtered.map((rec, i) => {
              const pConfig = PRIORITY_CONFIG[rec.priority];
              const cConfig = CATEGORY_CONFIG[rec.category];
              const isExpanded = expandedId === rec.id;

              return (
                <AnimatedSection key={rec.id} delay={i * 60}>
                  <div
                    className={`glass-card rounded-2xl overflow-hidden border transition-all duration-300 ${
                      isExpanded ? "border-[rgba(0,212,200,0.25)]" : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(0,212,200,0.15)]"
                    }`}
                    style={{ borderLeftColor: pConfig.color, borderLeftWidth: "3px" }}
                  >
                    {/* Header Row */}
                    <button
                      className="w-full text-left p-5"
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`rec-body-${rec.id}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Category Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${cConfig.color}15` }}
                        >
                          <cConfig.icon className="w-5 h-5" style={{ color: cConfig.color }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: pConfig.bg, color: pConfig.color, border: `1px solid ${pConfig.border}`, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {pConfig.label}
                            </span>
                            <span
                              className="text-[10px] font-semibold capitalize"
                              style={{ color: cConfig.color, fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {rec.category}
                            </span>
                            <span className="text-[10px] text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {rec.createdAt}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-[#E8EDF5] leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {rec.title}
                          </h3>
                          {!isExpanded && (
                            <p className="text-sm text-[#E8EDF5]/50 mt-1 line-clamp-1">{rec.insight}</p>
                          )}
                        </div>

                        {/* Right Meta */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="hidden sm:block text-right">
                            <div className="text-sm font-bold text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{rec.estimatedValue}</div>
                            <div className="text-[10px] text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>est. value</div>
                          </div>
                          <div className="hidden sm:block text-right">
                            <div className="text-sm font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{rec.confidence}%</div>
                            <div className="text-[10px] text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>confidence</div>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-[#E8EDF5]/30 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div id={`rec-body-${rec.id}`} className="px-5 pb-5 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="pt-4 grid sm:grid-cols-2 gap-6">
                          {/* Left */}
                          <div className="space-y-4">
                            <div>
                              <div className="text-[10px] text-[#00D4C8] mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INSIGHT</div>
                              <p className="text-sm text-[#E8EDF5]/70 leading-relaxed">{rec.insight}</p>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#00D4C8] mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RECOMMENDED ACTION</div>
                              <p className="text-sm text-[#E8EDF5]/80 leading-relaxed">{rec.action}</p>
                            </div>
                          </div>

                          {/* Right */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "Impact", value: rec.impact, icon: Target },
                                { label: "Timeframe", value: rec.timeframe, icon: Clock },
                                { label: "Effort", value: rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1), icon: Activity },
                                { label: "Est. Value", value: rec.estimatedValue, icon: DollarSign },
                              ].map((item) => (
                                <div key={item.label} className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                                  <div className="text-[10px] text-[#E8EDF5]/40 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.label.toUpperCase()}</div>
                                  <div className="text-xs font-semibold text-[#E8EDF5]">{item.value}</div>
                                </div>
                              ))}
                            </div>

                            {/* GHL Signals */}
                            <div>
                              <div className="text-[10px] text-[#E8EDF5]/35 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                GHL SIGNALS USED
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {rec.ghlSignals.map((sig) => (
                                  <span
                                    key={sig}
                                    className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,212,200,0.06)] text-[#00D4C8]/70 border border-[rgba(0,212,200,0.1)]"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                  >
                                    {sig}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Confidence Bar */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="text-[10px] text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONFIDENCE</div>
                                <div className="text-[10px] font-bold text-[#E8EDF5]">{rec.confidence}%</div>
                              </div>
                              <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#00D4C8]"
                                  style={{ width: `${rec.confidence}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                          <button
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark In Progress
                          </button>
                          <button
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#E8EDF5]/60 border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.04)] active:scale-[0.97] transition-all duration-200"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <AnimatedSection>
              <div className="text-center py-20 glass-card rounded-2xl">
                <Lightbulb className="w-12 h-12 text-[#E8EDF5]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#E8EDF5]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  No recommendations in this category
                </h3>
                <p className="text-sm text-[#E8EDF5]/30">
                  Connect GoHighLevel to generate real recommendations from your live data.
                </p>
                <Link
                  href="/connect-ghl"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
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
                  These recommendations use your real signals.
                </h2>
                <p className="text-sm text-[#E8EDF5]/55 mt-1">
                  Connect GoHighLevel and EEOS surfaces recommendations from your live contact, pipeline, and conversation data.
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
