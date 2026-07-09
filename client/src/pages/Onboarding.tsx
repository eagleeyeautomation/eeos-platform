// EEOS Onboarding — Split-Screen Activation Wizard
// Left: form inputs | Right: live EEOS intelligence preview panel

import { useState } from "react";
import { Link } from "wouter";
import {
  Building2, Globe, LayoutGrid, Target, BarChart3, Plug, Users, CheckCircle2,
  ChevronRight, ChevronLeft, ArrowRight, Plus, X, Shield, Activity,
  Brain, Zap, Lock, Eye, TrendingUp, AlertTriangle
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Company", icon: Building2, title: "Identify your organization" },
  { id: 2, label: "Industry", icon: Globe, title: "Sector & classification" },
  { id: 3, label: "Locations", icon: Globe, title: "Operational footprint" },
  { id: 4, label: "Departments", icon: LayoutGrid, title: "Organizational structure" },
  { id: 5, label: "Goals", icon: Target, title: "Intelligence objectives" },
  { id: 6, label: "KPIs", icon: BarChart3, title: "Signal parameters" },
  { id: 7, label: "Software", icon: Plug, title: "Integration targets" },
  { id: 8, label: "Team", icon: Users, title: "Access credentials" },
];

const INDUSTRIES = [
  "Aerospace & Defense", "Financial Services", "Healthcare & Life Sciences",
  "Advanced Manufacturing", "Energy & Utilities", "Enterprise Technology",
  "Retail & Consumer", "Government & Public Sector", "Transportation & Logistics",
  "Real Estate & Infrastructure", "Media & Entertainment", "Professional Services",
];

const COMMON_GOALS = [
  "Real-time organizational visibility",
  "Faster executive decision-making",
  "Risk detection and early warning",
  "Strategic alignment across departments",
  "Talent intelligence and retention",
  "Supply chain resilience",
  "Regulatory compliance monitoring",
  "M&A intelligence and integration",
  "Board-level reporting efficiency",
  "Competitive intelligence",
];

const COMMON_KPIS = [
  "Revenue & Growth", "EBITDA / Profitability", "Customer Acquisition Cost",
  "Employee Retention Rate", "Operational Efficiency", "Supply Chain Health",
  "Market Share", "R&D Pipeline Value", "Regulatory Compliance Score",
  "Customer Satisfaction (NPS)", "Innovation Index", "ESG Metrics",
];

const SOFTWARE_CATEGORIES = [
  { category: "ERP", options: ["SAP", "Oracle ERP", "Microsoft Dynamics", "NetSuite", "Other"] },
  { category: "CRM", options: ["Salesforce", "HubSpot", "Microsoft CRM", "Other"] },
  { category: "HR", options: ["Workday", "SAP SuccessFactors", "ADP", "BambooHR", "Other"] },
  { category: "Finance", options: ["Oracle Finance", "SAP Finance", "Workday Finance", "Other"] },
  { category: "Analytics", options: ["Tableau", "Power BI", "Looker", "Qlik", "Other"] },
  { category: "Productivity", options: ["Microsoft 365", "Google Workspace", "Slack", "Other"] },
];

const TEAM_SIZES = [
  "1,000 – 5,000", "5,000 – 15,000", "15,000 – 50,000", "50,000 – 100,000", "100,000+",
];

const TIMELINES = [
  "ASAP (within 30 days)", "1–3 months", "3–6 months", "6–12 months", "Exploring options",
];

interface OnboardingData {
  companyName: string;
  website: string;
  revenue: string;
  industry: string;
  subSector: string;
  locations: string[];
  locationCount: string;
  departments: string[];
  goals: string[];
  kpis: string[];
  software: Record<string, string[]>;
  teamSize: string;
  executiveUsers: string;
  timeline: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
}

const initialData: OnboardingData = {
  companyName: "", website: "", revenue: "", industry: "", subSector: "",
  locations: [], locationCount: "", departments: [], goals: [], kpis: [],
  software: {}, teamSize: "", executiveUsers: "", timeline: "", firstName: "",
  lastName: "", email: "", title: "",
};

