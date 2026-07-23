// EEOS — PRN Staffers Onboarding Wizard
// Sovereign Night Design System
// Sprint 11: Tailored onboarding for PRN Staffers connecting to EEOS

import { useState } from "react";
import { Link } from "wouter";
import {
  Building2, Users, Target, BarChart3, Plug, CheckCircle2,
  ChevronRight, ChevronLeft, ArrowRight, Shield, Activity,
  Zap, Lock, Eye, TrendingUp, AlertTriangle, MapPin, Globe,
  Briefcase, Clock, DollarSign, RefreshCw
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Agency", icon: Building2, title: "PRN Staffers profile" },
  { id: 2, label: "Markets", icon: Globe, title: "Markets & specializations" },
  { id: 3, label: "Operations", icon: Briefcase, title: "Operational structure" },
  { id: 4, label: "Goals", icon: Target, title: "Intelligence objectives" },
  { id: 5, label: "KPIs", icon: BarChart3, title: "Performance signals" },
  { id: 6, label: "Software", icon: Plug, title: "Connected systems" },
  { id: 7, label: "Connect", icon: Zap, title: "GoHighLevel connection" },
];

const STAFFING_MARKETS = [
  "Healthcare – Nursing", "Healthcare – Allied Health", "Healthcare – Physicians",
  "Technology & IT", "Finance & Accounting", "Executive & C-Suite",
  "Legal & Compliance", "Engineering", "Government & Defense",
  "Life Sciences", "Education", "Hospitality & Events",
];

const STAFFING_GOALS = [
  "Increase placement velocity",
  "Reduce time-to-fill",
  "Improve candidate retention",
  "Optimize recruiter performance",
  "Expand client accounts",
  "Reduce client churn",
  "Improve gross margin per placement",
  "Accelerate revenue forecasting",
  "Strengthen compliance monitoring",
  "Scale to new markets",
];

const STAFFING_KPIS = [
  "Placements per Month", "Time-to-Fill (Days)", "Gross Margin %",
  "Candidate Retention Rate", "Client Satisfaction (NPS)", "Recruiter Productivity",
  "Revenue per Recruiter", "Fill Rate %", "Redeployment Rate",
  "Contract vs. Perm Mix", "Job Order Volume", "Pipeline Conversion Rate",
];

const SOFTWARE_OPTIONS = [
  { category: "ATS / Staffing Platform", options: ["Bullhorn", "JobDiva", "Crelate", "Vincere", "PCRecruiter", "Other"] },
  { category: "CRM", options: ["GoHighLevel", "Salesforce", "HubSpot", "Zoho CRM", "Other"] },
  { category: "Payroll / Back Office", options: ["ADP", "Paychex", "Paylocity", "Staffmark", "Other"] },
  { category: "Finance", options: ["QuickBooks", "NetSuite", "Sage", "Xero", "Other"] },
  { category: "Communication", options: ["Microsoft Teams", "Slack", "Google Workspace", "Other"] },
  { category: "Analytics", options: ["Power BI", "Tableau", "Looker", "Google Analytics", "Other"] },
];

const TEAM_SIZES = ["1–10 recruiters", "11–25 recruiters", "26–50 recruiters", "51–100 recruiters", "100+ recruiters"];

interface PRNData {
  agencyName: string;
  website: string;
  annualRevenue: string;
  markets: string[];
  customMarket: string;
  officeLocations: string[];
  teamSize: string;
  placementsPerMonth: string;
  goals: string[];
  kpis: string[];
  software: Record<string, string[]>;
  ghlConnected: boolean;
  email: string;
  contactName: string;
  title: string;
}

const INITIAL_DATA: PRNData = {
  agencyName: "PRN Staffers",
  website: "",
  annualRevenue: "",
  markets: [],
  customMarket: "",
  officeLocations: [],
  teamSize: "",
  placementsPerMonth: "",
  goals: [],
  kpis: [],
  software: {},
  ghlConnected: false,
  email: "",
  contactName: "",
  title: "",
};

