// AIRecommendations.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Sprint 15: Full trust anatomy — Confidence, Why This Matters, Business Impact,
//            Risk Level, Recommended Action, Supporting Business Signals
// Engineering Principle #1: "Don't Build More. Build Accurate."
// GHL API: GET /api/eeos/recommendations?tenantId=xxx&limit=20&category=all

import { useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign, Users,
  ArrowRight, Zap, ChevronDown, ChevronUp, Shield,
  TrendingUp, TrendingDown, Activity, BarChart3, Brain,
  XCircle, Target, Eye, Lightbulb, Database
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

// ── TRUST ANATOMY DATA SHAPE ───────────────────────────────────────────────
// Every recommendation answers six executive questions:
// 1. Why?            → whyThisMatters
// 2. Why now?        → urgencyReason
// 3. Why trust this? → confidence + signals
// 4. What's at stake? → businessImpact + riskIfIgnored
// 5. What do I do?   → recommendedAction
// 6. What signals?   → supportingSignals

type RiskLevel = "critical" | "high" | "medium" | "low";
type Category = "revenue" | "retention" | "operations" | "growth" | "risk";

interface Signal {
  source: string;        // e.g. "GoHighLevel CRM"
  field: string;         // e.g. "contact.last_activity_date"
  value: string;         // e.g. "23 days ago"
  interpretation: string; // plain-language meaning
}

interface TrustRecommendation {
  id: string;
  category: Category;
  riskLevel: RiskLevel;
  title: string;
  // Trust anatomy
  whyThisMatters: string;
  urgencyReason: string;
  businessImpact: string;
  estimatedValue: string;
  riskIfIgnored: string;
  recommendedAction: string;
  actionDeadline: string;
  confidence: number;
  confidenceRationale: string;
  supportingSignals: Signal[];
  // Meta
  createdAt: string;
  status: "new" | "in-progress" | "dismissed" | "completed";
}

const RECOMMENDATIONS: TrustRecommendation[] = [
  {
    id: "r1",
    category: "retention",
    riskLevel: "critical",
    title: "Cascade Partners — Disengagement Detected",
    whyThisMatters: "Cascade Partners represents $72,000 in annual recurring revenue. Contact activity has dropped 67% over the past 30 days, and no meaningful conversation has occurred in 23 days. This pattern precedes churn in 84% of similar accounts.",
    urgencyReason: "The 30-day disengagement window is the last reliable intervention point. Accounts that pass 45 days without executive contact have a 91% churn rate in this segment.",
    businessImpact: "$72,000 annual revenue at risk. If lost, replacement cost (new client acquisition) averages $18,000–$24,000 and 60–90 days.",
    estimatedValue: "$72,000",
    riskIfIgnored: "High probability of non-renewal at next contract review. Competitor outreach likely already in progress based on industry timing patterns.",
    recommendedAction: "Schedule an executive check-in call within 48 hours. Prepare a brief account health summary showing utilization, outcomes, and value delivered. Do not send a generic follow-up — this requires a personal, senior-level touch.",
    actionDeadline: "Within 48 hours",
    confidence: 91,
    confidenceRationale: "91% confidence based on 30-day activity trend, conversation gap analysis, and historical churn pattern matching across 847 similar service business accounts.",
    supportingSignals: [
      { source: "GoHighLevel CRM", field: "contact.last_activity_date", value: "23 days ago", interpretation: "No contact activity in 23 days — well above the 7-day average for healthy accounts." },
      { source: "GoHighLevel Conversations", field: "conversation.last_message_date", value: "23 days ago", interpretation: "Last meaningful exchange was 23 days ago. No response to the last 2 outbound messages." },
      { source: "GoHighLevel Pipeline", field: "opportunity.status", value: "No open opportunities", interpretation: "Zero open opportunities. Healthy accounts typically have 1–3 active opportunities at any time." },
      { source: "EEOS Pattern Engine", field: "churn_risk_score", value: "0.84", interpretation: "84% historical match to pre-churn behavioral pattern across comparable accounts." },
    ],
    createdAt: "2 hours ago",
    status: "new",
  },
  {
    id: "r2",
    category: "revenue",
    riskLevel: "high",
    title: "3 Qualified Proposals Stalled — $340K at Risk",
    whyThisMatters: "Three enterprise proposals — Northstar Health ($128K), Apex Logistics ($96K), and Summit Group ($116K) — have been in the proposal stage for 14+ days without progression. Industry data shows proposal win rates drop 40% after 14 days of silence.",
    urgencyReason: "Day 14 is the inflection point. After day 21, win probability drops below 30%. Two of the three prospects have opened the proposal document zero times in the last 7 days.",
    businessImpact: "$340,000 in combined pipeline value. At current close rate, recovering all three would represent the equivalent of 4.7 months of new business development.",
    estimatedValue: "$340,000",
    riskIfIgnored: "Proposals will expire from prospect consideration. Competitors who follow up consistently win 68% of stalled deals in this segment.",
    recommendedAction: "Assign a senior account rep to each prospect today. Personalize follow-up with a specific reference to their stated pain point from the discovery call. Offer a 20-minute 'proposal walkthrough' call — not a sales call. This reframes the engagement.",
    actionDeadline: "Next 3 days",
    confidence: 84,
    confidenceRationale: "84% confidence based on proposal stage duration, document engagement tracking, and win/loss pattern analysis from 1,200+ similar staffing proposals.",
    supportingSignals: [
      { source: "GoHighLevel Pipeline", field: "opportunity.stage", value: "Proposal — 14+ days", interpretation: "All three opportunities have been in Proposal stage for more than 14 days without a stage change." },
      { source: "GoHighLevel Pipeline", field: "opportunity.last_stage_change_date", value: "14–18 days ago", interpretation: "No pipeline movement detected. Healthy deal velocity in this segment is 5–7 days per stage." },
      { source: "GoHighLevel Pipeline", field: "opportunity.monetary_value", value: "$128K + $96K + $116K", interpretation: "Combined value of $340K represents 23% of current annual pipeline." },
      { source: "EEOS Engagement Model", field: "proposal_open_count_7d", value: "0 opens (2 of 3 prospects)", interpretation: "Two prospects have not opened the proposal document in 7 days, indicating low active consideration." },
    ],
    createdAt: "4 hours ago",
    status: "new",
  },
  {
    id: "r3",
    category: "operations",
    riskLevel: "high",
    title: "Recruiting Team at 92% Capacity — SLA Risk in 6 Days",
    whyThisMatters: "The recruiting department is operating at 92% utilization with 4 new client requisitions pending assignment. At current throughput, SLA commitments to Northstar Health ($128K contract) will be breached in 6 days.",
    urgencyReason: "SLA breach triggers a 15% contract penalty clause and creates grounds for early termination. The Northstar Health contract is in its first 90 days — the highest-risk period for churn.",
    businessImpact: "Potential $19,200 SLA penalty (15% of $128K). Risk of early contract termination valued at $128,000. Reputational impact with a reference account in the healthcare vertical.",
    estimatedValue: "$128,000",
    riskIfIgnored: "SLA breach in 6 days. Northstar Health has an escalation clause that triggers automatic executive review. This will require C-suite involvement to resolve.",
    recommendedAction: "Pre-approve 2 contract recruiter engagements today — this can be done in under 2 hours. Redistribute 3 lower-priority requisitions to Q3 with client notification. Do not wait for the weekly operations review.",
    actionDeadline: "Today",
    confidence: 88,
    confidenceRationale: "88% confidence based on current task queue depth, calendar booking data, historical throughput rates, and SLA contract terms extracted from the client record.",
    supportingSignals: [
      { source: "GoHighLevel Tasks", field: "user.task_count", value: "47 active tasks (team of 5)", interpretation: "Average 9.4 tasks per recruiter. Healthy capacity is 6–7. Team is operating above sustainable throughput." },
      { source: "GoHighLevel Calendar", field: "calendar.booked_slots", value: "94% booked this week", interpretation: "Calendar availability is near zero. No buffer for urgent requisitions." },
      { source: "GoHighLevel CRM", field: "contact.assigned_to", value: "4 unassigned requisitions", interpretation: "4 new client requisitions have no recruiter assigned. Each requires 3–5 days to fill." },
      { source: "EEOS SLA Engine", field: "sla_breach_probability", value: "0.88 in 6 days", interpretation: "88% probability of SLA breach within 6 days at current capacity and throughput." },
    ],
    createdAt: "6 hours ago",
    status: "new",
  },
  {
    id: "r4",
    category: "growth",
    riskLevel: "medium",
    title: "Healthcare Vertical Converting at 2.3x Average Rate",
    whyThisMatters: "Healthcare contacts in your pipeline convert at 11.2% vs. a 4.8% overall average — 2.3x higher. Email open rates are 3.1x higher and response times are 2.4x faster. Only 18% of your current pipeline is healthcare.",
    urgencyReason: "Q3 healthcare budget cycles open in 30 days. Decisions made in the next 3–4 weeks will determine Q4 contract awards. This is the highest-leverage acquisition window of the year for this vertical.",
    businessImpact: "Reallocating 30% of outbound capacity to healthcare could generate $180K–$240K in additional annual revenue based on current conversion rates and average contract values.",
    estimatedValue: "$180,000–$240,000",
    riskIfIgnored: "Missing the Q3 budget cycle means waiting until Q1 next year. Competitors with healthcare specialization are actively prospecting this segment.",
    recommendedAction: "Reallocate 30% of outbound capacity to healthcare-tagged contacts in GoHighLevel. Create one healthcare-specific case study using Northstar Health outcomes. Launch a targeted email sequence to the 47 healthcare contacts currently in the 'nurture' stage.",
    actionDeadline: "Next 30 days",
    confidence: 76,
    confidenceRationale: "76% confidence based on 6-month conversion rate analysis, email engagement data, and Q3 budget cycle timing patterns for healthcare organizations.",
    supportingSignals: [
      { source: "GoHighLevel Email", field: "email.open_rate", value: "Healthcare: 68% vs. 22% average", interpretation: "Healthcare contacts are 3.1x more likely to open outbound emails." },
      { source: "GoHighLevel Conversations", field: "conversation.response_time", value: "Healthcare: 4.2 hrs vs. 10.1 hrs average", interpretation: "Healthcare contacts respond 2.4x faster, indicating higher purchase intent." },
      { source: "GoHighLevel Pipeline", field: "opportunity.source + contact.industry", value: "11.2% healthcare close rate vs. 4.8% overall", interpretation: "Healthcare opportunities close at more than double the overall rate." },
      { source: "EEOS Vertical Engine", field: "vertical_concentration", value: "18% healthcare (47 contacts)", interpretation: "Healthcare is underrepresented relative to its conversion performance." },
    ],
    createdAt: "1 day ago",
    status: "new",
  },
  {
    id: "r5",
    category: "risk",
    riskLevel: "medium",
    title: "Cash Flow Gap Projected in 18 Days",
    whyThisMatters: "$94,000 in accounts receivable is overdue by 30+ days. Combined with the Q3 payroll cycle beginning in 18 days, EEOS projects a $62,000 cash flow gap that will require either collections acceleration or short-term financing.",
    urgencyReason: "Payroll is a fixed obligation. The 18-day window is sufficient to resolve through collections if action begins today. Waiting 7 more days reduces options to short-term financing only.",
    businessImpact: "$62,000 cash flow shortfall. Potential payroll disruption. Short-term financing at current rates would cost $3,100–$4,800 in interest.",
    estimatedValue: "$62,000",
    riskIfIgnored: "Payroll disruption risk in 18 days. If financing is required, cost is $3,100–$4,800. Repeated cash flow gaps increase operational risk score and may affect vendor terms.",
    recommendedAction: "Initiate collections calls on the 4 accounts with invoices overdue 30+ days today — prioritize the two largest ($31K and $28K). Offer a 2% early payment discount to accelerate collection. Negotiate 45-day payment terms on the 2 new client contracts being finalized.",
    actionDeadline: "Today",
    confidence: 82,
    confidenceRationale: "82% confidence based on accounts receivable aging data, payroll cycle timing, and cash flow projection model calibrated against 24 months of payment history.",
    supportingSignals: [
      { source: "GoHighLevel Payments", field: "invoice.status", value: "$94K overdue 30+ days (4 invoices)", interpretation: "Four invoices totaling $94K are more than 30 days past due." },
      { source: "GoHighLevel Payments", field: "invoice.due_date", value: "Oldest: 47 days overdue", interpretation: "The oldest overdue invoice is 47 days past due — approaching the 60-day write-off threshold." },
      { source: "GoHighLevel Payments", field: "payment.received_date", value: "Last payment: 31 days ago", interpretation: "No payments received in 31 days against a typical 14-day payment cycle." },
      { source: "EEOS Cash Flow Model", field: "projected_gap_18d", value: "$62,000 shortfall", interpretation: "Projection accounts for Q3 payroll ($156K), pending collections ($94K), and confirmed incoming payments ($48K)." },
    ],
    createdAt: "2 days ago",
    status: "in-progress",
  },
];

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; label: string; icon: any }> = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "Critical Risk", icon: XCircle },
  high: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", label: "High Risk", icon: AlertTriangle },
  medium: { color: "#6366F1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", label: "Medium Risk", icon: Activity },
  low: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", label: "Low Risk", icon: CheckCircle2 },
};