const DEPT_OPTIONS = [
  "Finance", "Operations", "Human Resources", "Legal & Compliance",
  "Sales & Marketing", "Technology / IT", "Research & Development",
  "Supply Chain", "Strategy", "Customer Success", "Manufacturing",
  "Procurement", "Risk Management", "Corporate Development",
];

// Live preview panel content per step
function LivePreviewPanel({ step, data }: { step: number; data: OnboardingData }) {
  const previewItems = [
    {
      step: 1,
      title: "Entity Recognition",
      status: data.companyName ? "ACTIVE" : "PENDING",
      statusColor: data.companyName ? "#10B981" : "#F59E0B",
      items: [
        { label: "Organization", value: data.companyName || "—", active: !!data.companyName },
        { label: "Revenue Band", value: data.revenue ? data.revenue.replace(/-/g, " – $").toUpperCase() : "—", active: !!data.revenue },
        { label: "Data Sources", value: "12 available", active: true },
        { label: "Connector Slots", value: "Unlimited", active: true },
      ],
    },
    {
      step: 2,
      title: "Industry Classification",
      status: data.industry ? "CLASSIFIED" : "PENDING",
      statusColor: data.industry ? "#10B981" : "#F59E0B",
      items: [
        { label: "Sector", value: data.industry || "—", active: !!data.industry },
        { label: "Intelligence Model", value: data.industry ? "Loading..." : "—", active: !!data.industry },
        { label: "Peer Benchmarks", value: data.industry ? "42 companies" : "—", active: !!data.industry },
        { label: "Regulatory Profile", value: data.industry ? "Configuring" : "—", active: !!data.industry },
      ],
    },
    {
      step: 3,
      title: "Operational Footprint",
      status: data.locations.length > 0 ? "MAPPED" : "PENDING",
      statusColor: data.locations.length > 0 ? "#10B981" : "#F59E0B",
      items: [
        { label: "Locations Mapped", value: data.locations.length > 0 ? `${data.locations.length} sites` : "—", active: data.locations.length > 0 },
        { label: "Geo Coverage", value: data.locations.length > 0 ? "Multi-region" : "—", active: data.locations.length > 0 },
        { label: "Time Zones", value: data.locations.length > 0 ? "Auto-detected" : "—", active: data.locations.length > 0 },
        { label: "Compliance Zones", value: data.locations.length > 0 ? "Calculating" : "—", active: data.locations.length > 0 },
      ],
    },
    {
      step: 4,
      title: "Org Structure",
      status: data.departments.length > 0 ? "CONFIGURED" : "PENDING",
      statusColor: data.departments.length > 0 ? "#10B981" : "#F59E0B",
      items: [
        { label: "Departments", value: data.departments.length > 0 ? `${data.departments.length} units` : "—", active: data.departments.length > 0 },
        { label: "Signal Nodes", value: data.departments.length > 0 ? `${data.departments.length * 8} configured` : "—", active: data.departments.length > 0 },
        { label: "Cross-dept Links", value: data.departments.length > 1 ? "Mapping..." : "—", active: data.departments.length > 1 },
        { label: "Knowledge Graph", value: data.departments.length > 0 ? "Building" : "—", active: data.departments.length > 0 },
      ],
    },
    {
      step: 5,
      title: "Intelligence Objectives",
      status: data.goals.length > 0 ? "SET" : "PENDING",
      statusColor: data.goals.length > 0 ? "#10B981" : "#F59E0B",
      items: [
        { label: "Objectives", value: data.goals.length > 0 ? `${data.goals.length} defined` : "—", active: data.goals.length > 0 },
        { label: "Priority Model", value: data.goals.length > 0 ? "Calibrating" : "—", active: data.goals.length > 0 },
        { label: "Alert Thresholds", value: data.goals.length > 0 ? "Auto-set" : "—", active: data.goals.length > 0 },
        { label: "Recommendation Engine", value: data.goals.length > 0 ? "Initializing" : "—", active: data.goals.length > 0 },
      ],
    },
    {
      step: 6,
      title: "Signal Parameters",
      status: data.kpis.length > 0 ? "DEFINED" : "PENDING",
      statusColor: data.kpis.length > 0 ? "#10B981" : "#F59E0B",
      items: [
        { label: "KPI Signals", value: data.kpis.length > 0 ? `${data.kpis.length} tracked` : "—", active: data.kpis.length > 0 },
        { label: "Benchmark Data", value: data.kpis.length > 0 ? "Loading" : "—", active: data.kpis.length > 0 },
        { label: "Anomaly Detection", value: data.kpis.length > 0 ? "Armed" : "—", active: data.kpis.length > 0 },
        { label: "Dashboard Widgets", value: data.kpis.length > 0 ? `${data.kpis.length} configured` : "—", active: data.kpis.length > 0 },
      ],
    },
    {
      step: 7,
      title: "Integration Targets",
      status: Object.values(data.software).some(a => a.length > 0) ? "IDENTIFIED" : "PENDING",
      statusColor: Object.values(data.software).some(a => a.length > 0) ? "#10B981" : "#F59E0B",
      items: [
        { label: "Systems Selected", value: Object.values(data.software).flat().length > 0 ? `${Object.values(data.software).flat().length} systems` : "—", active: Object.values(data.software).flat().length > 0 },
        { label: "Connector Type", value: "Read-only API", active: true },
        { label: "Data Replication", value: "None — never", active: true },
        { label: "Setup Estimate", value: Object.values(data.software).flat().length > 0 ? `${Object.values(data.software).flat().length * 2} hours` : "—", active: Object.values(data.software).flat().length > 0 },
      ],
    },
    {
      step: 8,
      title: "Access Provisioning",
      status: data.email ? "READY" : "PENDING",
      statusColor: data.email ? "#10B981" : "#F59E0B",
      items: [
        { label: "Primary Contact", value: data.email || "—", active: !!data.email },
        { label: "Team Size", value: data.teamSize || "—", active: !!data.teamSize },
        { label: "Activation Window", value: data.timeline || "—", active: !!data.timeline },
        { label: "Security Clearance", value: "SOC 2 Type II", active: true },
      ],
    },
  ];

  const current = previewItems[step - 1];

  // Activation checklist — all steps
  const completionMap = [
    { label: "Organization", done: !!data.companyName },
    { label: "Industry", done: !!data.industry },
    { label: "Locations", done: data.locations.length > 0 },
    { label: "Departments", done: data.departments.length > 0 },
    { label: "Goals", done: data.goals.length > 0 },
    { label: "KPIs", done: data.kpis.length > 0 },
    { label: "Software", done: Object.values(data.software).some(a => a.length > 0) },
    { label: "Team", done: !!data.email },
  ];

  const completedCount = completionMap.filter(c => c.done).length;
  const activationPct = Math.round((completedCount / 8) * 100);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Status header */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label text-[10px]">EEOS Activation Status</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{
              background: `${current.statusColor}18`,
              color: current.statusColor,
              border: `1px solid ${current.statusColor}40`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {current.status}
          </span>
        </div>
        <div className="text-xs text-[#E8EDF5]/50 mb-3"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {current.title}
        </div>
        <div className="space-y-2">
          {current.items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-[#E8EDF5]/45">{item.label}</span>
              <span
                className="text-xs font-medium"
                style={{
                  color: item.active && item.value !== "—" ? "#00D4C8" : "rgba(232,237,245,0.3)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activation progress */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label text-[10px]">Profile Completion</span>
          <span className="text-lg font-bold text-[#00D4C8]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {activationPct}%
          </span>
        </div>
        <div className="h-1.5 bg-[rgba(0,212,200,0.1)] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full progress-teal transition-all duration-700"
            style={{ width: `${activationPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {completionMap.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${item.done ? "bg-[#10B981]" : "bg-[rgba(0,212,200,0.15)]"}`} />
              <span className={`text-[10px] ${item.done ? "text-[#E8EDF5]/70" : "text-[#E8EDF5]/30"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security assurance */}
      <div className="glass-card rounded-xl p-4">
        <div className="section-label text-[10px] mb-3">Security Assurance</div>
        <div className="space-y-2">
          {[
            { icon: Lock, label: "End-to-end encrypted" },
            { icon: Eye, label: "Read-only connectors" },
            { icon: Shield, label: "SOC 2 Type II certified" },
            { icon: Activity, label: "Zero data replication" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-3 h-3 text-[#00D4C8] shrink-0" />
              <span className="text-xs text-[#E8EDF5]/55">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activation timeline */}
      <div className="glass-card rounded-xl p-4 flex-1">
        <div className="section-label text-[10px] mb-3">Activation Roadmap</div>
        <div className="space-y-2.5">
          {[
            { week: "Wk 1", label: "Technical discovery", done: activationPct >= 50 },
            { week: "Wk 2–3", label: "Connector setup", done: activationPct >= 75 },
            { week: "Wk 4–5", label: "Dashboard config", done: activationPct >= 90 },
            { week: "Wk 6", label: "Go-live", done: activationPct >= 100 },
          ].map((item) => (
            <div key={item.week} className="flex items-center gap-2">
              <div
                className={`w-8 text-[9px] font-semibold shrink-0 ${item.done ? "text-[#00D4C8]" : "text-[#E8EDF5]/25"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.week}
              </div>
              <div className={`h-px flex-1 ${item.done ? "bg-[rgba(0,212,200,0.4)]" : "bg-[rgba(0,212,200,0.08)]"}`} />
              <span className={`text-[10px] ${item.done ? "text-[#E8EDF5]/60" : "text-[#E8EDF5]/25"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [newLocation, setNewLocation] = useState("");
  const [completed, setCompleted] = useState(false);

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const toggleItem = (field: keyof OnboardingData, value: string) => {
    const arr = data[field] as string[];
    setData({
      ...data,
      [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  };

  const toggleSoftware = (category: string, value: string) => {
    const current = data.software[category] || [];
    setData({
      ...data,
      software: {
        ...data.software,
        [category]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      },
    });
  };

  const addLocation = () => {
    if (newLocation.trim() && !data.locations.includes(newLocation.trim())) {
      setData({ ...data, locations: [...data.locations, newLocation.trim()] });
      setNewLocation("");
    }
  };

  const handleSubmit = () => {
    setCompleted(true);
    toast.success("Activation profile submitted.", {
      description: "Your EEOS activation specialist will contact you within 24 hours.",
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.companyName.trim().length > 0;
      case 2: return data.industry.length > 0;
      case 3: return data.locations.length > 0;
      case 4: return data.departments.length > 0;
      case 5: return data.goals.length > 0;
      case 6: return data.kpis.length > 0;
      case 7: return Object.values(data.software).some((arr) => arr.length > 0);
      case 8: return data.teamSize.length > 0 && data.email.trim().length > 0;
      default: return true;
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[#050C1A] flex items-center justify-center">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 text-center pt-24">
          <div className="w-20 h-20 rounded-full bg-[rgba(0,212,200,0.1)] border-2 border-[#00D4C8] flex items-center justify-center mx-auto mb-8 animate-pulse-teal">
            <CheckCircle2 className="w-10 h-10 text-[#00D4C8]" />
          </div>
          <div className="section-label mb-3">Activation Confirmed</div>
          <h1
            className="text-4xl font-bold text-[#E8EDF5] mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Profile received.
            <br />
            <span className="gradient-text">EEOS activation begins.</span>
          </h1>
          <p className="text-lg text-[#E8EDF5]/65 mb-8">
            Your onboarding profile for <strong className="text-[#E8EDF5]">{data.companyName}</strong> has been submitted. Your dedicated EEOS activation specialist will contact you at <strong className="text-[#00D4C8]">{data.email}</strong> within 24 hours.
          </p>
          <div className="glass-card rounded-xl p-6 mb-8 text-left">
            <h3
              className="text-sm font-semibold text-[#E8EDF5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your activation roadmap
            </h3>
            <div className="space-y-3">
              {[
                { step: "Week 1", label: "Technical discovery & integration planning" },
                { step: "Week 2–3", label: "Connector configuration & data mapping" },
                { step: "Week 4–5", label: "Executive Dashboard configuration & testing" },
                { step: "Week 6", label: "Go-live & executive onboarding training" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-semibold text-[#00D4C8] shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.step}
                  </div>
                  <div className="h-px flex-1 bg-[rgba(0,212,200,0.15)]" />
                  <div className="text-sm text-[#E8EDF5]/70 flex-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Explore the Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Return to Command
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Split-screen layout */}
      <div className="flex min-h-screen pt-16">
        {/* LEFT — Form Panel */}
        <div className="flex-1 flex flex-col px-4 sm:px-8 lg:px-16 py-8 sm:py-12 w-full lg:max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="section-label mb-2">Activation Wizard</div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#E8EDF5] tracking-tight leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {STEPS[step - 1].title}
            </h1>
            <p className="text-[#E8EDF5]/50 mt-1 text-sm">
              Step {step} of {STEPS.length} — Provisioning secure intelligence access for your organization
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 text-[10px] font-bold ${
                    s.id === step
                      ? "bg-[#00D4C8] text-[#050C1A] shadow-[0_0_12px_rgba(0,212,200,0.5)]"
                      : s.id < step
                      ? "bg-[rgba(0,212,200,0.2)] text-[#00D4C8] border border-[rgba(0,212,200,0.4)] cursor-pointer"
                      : "bg-[rgba(0,212,200,0.05)] text-[#E8EDF5]/25 border border-[rgba(0,212,200,0.08)]"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.id < step ? <CheckCircle2 className="w-3 h-3" /> : s.id}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="h-px w-4 transition-all duration-500"
                    style={{
                      background: step > s.id
                        ? "rgba(0,212,200,0.4)"
                        : "rgba(0,212,200,0.08)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="h-0.5 bg-[rgba(0,212,200,0.08)] rounded-full mb-8 overflow-hidden">
            <div
              className="h-full rounded-full progress-teal transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Content */}
          <div className="flex-1">

            {/* STEP 1: Company */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={data.companyName}
                    onChange={(e) => setData({ ...data, companyName: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    placeholder="e.g. Meridian Global Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={data.website}
                    onChange={(e) => setData({ ...data, website: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Annual Revenue (approximate)
                  </label>
                  <select
                    value={data.revenue}
                    onChange={(e) => setData({ ...data, revenue: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input eeos-select"
                  >
                    <option value="" disabled>Select revenue range</option>
                    <option value="100m-500m">$100M – $500M</option>
                    <option value="500m-1b">$500M – $1B</option>
                    <option value="1b-5b">$1B – $5B</option>
                    <option value="5b-20b">$5B – $20B</option>
                    <option value="20b+">$20B+</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Industry */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-3 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Select your primary industry *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setData({ ...data, industry: ind })}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                          data.industry === ind
                            ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                            : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)] hover:text-[#E8EDF5]/85"
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                {data.industry && (
                  <div>
                    <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Sub-sector or specialization (optional)
                    </label>
                    <input
                      type="text"
                      value={data.subSector}
                      onChange={(e) => setData({ ...data, subSector: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      placeholder="e.g. Commercial Aviation, Investment Banking..."
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Locations */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-3 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Add your key operating locations *
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLocation()}
                      className="flex-1 px-4 py-3 rounded-lg text-sm eeos-input"
                      placeholder="e.g. New York, USA · London, UK"
                    />
                    <button
                      type="button"
                      onClick={addLocation}
                      className="px-4 py-3 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.3)] text-[#00D4C8] hover:bg-[rgba(0,212,200,0.15)] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {data.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.locations.map((loc) => (
                        <div
                          key={loc}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.25)] text-sm text-[#00D4C8]"
                        >
                          {loc}
                          <button
                            type="button"
                            onClick={() => setData({ ...data, locations: data.locations.filter((l) => l !== loc) })}
                            className="text-[#00D4C8]/60 hover:text-[#00D4C8]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Total number of locations / facilities
                  </label>
                  <select
                    value={data.locationCount}
                    onChange={(e) => setData({ ...data, locationCount: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input eeos-select"
                  >
                    <option value="" disabled>Select range</option>
                    <option value="1-5">1 – 5</option>
                    <option value="6-20">6 – 20</option>
                    <option value="21-50">21 – 50</option>
                    <option value="51-100">51 – 100</option>
                    <option value="100+">100+</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 4: Departments */}
            {step === 4 && (
              <div>
                <label className="block text-xs text-[#E8EDF5]/50 mb-3 uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Select departments EEOS should monitor *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPT_OPTIONS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleItem("departments", dept)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                        data.departments.includes(dept)
                          ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                          : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {data.departments.includes(dept) && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
                      {dept}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#E8EDF5]/40 mt-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {data.departments.length} selected · Select all that apply
                </p>
              </div>
            )}

            {/* STEP 5: Goals */}
            {step === 5 && (
              <div>
                <label className="block text-xs text-[#E8EDF5]/50 mb-3 uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Intelligence objectives *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {COMMON_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleItem("goals", goal)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium text-left transition-all duration-200 flex items-center gap-3 ${
                        data.goals.includes(goal)
                          ? "bg-[rgba(0,212,200,0.12)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                          : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        data.goals.includes(goal) ? "bg-[#00D4C8] border-[#00D4C8]" : "border-[rgba(0,212,200,0.3)]"
                      }`}>
                        {data.goals.includes(goal) && <CheckCircle2 className="w-3 h-3 text-[#050C1A]" />}
                      </div>
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: KPIs */}
            {step === 6 && (
              <div>
                <label className="block text-xs text-[#E8EDF5]/50 mb-3 uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Signal parameters — KPIs to track *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_KPIS.map((kpi) => (
                    <button
                      key={kpi}
                      type="button"
                      onClick={() => toggleItem("kpis", kpi)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                        data.kpis.includes(kpi)
                          ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                          : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)]"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {data.kpis.includes(kpi) && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
                      {kpi}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Software */}
            {step === 7 && (
              <div className="space-y-5">
                <p className="text-sm text-[#E8EDF5]/55">
                  Select your existing systems. EEOS will configure read-only connectors for each — no data is copied or stored.
                </p>
                {SOFTWARE_CATEGORIES.map((cat) => (
                  <div key={cat.category}>
                    <div className="text-xs font-semibold text-[#00D4C8] uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {cat.category}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleSoftware(cat.category, opt)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                            (data.software[cat.category] || []).includes(opt)
                              ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                              : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/60 hover:border-[rgba(0,212,200,0.25)]"
                          }`}
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 8: Team */}
            {step === 8 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={data.firstName}
                      onChange={(e) => setData({ ...data, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      placeholder="Alexandra"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={data.lastName}
                      onChange={(e) => setData({ ...data, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                      placeholder="Chen"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    placeholder="a.chen@yourcompany.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Your Title
                  </label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm eeos-input"
                    placeholder="Chief Executive Officer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-2 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Organization size *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEAM_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setData({ ...data, teamSize: size })}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium text-center transition-all duration-200 ${
                          data.teamSize === size
                            ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                            : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)]"
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDF5]/50 mb-2 uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Activation timeline
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {TIMELINES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setData({ ...data, timeline: t })}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                          data.timeline === t
                            ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.5)] text-[#00D4C8]"
                            : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:border-[rgba(0,212,200,0.25)]"
                        }`}
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-[rgba(0,212,200,0.1)]">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                step === 1
                  ? "text-[#E8EDF5]/25 cursor-not-allowed"
                  : "text-[#E8EDF5]/70 border border-[rgba(0,212,200,0.15)] hover:border-[rgba(0,212,200,0.3)] hover:text-[#E8EDF5]/90"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-xs text-[#E8EDF5]/30"
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
                    ? "bg-[#00D4C8] text-[#050C1A] hover:bg-[#00E8DB] shadow-[0_0_16px_rgba(0,212,200,0.35)]"
                    : "bg-[rgba(0,212,200,0.15)] text-[#00D4C8]/40 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => canProceed() && handleSubmit()}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  canProceed()
                    ? "bg-[#00D4C8] text-[#050C1A] hover:bg-[#00E8DB] shadow-[0_0_20px_rgba(0,212,200,0.4)]"
                    : "bg-[rgba(0,212,200,0.15)] text-[#00D4C8]/40 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Activate EEOS
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Live Preview Panel */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-[#0A1628] border-l border-[rgba(0,212,200,0.1)] px-6 py-12 overflow-y-auto sticky top-16 self-start h-[calc(100vh-4rem)]">
          {/* Panel header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs text-[#E8EDF5]/50"
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
