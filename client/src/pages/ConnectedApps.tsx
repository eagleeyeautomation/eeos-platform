// EEOS Connected Apps Page
// Manage all connected business systems — enterprise integration hub
// Sovereign Night design

import { useState } from "react";
import { Link } from "wouter";
import {
  Plus, CheckCircle2, AlertTriangle, XCircle, Settings,
  ArrowRight, Plug, Database, RefreshCw, Trash2,
  Shield, Clock, Activity, ChevronRight, Search,
  Zap, Eye, MoreHorizontal, ExternalLink
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const CONNECTED_APPS = [
  {
    id: "ghl",
    name: "GoHighLevel",
    category: "CRM & Marketing",
    description: "Full CRM, pipeline, contact, and marketing automation sync.",
    status: "connected" as const,
    connectedDate: "Jun 12, 2026",
    lastSync: "47 sec ago",
    permissions: ["Contacts", "Opportunities", "Pipelines", "Conversations", "Appointments", "Campaigns"],
    dataFlowIn: 2847,
    dataFlowOut: 0,
    icon: "GHL",
    color: "#00D4C8",
    critical: true,
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "Finance & Accounting",
    description: "P&L, invoices, expenses, payroll, and cash flow intelligence.",
    status: "connected" as const,
    connectedDate: "Jun 12, 2026",
    lastSync: "3 min ago",
    permissions: ["Invoices", "Expenses", "Profit & Loss", "Cash Flow", "Payroll Summary"],
    dataFlowIn: 312,
    dataFlowOut: 0,
    icon: "QB",
    color: "#10B981",
    critical: true,
  },
  {
    id: "workforce",
    name: "Workforce Management",
    category: "Operations",
    description: "Placement tracking, scheduling, utilization, and compliance.",
    status: "connected" as const,
    connectedDate: "Jun 14, 2026",
    lastSync: "1 min ago",
    permissions: ["Placements", "Schedules", "Timesheets", "Utilization", "Compliance"],
    dataFlowIn: 1204,
    dataFlowOut: 0,
    icon: "WF",
    color: "#00D4C8",
    critical: true,
  },
  {
    id: "analytics",
    name: "Business Analytics",
    category: "Intelligence",
    description: "KPI dashboards, benchmarking, forecasting, and trend analysis.",
    status: "degraded" as const,
    connectedDate: "Jun 15, 2026",
    lastSync: "12 min ago",
    permissions: ["KPIs", "Benchmarks", "Forecasts", "Trend Data"],
    dataFlowIn: 89,
    dataFlowOut: 0,
    icon: "BA",
    color: "#F59E0B",
    critical: false,
  },
  {
    id: "calendar",
    name: "Calendar & Scheduling",
    category: "Productivity",
    description: "Executive calendar, meeting intelligence, and task management.",
    status: "connected" as const,
    connectedDate: "Jun 16, 2026",
    lastSync: "8 sec ago",
    permissions: ["Calendar Events", "Tasks", "Availability", "Meeting Notes"],
    dataFlowIn: 156,
    dataFlowOut: 0,
    icon: "CAL",
    color: "#10B981",
    critical: false,
  },
  {
    id: "email",
    name: "Email Intelligence",
    category: "Communication",
    description: "Email thread analysis, sentiment scoring, and response intelligence.",
    status: "error" as const,
    connectedDate: "Jun 18, 2026",
    lastSync: "2 hr ago",
    permissions: ["Email Metadata", "Thread Summaries", "Sentiment", "Key Contacts"],
    dataFlowIn: 0,
    dataFlowOut: 0,
    icon: "EM",
    color: "#EF4444",
    critical: false,
  },
];

const AVAILABLE_APPS = [
  { name: "Salesforce", category: "CRM", icon: "SF", color: "#00A1E0" },
  { name: "HubSpot", category: "Marketing", icon: "HS", color: "#FF7A59" },
  { name: "Slack", category: "Communication", icon: "SL", color: "#4A154B" },
  { name: "Stripe", category: "Payments", icon: "ST", color: "#635BFF" },
  { name: "Gusto", category: "HR & Payroll", icon: "GU", color: "#F45D48" },
  { name: "Zendesk", category: "Support", icon: "ZD", color: "#03363D" },
  { name: "Shopify", category: "E-Commerce", icon: "SH", color: "#96BF48" },
  { name: "Xero", category: "Accounting", icon: "XE", color: "#13B5EA" },
];

const STATUS_CONFIG = {
  connected: { label: "Connected", color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", icon: AlertTriangle },
  error: { label: "Error", color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", icon: XCircle },
  disconnected: { label: "Disconnected", color: "#E8EDF5", bg: "rgba(232,237,245,0.05)", border: "rgba(232,237,245,0.1)", icon: XCircle },
};

export default function ConnectedApps() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"connected" | "available">("connected");

  const filtered = CONNECTED_APPS.filter((app) =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-8 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="section-label mb-3">Integration Hub</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Connected Apps
              </h1>
              <p className="text-sm text-[#E8EDF5]/50 mt-2 max-w-xl">
                Manage all business systems connected to EEOS. Every approved signal becomes executive intelligence.
              </p>
            </div>
            <Link
              href="/connect-ghl"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)] shrink-0"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              Add Integration
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Connected", value: CONNECTED_APPS.filter((a) => a.status === "connected").length, color: "#10B981" },
            { label: "Total Signals Today", value: CONNECTED_APPS.reduce((s, a) => s + a.dataFlowIn, 0).toLocaleString(), color: "#00D4C8" },
            { label: "Critical Systems", value: CONNECTED_APPS.filter((a) => a.critical).length, color: "#00D4C8" },
            { label: "Needs Attention", value: CONNECTED_APPS.filter((a) => a.status !== "connected").length, color: "#F59E0B" },
          ].map((s) => (
            <div key={s.label} className="metric-card rounded-xl p-4">
              <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.value}
              </div>
              <div className="text-[10px] text-[#E8EDF5]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1 p-1 rounded-lg bg-[rgba(0,212,200,0.05)] border border-[rgba(0,212,200,0.1)]">
            {(["connected", "available"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-[rgba(0,212,200,0.12)] text-[#00D4C8] border border-[rgba(0,212,200,0.3)]"
                    : "text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {tab === "connected" ? `Connected (${CONNECTED_APPS.length})` : `Available (${AVAILABLE_APPS.length}+)`}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8EDF5]/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="eeos-input w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
          </div>
        </div>

        {/* Connected Apps Grid */}
        {activeTab === "connected" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((app) => {
              const sc = STATUS_CONFIG[app.status];
              const StatusIcon = sc.icon;
              return (
                <div key={app.id} className="glass-card rounded-xl p-5 hover:border-[rgba(0,212,200,0.25)] transition-all duration-250">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${app.color}15`, border: `1px solid ${app.color}30`, color: app.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {app.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {app.name}
                          </span>
                          {app.critical && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(0,212,200,0.1)] text-[#00D4C8] border border-[rgba(0,212,200,0.2)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {app.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
                        style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </div>
                      <button className="p-1.5 rounded-lg text-[#E8EDF5]/30 hover:text-[#E8EDF5]/60 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#E8EDF5]/50 mb-4 leading-relaxed">{app.description}</p>

                  <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-[rgba(0,0,0,0.2)]">
                    <div>
                      <div className="text-[9px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIGNALS TODAY</div>
                      <div className="text-sm font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {app.dataFlowIn.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LAST SYNC</div>
                      <div className="text-xs text-[#E8EDF5]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {app.lastSync}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#E8EDF5]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONNECTED</div>
                      <div className="text-xs text-[#E8EDF5]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {app.connectedDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {app.permissions.map((p) => (
                      <span key={p} className="tag-teal">{p}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[rgba(0,212,200,0.06)]">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#E8EDF5]/50 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.06)] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#E8EDF5]/50 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.06)] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Now
                    </button>
                    {app.status !== "connected" && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)] transition-all duration-200 ml-auto" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Reconnect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Apps Grid */}
        {activeTab === "available" && (
          <div>
            <p className="text-sm text-[#E8EDF5]/50 mb-6">
              Connect additional business systems to expand EEOS intelligence coverage.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {AVAILABLE_APPS.map((app) => (
                <div key={app.name} className="glass-card rounded-xl p-5 text-center hover:border-[rgba(0,212,200,0.25)] transition-all duration-250 group cursor-pointer">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold mx-auto mb-3"
                    style={{ background: `${app.color}15`, border: `1px solid ${app.color}30`, color: app.color, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {app.icon}
                  </div>
                  <div className="text-sm font-semibold text-[#E8EDF5] mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {app.name}
                  </div>
                  <div className="text-[10px] text-[#E8EDF5]/40 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {app.category}
                  </div>
                  <button className="w-full py-2 rounded-lg text-xs font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.2)] hover:bg-[rgba(0,212,200,0.08)] hover:border-[rgba(0,212,200,0.4)] transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Connect
                  </button>
                </div>
              ))}
              {/* Request custom */}
              <div className="glass-card rounded-xl p-5 text-center border-dashed hover:border-[rgba(0,212,200,0.3)] transition-all duration-250 cursor-pointer">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[rgba(0,212,200,0.05)] border border-dashed border-[rgba(0,212,200,0.2)]">
                  <Plus className="w-5 h-5 text-[#00D4C8]/50" />
                </div>
                <div className="text-sm font-semibold text-[#E8EDF5]/50 mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Custom Integration
                </div>
                <div className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Request via API
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="flex items-start gap-4 p-5 rounded-xl bg-[rgba(0,212,200,0.04)] border border-[rgba(0,212,200,0.12)]">
          <Shield className="w-5 h-5 text-[#00D4C8] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#E8EDF5] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Read-only, zero-storage architecture
            </p>
            <p className="text-xs text-[#E8EDF5]/50 leading-relaxed">
              EEOS reads approved signals from your connected systems. No data is stored — signals are processed in-memory, converted to intelligence, and discarded. You control exactly which data points EEOS can read at any time.
            </p>
          </div>
        </div>

        {/* CTA */}
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
            href="/integration-health"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Activity className="w-4 h-4" />
            View Integration Health
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
