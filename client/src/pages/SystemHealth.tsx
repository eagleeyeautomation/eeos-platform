// EEOS System Health Page
// Infrastructure health, uptime, incident log, performance metrics
// Sovereign Night design

import { useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2, AlertTriangle, XCircle, Activity, Cpu,
  Database, Shield, Globe, Zap, Clock, ArrowRight,
  TrendingUp, RefreshCw, Eye, Plug, BarChart3
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";

const SYSTEM_COMPONENTS = [
  {
    name: "EEOS Intelligence Engine",
    description: "AI recommendation generation and signal processing",
    status: "operational" as const,
    uptime: 99.97,
    responseTime: 124,
    category: "Core",
  },
  {
    name: "GoHighLevel Connector",
    description: "Real-time CRM data sync and webhook processing",
    status: "operational" as const,
    uptime: 99.94,
    responseTime: 42,
    category: "Integration",
  },
  {
    name: "Executive Dashboard",
    description: "Frontend rendering and data visualization",
    status: "operational" as const,
    uptime: 100,
    responseTime: 18,
    category: "Frontend",
  },
  {
    name: "Signal Processing Pipeline",
    description: "Real-time data ingestion and transformation",
    status: "operational" as const,
    uptime: 99.91,
    responseTime: 67,
    category: "Core",
  },
  {
    name: "API Gateway",
    description: "Request routing, authentication, and rate limiting",
    status: "degraded" as const,
    uptime: 97.2,
    responseTime: 890,
    category: "Infrastructure",
  },
  {
    name: "Authentication Service",
    description: "OAuth 2.0, session management, and access control",
    status: "operational" as const,
    uptime: 100,
    responseTime: 31,
    category: "Security",
  },
  {
    name: "Notification Service",
    description: "Real-time alerts, push notifications, and email delivery",
    status: "operational" as const,
    uptime: 99.88,
    responseTime: 55,
    category: "Services",
  },
  {
    name: "Data Encryption Layer",
    description: "AES-256 encryption at rest and in transit",
    status: "operational" as const,
    uptime: 100,
    responseTime: 8,
    category: "Security",
  },
];

const INCIDENTS = [
  {
    id: "INC-2847",
    date: "Jul 9, 2026 · 07:42 AM",
    title: "API Gateway elevated latency",
    status: "investigating" as const,
    impact: "Minor — some requests experiencing 800ms+ response times",
    components: ["API Gateway"],
    duration: "32 min ongoing",
  },
  {
    id: "INC-2841",
    date: "Jul 8, 2026 · 02:14 PM",
    title: "Email Intelligence connector authentication failure",
    status: "resolved" as const,
    impact: "Minor — Email sync paused for 47 minutes",
    components: ["Email Intelligence"],
    duration: "47 min · Resolved",
  },
  {
    id: "INC-2829",
    date: "Jul 5, 2026 · 11:30 AM",
    title: "Scheduled maintenance — Intelligence Engine upgrade",
    status: "resolved" as const,
    impact: "Planned — 12 minute maintenance window",
    components: ["EEOS Intelligence Engine"],
    duration: "12 min · Resolved",
  },
];

const UPTIME_DATA = [
  { day: "Mon", uptime: 99.97 },
  { day: "Tue", uptime: 100 },
  { day: "Wed", uptime: 99.91 },
  { day: "Thu", uptime: 99.99 },
  { day: "Fri", uptime: 99.85 },
  { day: "Sat", uptime: 100 },
  { day: "Sun", uptime: 99.94 },
];

const RESPONSE_DATA = [
  { time: "00:00", p50: 38, p95: 95 },
  { time: "04:00", p50: 32, p95: 78 },
  { time: "08:00", p50: 52, p95: 890 },
  { time: "12:00", p50: 61, p95: 148 },
  { time: "16:00", p50: 58, p95: 132 },
  { time: "20:00", p50: 44, p95: 108 },
];

const STATUS_CONFIG = {
  operational: { label: "Operational", color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
  degraded: { label: "Degraded", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  outage: { label: "Outage", color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
};

const INCIDENT_STATUS = {
  investigating: { label: "Investigating", color: "#F59E0B" },
  resolved: { label: "Resolved", color: "#10B981" },
  monitoring: { label: "Monitoring", color: "#C9A227" },
};

export default function SystemHealth() {
  const operational = SYSTEM_COMPONENTS.filter((c) => c.status === "operational").length;
  const degraded = SYSTEM_COMPONENTS.filter((c) => c.status === "degraded").length;
  const overallStatus = degraded > 0 ? "degraded" : "operational";

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-8 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="section-label mb-3">Infrastructure</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                System Health
              </h1>
              <p className="text-sm text-[#FFFFFF]/50 mt-2">
                Real-time status of all EEOS infrastructure components.
              </p>
            </div>
            {/* Overall Status Banner */}
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl border"
              style={{
                background: overallStatus === "operational" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                borderColor: overallStatus === "operational" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)",
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: overallStatus === "operational" ? "#10B981" : "#F59E0B" }}
              />
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: overallStatus === "operational" ? "#10B981" : "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {overallStatus === "operational" ? "All Systems Operational" : "Partial Degradation"}
                </div>
                <div className="text-[10px] text-[#FFFFFF]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {operational}/{SYSTEM_COMPONENTS.length} components nominal
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "30-Day Uptime", value: "99.94%", color: "#10B981", icon: TrendingUp },
            { label: "Avg Response", value: "47ms", color: "#C9A227", icon: Zap },
            { label: "Active Incidents", value: "1", color: "#F59E0B", icon: AlertTriangle },
            { label: "Data Encrypted", value: "100%", color: "#10B981", icon: Shield },
          ].map((m) => (
            <div key={m.label} className="metric-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: m.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {m.value}
              </div>
              <div className="text-[10px] text-[#FFFFFF]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Component Status Grid */}
        <div>
          <div className="section-label mb-4">Component Status</div>
          <div className="space-y-2">
            {SYSTEM_COMPONENTS.map((comp) => {
              const sc = STATUS_CONFIG[comp.status];
              return (
                <div key={comp.name} className="flex items-center gap-4 px-5 py-4 rounded-xl glass-card hover:border-[rgba(201,162,39,0.2)] transition-all duration-200">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {comp.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(201,162,39,0.06)] text-[#C9A227]/60 border border-[rgba(201,162,39,0.1)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {comp.category}
                      </span>
                    </div>
                    <div className="text-xs text-[#FFFFFF]/40">{comp.description}</div>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-[#FFFFFF]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>UPTIME</div>
                      <div className={`text-sm font-semibold ${comp.uptime >= 99.9 ? "text-[#10B981]" : comp.uptime >= 99 ? "text-[#F59E0B]" : "text-[#EF4444]"}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {comp.uptime}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#FFFFFF]/30 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RESPONSE</div>
                      <div className={`text-sm font-semibold ${comp.responseTime < 100 ? "text-[#10B981]" : comp.responseTime < 500 ? "text-[#F59E0B]" : "text-[#EF4444]"}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {comp.responseTime}ms
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="section-label mb-1">Weekly Uptime</div>
            <div className="text-xs text-[#FFFFFF]/40 mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              System availability — last 7 days
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={UPTIME_DATA} barSize={28}>
                <XAxis dataKey="day" tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis domain={[99, 100]} hide />
                <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(201,162,39,0.2)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`, "Uptime"]} />
                <Bar dataKey="uptime" fill="#C9A227" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="section-label mb-1">Response Time (24h)</div>
            <div className="text-xs text-[#FFFFFF]/40 mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              p50 and p95 latency today
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={RESPONSE_DATA}>
                <defs>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: "rgba(232,237,245,0.35)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(201,162,39,0.2)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}ms`, ""]} />
                <Area type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} fill="url(#p50Grad)" dot={false} name="p50" />
                <Area type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} fill="none" dot={false} name="p95" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Log */}
        <div className="glass-card rounded-2xl p-6">
          <div className="section-label mb-5">Incident Log</div>
          <div className="space-y-4">
            {INCIDENTS.map((inc) => {
              const is = INCIDENT_STATUS[inc.status];
              return (
                <div key={inc.id} className="flex items-start gap-4 p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(201,162,39,0.06)]">
                  <div
                    className="w-2 rounded-full shrink-0 mt-1.5"
                    style={{ height: "40px", background: is.color, boxShadow: `0 0 8px ${is.color}40` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <span className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {inc.title}
                        </span>
                        <span className="ml-2 text-[10px] text-[#FFFFFF]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {inc.id}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                        style={{ background: `${is.color}15`, color: is.color, border: `1px solid ${is.color}30`, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {is.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-[#FFFFFF]/50 mb-1">{inc.impact}</div>
                    <div className="flex items-center gap-3 text-[10px] text-[#FFFFFF]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>{inc.date}</span>
                      <span>·</span>
                      <span>{inc.duration}</span>
                      <span>·</span>
                      <span>{inc.components.join(", ")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[rgba(201,162,39,0.08)]">
          <Link href="/integration-health" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(201,162,39,0.35)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Activity className="w-4 h-4" />
            View Integration Health
          </Link>
          <Link href="/executive-home" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.35)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] active:scale-[0.97] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Eye className="w-4 h-4" />
            Open Executive Dashboard
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
