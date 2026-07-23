// IntegrationStatus.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Integration Status: connector health, sync status, error log, uptime
// All data shapes designed to consume real GoHighLevel data once backend is live.
// GHL API: GET /api/integrations/status?tenantId=xxx

import { useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  Zap, ArrowRight, Activity, Wifi, WifiOff, Shield,
  Database, BarChart3, Settings
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
type ConnectorStatus = "connected" | "degraded" | "error" | "pending";

interface Connector {
  id: string;
  name: string;
  category: string;
  status: ConnectorStatus;
  lastSync: string;
  syncFrequency: string;
  recordsProcessed: number;
  errorCount: number;
  uptime: number; // percentage
  ghlEndpoint: string; // GHL API endpoint this connector reads from
  description: string;
}

const CONNECTORS: Connector[] = [
  {
    id: "ghl-crm",
    name: "GoHighLevel CRM",
    category: "CRM",
    status: "connected",
    lastSync: "2 min ago",
    syncFrequency: "Real-time webhook",
    recordsProcessed: 14820,
    errorCount: 0,
    uptime: 99.8,
    ghlEndpoint: "/contacts, /opportunities, /pipelines",
    description: "Contacts, opportunities, pipeline stages, and custom fields",
  },
  {
    id: "ghl-conversations",
    name: "GoHighLevel Conversations",
    category: "Messaging",
    status: "connected",
    lastSync: "30 sec ago",
    syncFrequency: "Real-time webhook",
    recordsProcessed: 8340,
    errorCount: 0,
    uptime: 99.6,
    ghlEndpoint: "/conversations, /messages",
    description: "SMS, email, and chat conversations with contacts",
  },
  {
    id: "ghl-calendar",
    name: "GoHighLevel Calendar",
    category: "Scheduling",
    status: "connected",
    lastSync: "5 min ago",
    syncFrequency: "Every 5 minutes",
    recordsProcessed: 2140,
    errorCount: 0,
    uptime: 99.4,
    ghlEndpoint: "/calendars, /appointments",
    description: "Appointments, availability, and booking events",
  },
  {
    id: "ghl-payments",
    name: "GoHighLevel Payments",
    category: "Finance",
    status: "degraded",
    lastSync: "18 min ago",
    syncFrequency: "Every 15 minutes",
    recordsProcessed: 892,
    errorCount: 3,
    uptime: 97.2,
    ghlEndpoint: "/payments, /invoices, /subscriptions",
    description: "Invoices, payments received, and subscription status",
  },
  {
    id: "ghl-forms",
    name: "GoHighLevel Forms",
    category: "Lead Capture",
    status: "connected",
    lastSync: "12 min ago",
    syncFrequency: "Real-time webhook",
    recordsProcessed: 1240,
    errorCount: 0,
    uptime: 99.1,
    ghlEndpoint: "/forms, /submissions",
    description: "Form submissions and lead capture events",
  },
  {
    id: "ghl-reviews",
    name: "GoHighLevel Reviews",
    category: "Reputation",
    status: "pending",
    lastSync: "Never",
    syncFrequency: "Every 30 minutes",
    recordsProcessed: 0,
    errorCount: 0,
    uptime: 0,
    ghlEndpoint: "/reputation/reviews",
    description: "Google and Facebook review monitoring",
  },
];

const UPTIME_HISTORY = [
  { time: "00:00", uptime: 100 },
  { time: "04:00", uptime: 100 },
  { time: "08:00", uptime: 98.2 },
  { time: "10:00", uptime: 97.1 },
  { time: "12:00", uptime: 99.4 },
  { time: "14:00", uptime: 99.8 },
  { time: "16:00", uptime: 99.9 },
  { time: "18:00", uptime: 100 },
  { time: "20:00", uptime: 100 },
  { time: "Now", uptime: 99.6 },
];

const ERROR_LOG = [
  { id: "e1", connector: "GoHighLevel Payments", error: "Rate limit exceeded — 429 response", time: "18 min ago", resolved: false },
  { id: "e2", connector: "GoHighLevel Payments", error: "Webhook delivery failed — retry 2/3", time: "22 min ago", resolved: false },
  { id: "e3", connector: "GoHighLevel Payments", error: "Webhook delivery failed — retry 1/3", time: "25 min ago", resolved: true },
];

const STATUS_CONFIG: Record<ConnectorStatus, { color: string; bg: string; border: string; icon: any; label: string }> = {
  connected: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", icon: CheckCircle2, label: "Connected" },
  degraded: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", icon: AlertTriangle, label: "Degraded" },
  error: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: XCircle, label: "Error" },
  pending: { color: "#6B7280", bg: "rgba(107,114,128,0.06)", border: "rgba(107,114,128,0.15)", icon: Clock, label: "Pending" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-2 text-xs border border-[rgba(201,162,39,0.2)]">
      <div className="text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div className="text-[#FFFFFF]">{payload[0]?.value}% uptime</div>
    </div>
  );
};

export default function IntegrationStatus() {
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  const connected = CONNECTORS.filter(c => c.status === "connected").length;
  const degraded = CONNECTORS.filter(c => c.status === "degraded").length;
  const pending = CONNECTORS.filter(c => c.status === "pending").length;
  const totalRecords = CONNECTORS.reduce((s, c) => s + c.recordsProcessed, 0);

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="section-label">Integration Status</div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    {connected}/{CONNECTORS.length} ACTIVE
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Integration Status
                </h1>
                <p className="text-sm text-[#FFFFFF]/50 mt-1">
                  Monitor all EEOS connectors and GoHighLevel data streams in one place.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] active:scale-[0.97] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh All</span>
                </button>
                <Link href="/connect-ghl" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Connected", value: connected.toString(), color: "#10B981", icon: Wifi },
                { label: "Degraded", value: degraded.toString(), color: "#F59E0B", icon: AlertTriangle },
                { label: "Pending Setup", value: pending.toString(), color: "#6B7280", icon: Clock },
                { label: "Records Synced", value: totalRecords.toLocaleString(), color: "#C9A227", icon: Database },
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

      {/* Uptime Chart */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={150}>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>System Uptime — Last 24 Hours</h2>
                  <p className="text-xs text-[#FFFFFF]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Overall: 99.6% uptime</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-xs font-semibold text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>OPERATIONAL</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={UPTIME_HISTORY} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[95, 100]} tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="uptime" stroke="#10B981" strokeWidth={2} fill="url(#uptimeGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Connectors Grid */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={200}>
            <h2 className="text-base font-bold text-[#FFFFFF] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Connector Status</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONNECTORS.map((connector) => {
                const sConfig = STATUS_CONFIG[connector.status];
                const StatusIcon = sConfig.icon;
                const isSelected = selectedConnector === connector.id;

                return (
                  <button
                    key={connector.id}
                    onClick={() => setSelectedConnector(isSelected ? null : connector.id)}
                    className={`text-left p-5 rounded-2xl border transition-all duration-200 hover:border-[rgba(201,162,39,0.25)] ${
                      isSelected ? "border-[rgba(201,162,39,0.35)] ring-1 ring-[rgba(201,162,39,0.15)]" : ""
                    }`}
                    style={{ background: sConfig.bg, borderColor: sConfig.border }}
                    aria-expanded={isSelected}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[10px] text-[#FFFFFF]/40 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{connector.category.toUpperCase()}</div>
                        <div className="text-sm font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{connector.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: `${sConfig.color}15`, color: sConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        <StatusIcon className="w-3 h-3" />
                        {sConfig.label.toUpperCase()}
                      </div>
                    </div>

                    <p className="text-xs text-[#FFFFFF]/50 mb-3 leading-relaxed">{connector.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <div className="text-[#FFFFFF]/35 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LAST SYNC</div>
                        <div className="text-[#FFFFFF]/70">{connector.lastSync}</div>
                      </div>
                      <div>
                        <div className="text-[#FFFFFF]/35 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FREQUENCY</div>
                        <div className="text-[#FFFFFF]/70">{connector.syncFrequency}</div>
                      </div>
                      <div>
                        <div className="text-[#FFFFFF]/35 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RECORDS</div>
                        <div className="text-[#FFFFFF]/70">{connector.recordsProcessed.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[#FFFFFF]/35 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>UPTIME</div>
                        <div style={{ color: connector.uptime >= 99 ? "#10B981" : connector.uptime >= 95 ? "#F59E0B" : "#EF4444" }}>
                          {connector.uptime > 0 ? `${connector.uptime}%` : "—"}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="text-[10px] text-[#FFFFFF]/35 mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GHL ENDPOINT</div>
                        <div className="text-[10px] text-[#C9A227]/70 font-mono">{connector.ghlEndpoint}</div>
                        {connector.errorCount > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#F59E0B]">
                            <AlertTriangle className="w-3 h-3" />
                            {connector.errorCount} error{connector.errorCount > 1 ? "s" : ""} in last 24h
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Error Log */}
      {ERROR_LOG.length > 0 && (
        <section className="py-4 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection delay={250}>
              <h2 className="text-base font-bold text-[#FFFFFF] mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent Errors</h2>
              <div className="glass-card rounded-2xl overflow-hidden">
                {ERROR_LOG.map((err, i) => (
                  <div
                    key={err.id}
                    className={`flex items-start gap-4 p-4 ${i < ERROR_LOG.length - 1 ? "border-b border-[rgba(255,255,255,0.05)]" : ""}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${err.resolved ? "bg-[#10B981]" : "bg-[#EF4444] animate-pulse"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#FFFFFF]/70">{err.connector}</div>
                      <div className="text-xs text-[#FFFFFF]/50 mt-0.5">{err.error}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${err.resolved ? "bg-[rgba(16,185,129,0.1)] text-[#10B981]" : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {err.resolved ? "RESOLVED" : "ACTIVE"}
                      </span>
                      <span className="text-[10px] text-[#FFFFFF]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{err.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