// Live preview panel showing what EEOS will surface based on selections
function LivePreviewPanel({ step, data }: { step: number; data: PRNData }) {
  const insights = [
    data.markets.length > 0 && `Monitoring ${data.markets.length} staffing market${data.markets.length > 1 ? "s" : ""}`,
    data.goals.length > 0 && `${data.goals.length} intelligence objective${data.goals.length > 1 ? "s" : ""} configured`,
    data.kpis.length > 0 && `${data.kpis.length} KPI signal${data.kpis.length > 1 ? "s" : ""} mapped`,
    Object.values(data.software).flat().length > 0 && `${Object.values(data.software).flat().length} integration${Object.values(data.software).flat().length > 1 ? "s" : ""} queued`,
    data.ghlConnected && "GoHighLevel — connected",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* Agency profile */}
      <div className="p-4 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.1)]">
        <div className="text-[10px] text-[#FFFFFF]/35 mb-2"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>AGENCY PROFILE</div>
        <div className="text-sm font-semibold text-[#FFFFFF]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {data.agencyName || "PRN Staffers"}
        </div>
        {data.teamSize && (
          <div className="text-xs text-[#FFFFFF]/50 mt-0.5">{data.teamSize}</div>
        )}
      </div>

      {/* Intelligence readiness */}
      <div className="p-4 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.1)]">
        <div className="text-[10px] text-[#FFFFFF]/35 mb-3"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>INTELLIGENCE READINESS</div>
        {insights.length === 0 ? (
          <div className="text-xs text-[#FFFFFF]/30">Complete the wizard to see your readiness score.</div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-[#C9A227] shrink-0" />
                <span className="text-xs text-[#FFFFFF]/65">{insight}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#FFFFFF]/35"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>READINESS</span>
            <span className="text-[10px] text-[#C9A227]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round((step / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="h-1 bg-[rgba(201,162,39,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full progress-teal transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* EEOS will surface */}
      <div className="p-4 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.1)]">
        <div className="text-[10px] text-[#FFFFFF]/35 mb-3"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>EEOS WILL SURFACE</div>
        <div className="space-y-2">
          {[
            { icon: TrendingUp, label: "Placement velocity trends" },
            { icon: AlertTriangle, label: "At-risk client accounts" },
            { icon: BarChart3, label: "Recruiter performance gaps" },
            { icon: DollarSign, label: "Margin optimization signals" },
            { icon: Activity, label: "Pipeline health alerts" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className="w-3 h-3 text-[#C9A227]/60 shrink-0" />
              <span className="text-xs text-[#FFFFFF]/40">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-[10px] text-[#FFFFFF]/25"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <Lock className="w-3 h-3 text-[#C9A227]" />
        <span>SOC 2 Type II · Read-only · Zero retention</span>
      </div>
    </div>
  );
}

export default function PRNOnboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PRNData>(INITIAL_DATA);
  const [completed, setCompleted] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const progress = (step / STEPS.length) * 100;

  const toggleArray = (field: keyof PRNData, value: string) => {
    const arr = (data[field] as string[]) || [];
    setData((d) => ({
      ...d,
      [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    }));
  };

  const toggleSoftware = (category: string, option: string) => {
    const current = data.software[category] || [];
    setData((d) => ({
      ...d,
      software: {
        ...d.software,
        [category]: current.includes(option) ? current.filter((v) => v !== option) : [...current, option],
      },
    }));
  };

  const addLocation = () => {
    if (locationInput.trim() && !data.officeLocations.includes(locationInput.trim())) {
      setData((d) => ({ ...d, officeLocations: [...d.officeLocations, locationInput.trim()] }));
      setLocationInput("");
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.agencyName.trim().length > 0 && data.email.trim().length > 0;
      case 2: return data.markets.length > 0;
      case 3: return data.teamSize.length > 0;
      case 4: return data.goals.length > 0;
      case 5: return data.kpis.length > 0;
      case 6: return Object.values(data.software).some((arr) => arr.length > 0);
      case 7: return true;
      default: return true;
    }
  };

  const handleSubmit = () => {
    toast.success("PRN Staffers profile submitted — EEOS activation begins.");
    setCompleted(true);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 text-center pt-24 pb-16">
          <div className="w-20 h-20 rounded-full bg-[rgba(201,162,39,0.1)] border-2 border-[#C9A227] flex items-center justify-center mx-auto mb-8 animate-pulse-teal">
            <CheckCircle2 className="w-10 h-10 text-[#C9A227]" />
          </div>
          <div className="section-label mb-3">Activation Confirmed</div>
          <h1 className="text-4xl font-bold text-[#FFFFFF] mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            PRN Staffers profile received.
            <br />
            <span className="gradient-text">EEOS activation begins.</span>
          </h1>
          <p className="text-lg text-[#FFFFFF]/65 mb-8">
            Your EEOS activation specialist will contact <strong className="text-[#C9A227]">{data.email}</strong> within 24 hours to begin the GoHighLevel connection and intelligence mapping.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/connect-ghl"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Plug className="w-4 h-4" />
              Connect GoHighLevel Now
            </Link>
            <Link href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.35)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Explore the Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      <div className="flex min-h-screen pt-16">
        {/* LEFT — Form */}
        <div className="flex-1 flex flex-col px-4 sm:px-8 lg:px-16 py-8 sm:py-12 w-full lg:max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="section-label">PRN Staffers Onboarding</div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(201,162,39,0.08)] border border-[rgba(201,162,39,0.2)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" />
                <span className="text-[10px] text-[#C9A227]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>STAFFING EDITION</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#FFFFFF] tracking-tight leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {STEPS[step - 1].title}
            </h1>
            <p className="text-[#FFFFFF]/50 mt-1 text-sm">
              Step {step} of {STEPS.length} — Configuring EEOS to transform PRN Staffers data into accurate executive intelligence
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 text-[10px] font-bold ${
                    s.id === step
                      ? "bg-[#C9A227] text-[#0B0B0B] shadow-[0_0_12px_rgba(201,162,39,0.5)]"
                      : s.id < step
                      ? "bg-[rgba(201,162,39,0.2)] text-[#C9A227] border border-[rgba(201,162,39,0.4)] cursor-pointer"
                      : "bg-[rgba(201,162,39,0.05)] text-[#FFFFFF]/25 border border-[rgba(201,162,39,0.08)]"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.id < step ? <CheckCircle2 className="w-3 h-3" /> : s.id}
                </button>
                {i < STEPS.length - 1 && (
                  <div className="h-px w-4 transition-all duration-500"
                    style={{ background: step > s.id ? "rgba(201,162,39,0.4)" : "rgba(201,162,39,0.08)" }} />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-[rgba(201,162,39,0.08)] rounded-full mb-8 overflow-hidden">
            <div className="h-full rounded-full progress-teal transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>

          {/* Step content */}
          <div className="flex-1">

            {/* STEP 1: Agency Profile */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>Agency Name *</label>
                    <input
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      value={data.agencyName}
                      onChange={(e) => setData((d) => ({ ...d, agencyName: e.target.value }))}
                      placeholder="PRN Staffers"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>Website</label>
                    <input
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      value={data.website}
                      onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
                      placeholder="prnstaffers.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>Contact Name *</label>
                    <input
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      value={data.contactName}
                      onChange={(e) => setData((d) => ({ ...d, contactName: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>Title</label>
                    <input
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      value={data.title}
                      onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
                      placeholder="CEO / COO / VP Operations"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Work Email *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    value={data.email}
                    onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
                    placeholder="you@prnstaffers.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Annual Revenue (approximate)</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input eeos-select"
                    value={data.annualRevenue}
                    onChange={(e) => setData((d) => ({ ...d, annualRevenue: e.target.value }))}
                  >
                    <option value="placeholder" disabled>Select range</option>
                    {["Under $1M", "$1M – $5M", "$5M – $20M", "$20M – $50M", "$50M – $100M", "$100M+"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Markets */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-[#FFFFFF]/55">Select all staffing markets PRN Staffers operates in.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAFFING_MARKETS.map((market) => (
                    <button
                      key={market}
                      type="button"
                      onClick={() => toggleArray("markets", market)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-left transition-all duration-200 ${
                        data.markets.includes(market)
                          ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                          : "bg-[rgba(15,30,53,0.6)] border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/65 hover:border-[rgba(201,162,39,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {data.markets.includes(market) && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {market}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Operations */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Recruiter Team Size *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TEAM_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setData((d) => ({ ...d, teamSize: size }))}
                        className={`px-4 py-3 rounded-lg text-sm text-left transition-all duration-200 ${
                          data.teamSize === size
                            ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                            : "bg-[rgba(15,30,53,0.6)] border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/65 hover:border-[rgba(201,162,39,0.25)]"
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#FFFFFF]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Monthly Placements (approximate)</label>
                  <input
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    value={data.placementsPerMonth}
                    onChange={(e) => setData((d) => ({ ...d, placementsPerMonth: e.target.value }))}
                    placeholder="e.g. 50–100 placements per month"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#FFFFFF]/50 mb-2 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Office Locations</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm eeos-input"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLocation()}
                      placeholder="City, State (e.g. Atlanta, GA)"
                    />
                    <button
                      type="button"
                      onClick={addLocation}
                      className="px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.officeLocations.map((loc) => (
                      <span key={loc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[rgba(201,162,39,0.1)] border border-[rgba(201,162,39,0.25)] text-[#C9A227]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <MapPin className="w-3 h-3" />
                        {loc}
                        <button onClick={() => setData((d) => ({ ...d, officeLocations: d.officeLocations.filter((l) => l !== loc) }))}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Goals */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-[#FFFFFF]/55">Select the intelligence objectives most important to PRN Staffers leadership.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAFFING_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleArray("goals", goal)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-left transition-all duration-200 ${
                        data.goals.includes(goal)
                          ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                          : "bg-[rgba(15,30,53,0.6)] border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/65 hover:border-[rgba(201,162,39,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {data.goals.includes(goal) && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: KPIs */}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-[#FFFFFF]/55">Select the KPIs EEOS should monitor and surface in your Executive Dashboard.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAFFING_KPIS.map((kpi) => (
                    <button
                      key={kpi}
                      type="button"
                      onClick={() => toggleArray("kpis", kpi)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-left transition-all duration-200 ${
                        data.kpis.includes(kpi)
                          ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                          : "bg-[rgba(15,30,53,0.6)] border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/65 hover:border-[rgba(201,162,39,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {data.kpis.includes(kpi) && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {kpi}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: Software */}
            {step === 6 && (
              <div className="space-y-5">
                <p className="text-sm text-[#FFFFFF]/55">Select the software systems PRN Staffers currently uses. EEOS will map integration connectors for each.</p>
                {SOFTWARE_OPTIONS.map((cat) => (
                  <div key={cat.category}>
                    <div className="text-xs text-[#FFFFFF]/45 mb-2 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{cat.category}</div>
                    <div className="flex flex-wrap gap-2">
                      {cat.options.map((opt) => {
                        const selected = (data.software[cat.category] || []).includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleSoftware(cat.category, opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                              selected
                                ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                                : "bg-[rgba(15,30,53,0.6)] border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/60 hover:border-[rgba(201,162,39,0.25)]"
                            }`}
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 7: GoHighLevel Connection */}
            {step === 7 && (
              <div className="space-y-6">
                <div className="glass-card rounded-xl p-6 border border-[rgba(201,162,39,0.2)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(201,162,39,0.1)] border border-[rgba(201,162,39,0.2)] flex items-center justify-center">
                      <Plug className="w-5 h-5 text-[#C9A227]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#FFFFFF]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Connect GoHighLevel</div>
                      <div className="text-xs text-[#FFFFFF]/45">Authorize read-only access to your GHL account</div>
                    </div>
                  </div>
                  <p className="text-sm text-[#FFFFFF]/60 mb-5 leading-relaxed">
                    EEOS will read your GoHighLevel contacts, pipelines, campaigns, and automation data to build PRN Staffers' intelligence model. You can connect now or after submitting your profile.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/connect-ghl"
                      className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_16px_rgba(201,162,39,0.3)]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Plug className="w-4 h-4" />
                      Connect GoHighLevel Now
                    </Link>
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, ghlConnected: false }))}
                      className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#FFFFFF]/55 border border-[rgba(232,237,245,0.1)] rounded-lg hover:border-[rgba(201,162,39,0.2)] transition-all duration-200"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Connect after submission
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-5">
                  <div className="text-xs text-[#FFFFFF]/35 mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>PROFILE SUMMARY</div>
                  <div className="space-y-2">
                    {[
                      { label: "Agency", value: data.agencyName },
                      { label: "Markets", value: data.markets.length > 0 ? `${data.markets.length} selected` : "—" },
                      { label: "Team Size", value: data.teamSize || "—" },
                      { label: "Goals", value: data.goals.length > 0 ? `${data.goals.length} objectives` : "—" },
                      { label: "KPIs", value: data.kpis.length > 0 ? `${data.kpis.length} signals` : "—" },
                      { label: "Integrations", value: Object.values(data.software).flat().length > 0 ? `${Object.values(data.software).flat().length} systems` : "—" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-[rgba(201,162,39,0.05)]">
                        <span className="text-xs text-[#FFFFFF]/40"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</span>
                        <span className="text-xs text-[#FFFFFF]/70"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(201,162,39,0.08)]">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                step === 1
                  ? "text-[#FFFFFF]/25 cursor-not-allowed"
                  : "text-[#FFFFFF]/70 border border-[rgba(201,162,39,0.15)] hover:border-[rgba(201,162,39,0.3)] hover:text-[#FFFFFF]/90"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-xs text-[#FFFFFF]/30"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {step} / {STEPS.length}
            </div>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => canProceed() && setStep(step + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  canProceed()
                    ? "bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A] shadow-[0_0_16px_rgba(201,162,39,0.35)]"
                    : "bg-[rgba(201,162,39,0.15)] text-[#C9A227]/40 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A] shadow-[0_0_20px_rgba(201,162,39,0.4)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Activate EEOS
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-[#141414] border-l border-[rgba(201,162,39,0.1)] px-6 py-12 overflow-y-auto sticky top-16 self-start h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs text-[#FFFFFF]/50"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              EEOS ACTIVATION CONSOLE
            </span>
          </div>
          <LivePreviewPanel step={step} data={data} />
        </div>
      </div>
    </div>
  );
}
