// EEOS — Integration Health Page
// Sovereign Night Design System
// Sprint 11: Live integration status monitoring for connected business systems

import { useState } from "react";
import { Link } from "wouter";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Plug, ArrowRight, Clock, Database, Zap, Shield, BarChart3,
  TrendingUp, Eye, Settings, LayoutDashboard
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

type HealthStatus = "healthy" | "degraded" | "error" | "pending";

interface Integration {
  id: string;
  name: string;
  category: string;
  status: HealthStatus;
  lastSync: string;
  signalsToday: number;
  uptime: string;
  latency: string;
  description: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "ghl",
    name: "GoHighLevel",
    category: "CRM & Marketing",
    status: "healthy",
    lastSync: "2 minutes ago",
    signalsToday: 1847,
    uptime: "99.8%",
    latency: "142ms",
    description: "Contacts, pipelines, campaigns, automation workflows",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "Enterprise CRM",
    status: "pending",
    lastSync: "Not connected",
    signalsToday: 0,
    uptime: "—",
    latency: "—",
    description: "Opportunities, accounts, forecasts, activity history",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Marketing & Sales",
    status: "pending",
    lastSync: "Not connected",
    signalsToday: 0,
    uptime: "—",
    latency: "—",
    description: "Contacts, deals, marketing analytics, sequences",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "Finance",
    status: "pending",
    lastSync: "Not connected",
    signalsToday: 0,
    uptime: "—",
    latency: "—",
    description: "P&L, cash flow, invoices, expense categories",
  },
];

const SIGNAL_FEED = [
  { time: "14:32:01", source: "GoHighLevel", type: "Pipeline Update", signal: "Deal stage changed: Proposal → Negotiation", value: "+$48,500" },
  { time: "14:31:47", source: "GoHighLevel", type: "Lead Event", signal: "New lead captured from Facebook campaign", value: "Lead score: 87" },
  { time: "14:31:12", source: "GoHighLevel", type: "Campaign", signal: "Email sequence Step 3 completion rate: 34%", value: "↑ 8% vs avg" },
  { time: "14:30:58", source: "GoHighLevel", type: "Automation", signal: "Follow-up workflow triggered: 23 contacts", value: "Batch: 23" },
  { time: "14:30:33", source: "GoHighLevel", type: "Pipeline Update", signal: "Deal closed-won: Enterprise contract", value: "+$124,000" },
  { time: "14:29:55", source: "GoHighLevel", type: "Lead Event", signal: "Inbound call converted to appointment", value: "Conv. rate: 68%" },
];

const STATUS_CONFIG: Record<HealthStatus, { color: string; bg: string; border: string; label: string; icon: typeof CheckCircle2 }> = {
  healthy: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", label: "Healthy", icon: CheckCircle2 },
  degraded: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", label: "Degraded", icon: AlertTriangle },
  error: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "Error", icon: XCircle },
  pending: { color: "#E8EDF5", bg: "rgba(232,237,245,0.05)", border: "rgba(232,237,245,0.1)", label: "Not Connected", icon: Plug },
};