const CATEGORY_CONFIG: Record<Category, { color: string; label: string }> = {
  revenue: { color: "#10B981", label: "Revenue" },
  retention: { color: "#EF4444", label: "Retention" },
  operations: { color: "#F59E0B", label: "Operations" },
  growth: { color: "#00D4C8", label: "Growth" },
  risk: { color: "#7C3AED", label: "Risk" },
};

function ConfidenceBar({ value, rationale }: { value: number; rationale: string }) {
  const color = value >= 85 ? "#10B981" : value >= 70 ? "#F59E0B" : "#EF4444";
  const label = value >= 85 ? "High Confidence" : value >= 70 ? "Moderate Confidence" : "Lower Confidence";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{label} — {value}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <p className="text-[11px] text-[#E8EDF5]/45 leading-relaxed italic" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {rationale}
      </p>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold text-[#00D4C8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{signal.source}</span>
          <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>·</span>
          <span className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{signal.field}</span>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-xs font-semibold text-[#E8EDF5]/80">{signal.value}</span>
          <span className="text-xs text-[#E8EDF5]/45">— {signal.interpretation}</span>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: TrustRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const rConfig = RISK_CONFIG[rec.riskLevel];
  const cConfig = CATEGORY_CONFIG[rec.category];
  const RiskIcon = rConfig.icon;

  return (
    <div
      className="rounded-2xl border transition-all duration-300"
      style={{ background: rConfig.bg, borderColor: expanded ? rConfig.color : rConfig.border }}
    >
      {/* Card Header — always visible */}
      <button
        className="w-full text-left p-5 sm:p-6"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${rec.title} — ${rConfig.label}`}
      >
        <div className="flex items-start gap-4">
          {/* Risk indicator bar */}
          <div
            className="w-1 rounded-full shrink-0 mt-1 self-stretch min-h-[48px]"
            style={{ background: rConfig.color, boxShadow: `0 0 8px ${rConfig.color}50` }}
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0">
            {/* Badges */}
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
              {rec.status === "in-progress" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[rgba(0,212,200,0.1)] text-[#00D4C8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  IN PROGRESS
                </span>
              )}
              <span className="text-[10px] text-[#E8EDF5]/30 ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.createdAt}</span>
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-bold text-[#E8EDF5] leading-snug mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {rec.title}
            </h3>

            {/* Summary row — always visible */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-sm font-bold text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{rec.estimatedValue}</span>
                <span className="text-xs text-[#E8EDF5]/40">at stake</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-xs text-[#E8EDF5]/60">{rec.actionDeadline}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" style={{ color: rec.confidence >= 85 ? "#10B981" : "#F59E0B" }} />
                <span className="text-xs font-semibold" style={{ color: rec.confidence >= 85 ? "#10B981" : "#F59E0B" }}>{rec.confidence}% confidence</span>
              </div>
            </div>
          </div>

          {/* Expand toggle */}
          <div className="shrink-0 mt-1">
            {expanded
              ? <ChevronUp className="w-5 h-5 text-[#E8EDF5]/40" />
              : <ChevronDown className="w-5 h-5 text-[#E8EDF5]/40" />
            }
          </div>
        </div>
      </button>

      {/* Expanded Trust Anatomy */}
      {expanded && (
        <div className="px-5 sm:px-6 pb-6 border-t border-[rgba(255,255,255,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">

            {/* Left column */}
            <div className="space-y-5">
              {/* Why This Matters */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why This Matters</span>
                </div>
                <p className="text-sm text-[#E8EDF5]/75 leading-relaxed">{rec.whyThisMatters}</p>
              </div>

              {/* Why Now */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Why Now</span>
                </div>
                <p className="text-sm text-[#E8EDF5]/75 leading-relaxed">{rec.urgencyReason}</p>
              </div>

              {/* Business Impact */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Business Impact</span>
                </div>
                <p className="text-sm text-[#E8EDF5]/75 leading-relaxed">{rec.businessImpact}</p>
              </div>

              {/* Risk If Ignored */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4" style={{ color: rConfig.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: rConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>Risk If Ignored</span>
                </div>
                <p className="text-sm text-[#E8EDF5]/75 leading-relaxed">{rec.riskIfIgnored}</p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Recommended Action */}
              <div className="p-4 rounded-xl border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#00D4C8]" />
                  <span className="text-xs font-bold text-[#00D4C8] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Recommended Action</span>
                </div>
                <p className="text-sm text-[#E8EDF5]/80 leading-relaxed mb-3">{rec.recommendedAction}</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DEADLINE: {rec.actionDeadline.toUpperCase()}</span>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <ConfidenceBar value={rec.confidence} rationale={rec.confidenceRationale} />
              </div>

              {/* Supporting Signals */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-[#00D4C8]" />
                  <span className="text-xs font-bold text-[#00D4C8] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Supporting Business Signals</span>
                </div>
                <div className="rounded-xl bg-[rgba(0,212,200,0.03)] border border-[rgba(0,212,200,0.1)] overflow-hidden">
                  {rec.supportingSignals.map((signal, i) => (
                    <SignalRow key={i} signal={signal} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              aria-label={`Take action on: ${rec.title}`}
            >
              <Zap className="w-4 h-4" />
              Take Action
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#E8EDF5]/60 border border-[rgba(255,255,255,0.1)] rounded-lg hover:text-[#E8EDF5]/90 hover:border-[rgba(255,255,255,0.2)] active:scale-[0.97] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Mark In Progress
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#E8EDF5]/40 hover:text-[#E8EDF5]/60 active:scale-[0.97] transition-all duration-200 ml-auto"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIRecommendations() {
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");

  const filtered = activeFilter === "all"
    ? RECOMMENDATIONS
    : RECOMMENDATIONS.filter(r => r.category === activeFilter);

  const criticalCount = RECOMMENDATIONS.filter(r => r.riskLevel === "critical").length;
  const highCount = RECOMMENDATIONS.filter(r => r.riskLevel === "high").length;
  const totalValue = RECOMMENDATIONS.reduce((sum, r) => {
    const num = parseFloat(r.estimatedValue.replace(/[$,K]/g, "")) * (r.estimatedValue.includes("K") ? 1000 : 1);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

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
                  <div className="section-label">AI Recommendations</div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    DEMO DATA
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  AI Recommendations
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1 max-w-xl">
                  Every recommendation answers: <span className="text-[#00D4C8]">Why?</span> <span className="text-[#00D4C8]">Why now?</span> <span className="text-[#00D4C8]">Why trust this?</span> <span className="text-[#00D4C8]">What if I ignore it?</span>
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

      {/* Trust Principle Banner */}
      <section className="py-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={80}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(0,212,200,0.05)] border border-[rgba(0,212,200,0.15)]">
              <Brain className="w-4 h-4 text-[#00D4C8] shrink-0" />
              <p className="text-xs text-[#E8EDF5]/60 leading-relaxed">
                <span className="text-[#00D4C8] font-semibold">Eagle Eye Automation Engineering Principle #1:</span>{" "}
                "Don't Build More. Build Accurate." Every recommendation is grounded in real GoHighLevel data signals, not guesswork.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={120}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total At Stake", value: `$${(totalValue / 1000).toFixed(0)}K`, color: "#10B981", icon: DollarSign },
                { label: "Critical", value: criticalCount.toString(), color: "#EF4444", icon: XCircle },
                { label: "High Risk", value: highCount.toString(), color: "#F59E0B", icon: AlertTriangle },
                { label: "Active Signals", value: `${RECOMMENDATIONS.reduce((s, r) => s + r.supportingSignals.length, 0)}`, color: "#00D4C8", icon: Activity },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                    <div className="text-[10px] text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.label.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Filter */}
      <section className="py-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Filter recommendations by category">
            {(["all", "retention", "revenue", "operations", "growth", "risk"] as const).map((f) => {
              const count = f === "all" ? RECOMMENDATIONS.length : RECOMMENDATIONS.filter(r => r.category === f).length;
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
                  {f === "all" ? "All" : config?.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-[rgba(0,212,200,0.2)]" : "bg-[rgba(255,255,255,0.06)]"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {filtered.map((rec, i) => (
              <AnimatedSection key={rec.id} delay={i * 60}>
                <RecommendationCard rec={rec} />
              </AnimatedSection>
            ))}

            {filtered.length === 0 && (
              <AnimatedSection>
                <div className="text-center py-20 glass-card rounded-2xl">
                  <Brain className="w-12 h-12 text-[#E8EDF5]/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#E8EDF5]/50 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No recommendations in this category</h3>
                  <p className="text-sm text-[#E8EDF5]/30">Connect GoHighLevel to generate real recommendations from your live business data.</p>
                  <Link href="/connect-ghl" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Zap className="w-4 h-4" />
                    Connect GoHighLevel
                  </Link>
                </div>
              </AnimatedSection>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