export default function IntegrationHealth() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const healthyCount = INTEGRATIONS.filter((i) => i.status === "healthy").length;
  const totalSignals = INTEGRATIONS.reduce((sum, i) => sum + i.signalsToday, 0);

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Header */}
      <section className="pt-28 pb-10 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="section-label mb-3">Integration Health</div>
                <h1
                  className="text-4xl sm:text-5xl font-bold text-[#E8EDF5] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  System Status
                </h1>
                <p className="text-[#E8EDF5]/55 mt-2 max-w-xl">
                  EEOS transforms business data into accurate executive intelligence. This panel shows the live health of every approved signal source.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    EEOS reads only approved signal types
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8]" />
                    No data stored — signals processed in transit
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    You control which systems connect
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <Link
                  href="/demo"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Open Executive Dashboard
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="bg-[#050C1A] pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Integrations", value: `${healthyCount}/${INTEGRATIONS.length}`, icon: Plug, color: "#00D4C8" },
              { label: "Signals Today", value: totalSignals.toLocaleString(), icon: Activity, color: "#10B981" },
              { label: "System Uptime", value: "99.8%", icon: TrendingUp, color: "#00D4C8" },
              { label: "Data Retention", value: "Zero", icon: Database, color: "#10B981", note: "Signals processed in transit only" },
            ].map((metric, i) => (
              <AnimatedSection key={metric.label} delay={i * 60}>
                <div className="metric-card rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#E8EDF5]/45"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metric.label}</span>
                    <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                  </div>
                  <div className="text-2xl font-bold" style={{ color: metric.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {metric.value}
                  </div>
                  {'note' in metric && (
                    <div className="text-[9px] text-[#E8EDF5]/30 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(metric as any).note}</div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Integration status cards */}
      <section className="bg-[#0A1628] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#E8EDF5]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Connected Systems</h2>
              <Link href="/integrations"
                className="text-sm text-[#00D4C8] hover:text-[#00E8DB] flex items-center gap-1 transition-colors duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Add Integration <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </AnimatedSection>

          <div className="space-y-3">
            {INTEGRATIONS.map((integration, i) => {
              const cfg = STATUS_CONFIG[integration.status];
              const StatusIcon = cfg.icon;
              return (
                <AnimatedSection key={integration.id} delay={i * 60}>
                  <div className="glass-card rounded-xl p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Name & status */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] flex items-center justify-center shrink-0">
                          <Plug className="w-5 h-5 text-[#00D4C8]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#E8EDF5]"
                              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{integration.name}</span>
                            <span className="text-[10px] text-[#E8EDF5]/35 px-1.5 py-0.5 rounded bg-[rgba(232,237,245,0.05)]"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}>{integration.category}</span>
                          </div>
                          <div className="text-xs text-[#E8EDF5]/45 mt-0.5 truncate">{integration.description}</div>
                        </div>
                      </div>

                      {/* Metrics — hidden on mobile, shown on sm+ */}
                      <div className="hidden sm:flex items-center gap-8">
                        {integration.status === "healthy" && (
                          <>
                            <div className="text-center">
                              <div className="text-xs text-[#E8EDF5]/35 mb-0.5"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIGNALS TODAY</div>
                              <div className="text-sm font-semibold text-[#00D4C8]"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {integration.signalsToday.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-[#E8EDF5]/35 mb-0.5"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>UPTIME</div>
                              <div className="text-sm font-semibold text-[#10B981]"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {integration.uptime}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-[#E8EDF5]/35 mb-0.5"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>LATENCY</div>
                              <div className="text-sm font-semibold text-[#E8EDF5]/70"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {integration.latency}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-[#E8EDF5]/35 mb-0.5"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>LAST SYNC</div>
                              <div className="text-xs text-[#E8EDF5]/55"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {integration.lastSync}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Status badge + action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.color,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                        {integration.status === "pending" && (
                          <Link
                            href="/connect-ghl"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            <Plug className="w-3 h-3" />
                            Connect
                          </Link>
                        )}
                        {integration.status === "healthy" && (
                          <button className="p-1.5 text-[#E8EDF5]/30 hover:text-[#00D4C8] transition-colors duration-200">
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile metrics row */}
                    {integration.status === "healthy" && (
                      <div className="sm:hidden mt-4 pt-4 border-t border-[rgba(0,212,200,0.08)] grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-[10px] text-[#E8EDF5]/35 mb-0.5"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIGNALS</div>
                          <div className="text-sm font-semibold text-[#00D4C8]"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {integration.signalsToday.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#E8EDF5]/35 mb-0.5"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}>UPTIME</div>
                          <div className="text-sm font-semibold text-[#10B981]"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {integration.uptime}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#E8EDF5]/35 mb-0.5"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}>LATENCY</div>
                          <div className="text-sm font-semibold text-[#E8EDF5]/70"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {integration.latency}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live signal feed */}
      <section className="bg-[#050C1A] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <h2 className="text-xl font-bold text-[#E8EDF5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Live Signal Feed</h2>
              </div>
              <span className="text-xs text-[#E8EDF5]/35"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>REAL-TIME · DEMO DATA</span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(0,212,200,0.08)]">
                      {["Time", "Source", "Type", "Signal", "Value"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] text-[#E8EDF5]/35 font-medium tracking-wider"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SIGNAL_FEED.map((row, i) => (
                      <tr key={i} className="border-b border-[rgba(0,212,200,0.04)] hover:bg-[rgba(0,212,200,0.03)] transition-colors duration-150">
                        <td className="px-4 py-3 text-xs text-[#00D4C8]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.time}</td>
                        <td className="px-4 py-3 text-xs text-[#E8EDF5]/70"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.source}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,212,200,0.08)] text-[#00D4C8] border border-[rgba(0,212,200,0.15)]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#E8EDF5]/65 max-w-xs">{row.signal}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#10B981]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="section-label mb-4">Next Step</div>
            <h2 className="text-3xl font-bold text-[#E8EDF5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your signals are flowing. Open your Executive Dashboard.
            </h2>
            <p className="text-[#E8EDF5]/55 mb-8 max-w-xl mx-auto">
              EEOS is processing your GoHighLevel signals in real time. Your first executive recommendations will be ready within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/demo"
                className="flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <LayoutDashboard className="w-4 h-4" />
                Open Executive Dashboard
              </Link>
              <Link
                href="/integrations"
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Add More Integrations
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
