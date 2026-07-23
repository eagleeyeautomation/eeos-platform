// EEOS Interactive Demo Page — Sovereign Night Design System
// 6 modules: Executive Dashboard, Priorities, Business DNA, Recommendations, Timeline, Knowledge Graph

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  LayoutDashboard, ListChecks, Dna, Lightbulb, GitBranch, Network,
  ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Zap, Users, Clock, ChevronRight, Info, Plug, Activity
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  DASHBOARD_KPIS, PRIORITIES, BUSINESS_DNA, RECOMMENDATIONS,
  TIMELINE_EVENTS, KNOWLEDGE_GRAPH, DEMO_COMPANY
} from "@/lib/demo-data";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const MODULES = [
  { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
  { id: "priorities", label: "Executive Priorities", icon: ListChecks },
  { id: "dna", label: "Business DNA", icon: Dna },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "timeline", label: "Intelligence Timeline", icon: GitBranch },
  { id: "knowledge-graph", label: "Knowledge Graph", icon: Network },
];

type ConnectorHealth = {
  connectionStatus: string;
  authenticationStatus: string;
  connectedLocationId: string | null;
  webhookStatus: string;
  failedEvents: number;
  retryQueueDepth: number;
  liveEventVerification: Record<string, boolean>;
};

// ── DASHBOARD MODULE ──
function DashboardModule() {
  const [connectorHealth, setConnectorHealth] = useState<ConnectorHealth | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/integrations/gohighlevel/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) {
          setConnectorHealth(data as ConnectorHealth | null);
        }
      })
      .catch(() => {
        if (active) {
          setConnectorHealth(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[#C9A227] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            EXECUTIVE DASHBOARD · {DEMO_COMPANY.name}
          </div>
          <h3 className="text-xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Good morning, {DEMO_COMPANY.ceo}
          </h3>
          <p className="text-sm text-[#FFFFFF]/50">Wednesday, July 9, 2025 · 5 priorities require your attention</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-xs text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {DASHBOARD_KPIS.map((kpi) => (
          <div key={kpi.id} className="metric-card rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs text-[#FFFFFF]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {kpi.label}
              </div>
              <div className={`flex items-center gap-1 text-xs ${
                kpi.trend === "up" ? "text-[#10B981]" :
                kpi.trend === "down" ? "text-[#EF4444]" : "text-[#F59E0B]"
              }`}>
                {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> :
                 kpi.trend === "down" ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {kpi.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-[#FFFFFF] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {kpi.value}
            </div>
            <ResponsiveContainer width="100%" height={32}>
              <LineChart data={kpi.sparkline.map((v, i) => ({ v, i }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={kpi.status === "green" ? "#10B981" : kpi.status === "amber" ? "#F59E0B" : "#EF4444"}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-[#C9A227] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              GOHIGHLEVEL CONNECTOR · PRN STAFFERS
            </div>
            <h4 className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Live integration health
            </h4>
            <p className="mt-1 text-xs text-[#FFFFFF]/50">
              {connectorHealth?.connectedLocationId
                ? `Location ${connectorHealth.connectedLocationId}`
                : "Awaiting production OAuth authorization"}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-xs font-semibold ${connectorHealth?.connectionStatus === "Connected" ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {connectorHealth?.connectionStatus || "Checking"}
            </div>
            <div className="mt-1 text-[10px] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              OAuth {connectorHealth?.authenticationStatus || "unknown"}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Webhook", connectorHealth?.webhookStatus || "Checking"],
            ["Failures", String(connectorHealth?.failedEvents ?? 0)],
            ["Retry Queue", String(connectorHealth?.retryQueueDepth ?? 0)],
            ["Live Events", String(Object.values(connectorHealth?.liveEventVerification || {}).filter(Boolean).length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[rgba(201,162,39,0.1)] bg-[rgba(201,162,39,0.03)] p-3">
              <div className="text-[10px] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
              <div className="mt-1 text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Priorities */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Top Priorities Today
          </h4>
          <span className="tag-teal">5 active</span>
        </div>
        <div className="space-y-3">
          {PRIORITIES.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.08)]">
              <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                p.urgency === "Critical" ? "bg-[#EF4444]" :
                p.urgency === "High" ? "bg-[#F59E0B]" : "bg-[#C9A227]"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#FFFFFF] truncate">{p.title}</div>
                <div className="text-xs text-[#FFFFFF]/50">{p.category} · {p.timeframe}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FFFFFF]/30 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PRIORITIES MODULE ──
function PrioritiesModule() {
  const [selected, setSelected] = useState(PRIORITIES[0].id);
  const active = PRIORITIES.find((p) => p.id === selected)!;

  return (
    <div className="grid lg:grid-cols-5 gap-6 h-full">
      {/* List */}
      <div className="lg:col-span-2 space-y-3">
        {PRIORITIES.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
              selected === p.id
                ? "bg-[rgba(201,162,39,0.08)] border-[rgba(201,162,39,0.3)]"
                : "border-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.15)] hover:bg-[rgba(201,162,39,0.03)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                p.urgency === "Critical" ? "bg-[#EF4444]/20 text-[#EF4444]" :
                p.urgency === "High" ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                "bg-[#C9A227]/20 text-[#C9A227]"
              }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {p.priority}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#FFFFFF] leading-snug">{p.title}</div>
                <div className="text-xs text-[#FFFFFF]/45 mt-1">{p.timeframe}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <div className="lg:col-span-3 glass-card rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`px-2.5 py-1 rounded text-xs font-semibold ${
            active.urgency === "Critical" ? "bg-[#EF4444]/15 text-[#EF4444]" :
            active.urgency === "High" ? "bg-[#F59E0B]/15 text-[#F59E0B]" :
            "bg-[#C9A227]/15 text-[#C9A227]"
          }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {active.urgency}
          </div>
          <div className="px-2.5 py-1 rounded text-xs font-semibold bg-[rgba(201,162,39,0.1)] text-[#C9A227]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {active.category}
          </div>
        </div>

        <h3 className="text-xl font-bold text-[#FFFFFF] mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {active.title}
        </h3>
        <p className="text-sm text-[#FFFFFF]/65 leading-relaxed mb-6">{active.description}</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-lg bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.1)]">
            <Clock className="w-4 h-4 text-[#C9A227] mx-auto mb-1" />
            <div className="text-xs text-[#FFFFFF]/50">Act within</div>
            <div className="text-sm font-semibold text-[#FFFFFF]">{active.timeframe}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.1)]">
            <Info className="w-4 h-4 text-[#C9A227] mx-auto mb-1" />
            <div className="text-xs text-[#FFFFFF]/50">Confidence</div>
            <div className="text-sm font-semibold text-[#C9A227]">{active.confidence}%</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.1)]">
            <Zap className="w-4 h-4 text-[#C9A227] mx-auto mb-1" />
            <div className="text-xs text-[#FFFFFF]/50">Sources</div>
            <div className="text-sm font-semibold text-[#FFFFFF]">{active.sources}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-[#FFFFFF]/50 uppercase tracking-wider mb-3"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Recommended Actions
          </div>
          <div className="space-y-2">
            {active.actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[rgba(201,162,39,0.04)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                <span className="text-sm text-[#FFFFFF]/75">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BUSINESS DNA MODULE ──
function BusinessDNAModule() {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Core Strengths */}
        <div className="glass-card rounded-xl p-6">
          <h4 className="text-sm font-semibold text-[#FFFFFF] mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Core Strengths
          </h4>
          <div className="space-y-4">
            {BUSINESS_DNA.coreStrengths.map((strength) => (
              <div key={strength.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[#FFFFFF]/75">{strength.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {strength.score}
                    </span>
                    {strength.trend === "up" ? (
                      <TrendingUp className="w-3 h-3 text-[#10B981]" />
                    ) : strength.trend === "down" ? (
                      <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                    ) : (
                      <Minus className="w-3 h-3 text-[#FFFFFF]/40" />
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-[rgba(201,162,39,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full progress-teal transition-all duration-1000"
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="glass-card rounded-xl p-6">
          <h4 className="text-sm font-semibold text-[#FFFFFF] mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Risk Factors
          </h4>
          <div className="space-y-4">
            {BUSINESS_DNA.riskFactors.map((risk) => (
              <div key={risk.label} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[#FFFFFF]/75">{risk.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      risk.level === "High" ? "bg-[#EF4444]/15 text-[#EF4444]" :
                      risk.level === "Medium" ? "bg-[#F59E0B]/15 text-[#F59E0B]" :
                      "bg-[#10B981]/15 text-[#10B981]"
                    }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {risk.level}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${risk.score}%`,
                        background: risk.level === "High" ? "#EF4444" : risk.level === "Medium" ? "#F59E0B" : "#10B981",
                        boxShadow: `0 0 6px ${risk.level === "High" ? "rgba(239,68,68,0.5)" : risk.level === "Medium" ? "rgba(245,158,11,0.5)" : "rgba(16,185,129,0.5)"}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="glass-card rounded-xl p-6">
        <h4 className="text-sm font-semibold text-[#FFFFFF] mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Department Health Matrix
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BUSINESS_DNA.departments.map((dept) => (
            <div key={dept.name} className="p-3 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.08)] text-center">
              <div className="text-xs text-[#FFFFFF]/50 mb-2 leading-tight">{dept.name}</div>
              <div
                className="text-xl font-bold mb-1"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: dept.health >= 85 ? "#10B981" : dept.health >= 75 ? "#F59E0B" : "#EF4444",
                }}
              >
                {dept.health}
              </div>
              <div className="text-xs text-[#FFFFFF]/40">{dept.headcount.toLocaleString()} people</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RECOMMENDATIONS MODULE ──
function RecommendationsModule() {
  const [selected, setSelected] = useState<string | null>(null);

  const typeConfig = {
    action: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", label: "ACTION REQUIRED" },
    opportunity: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "OPPORTUNITY" },
    risk: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "RISK SIGNAL" },
    insight: { color: "#C9A227", bg: "rgba(201,162,39,0.1)", label: "INSIGHT" },
  };

  return (
    <div className="space-y-4">
      {RECOMMENDATIONS.map((rec) => {
        const config = typeConfig[rec.type as keyof typeof typeConfig];
        const isExpanded = selected === rec.id;
        return (
          <div
            key={rec.id}
            className={`glass-card rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
              isExpanded ? "border-[rgba(201,162,39,0.3)]" : "hover:border-[rgba(201,162,39,0.2)]"
            }`}
            onClick={() => setSelected(isExpanded ? null : rec.id)}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className="w-2 h-full min-h-[40px] rounded-full shrink-0"
                  style={{ background: config.color, boxShadow: `0 0 8px ${config.color}60` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span
                        className="text-xs font-semibold mr-2"
                        style={{ color: config.color, fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-[#FFFFFF]/40">{rec.category}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-[#FFFFFF]/40">Confidence</div>
                        <div className="text-sm font-semibold text-[#C9A227]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {rec.confidence}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <h4 className="text-base font-semibold text-[#FFFFFF] mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {rec.title}
                  </h4>
                  <p className="text-sm text-[#FFFFFF]/60">{rec.summary}</p>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-[rgba(201,162,39,0.08)] pt-4">
                <p className="text-sm text-[#FFFFFF]/70 leading-relaxed mb-4">{rec.detail}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.1)]">
                    <div className="text-xs text-[#FFFFFF]/40 mb-1">Time to Act</div>
                    <div className="text-sm font-semibold text-[#FFFFFF]">{rec.timeToAct}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(201,162,39,0.05)] border border-[rgba(201,162,39,0.1)]">
                    <div className="text-xs text-[#FFFFFF]/40 mb-1">Value at Stake</div>
                    <div className="text-sm font-semibold text-[#C9A227]">{rec.potentialValue}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TIMELINE MODULE ──
function TimelineModule() {
  const severityConfig = {
    critical: { color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
    high: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
    medium: { color: "#C9A227", bg: "rgba(201,162,39,0.15)" },
    info: { color: "#FFFFFF", bg: "rgba(232,237,245,0.08)" },
  };

  return (
    <div className="space-y-1">
      {TIMELINE_EVENTS.map((event, i) => {
        const config = severityConfig[event.severity as keyof typeof severityConfig];
        return (
          <div key={event.id} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div
                className="w-3 h-3 rounded-full shrink-0 mt-4 transition-all duration-200 group-hover:scale-125"
                style={{ background: config.color, boxShadow: `0 0 8px ${config.color}60` }}
              />
              {i < TIMELINE_EVENTS.length - 1 && (
                <div className="w-px flex-1 bg-gradient-to-b from-[rgba(201,162,39,0.2)] to-transparent mt-1" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="glass-card rounded-xl p-4 hover:border-[rgba(201,162,39,0.2)] transition-all duration-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={{ background: config.bg, color: config.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#FFFFFF]/40">{event.category}</span>
                    {event.automated && (
                      <span className="text-xs text-[#C9A227]/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        AUTO-DETECTED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#FFFFFF]/35 shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {event.date} {event.time}
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-[#FFFFFF] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {event.title}
                </h4>
                <p className="text-xs text-[#FFFFFF]/55 leading-relaxed">{event.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KNOWLEDGE GRAPH MODULE ──
function KnowledgeGraphModule() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeTypeConfig: Record<string, { color: string; glow: string }> = {
    executive: { color: "#C9A227", glow: "rgba(201,162,39,0.5)" },
    department: { color: "#60A5FA", glow: "rgba(96,165,250,0.4)" },
    external: { color: "#FFFFFF", glow: "rgba(232,237,245,0.3)" },
    risk: { color: "#EF4444", glow: "rgba(239,68,68,0.5)" },
    opportunity: { color: "#10B981", glow: "rgba(16,185,129,0.5)" },
  };

  const hoveredNodeData = KNOWLEDGE_GRAPH.nodes.find((n) => n.id === hoveredNode);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(nodeTypeConfig).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
            <span className="text-xs text-[#FFFFFF]/50 capitalize"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {type}
            </span>
          </div>
        ))}
      </div>

      <div className="relative glass-card rounded-xl overflow-hidden" style={{ height: "480px" }}>
        <svg width="100%" height="100%" viewBox="0 0 800 560" className="absolute inset-0">
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(201,162,39,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="560" fill="url(#grid)" />

          {/* Edges */}
          {KNOWLEDGE_GRAPH.edges.map((edge, i) => {
            const source = KNOWLEDGE_GRAPH.nodes.find((n) => n.id === edge.source)!;
            const target = KNOWLEDGE_GRAPH.nodes.find((n) => n.id === edge.target)!;
            if (!source || !target) return null;
            const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={
                  edge.risk ? "rgba(239,68,68,0.4)" :
                  edge.opportunity ? "rgba(16,185,129,0.4)" :
                  isHighlighted ? "rgba(201,162,39,0.6)" : "rgba(201,162,39,0.12)"
                }
                strokeWidth={isHighlighted ? edge.weight * 1.5 : edge.weight * 0.8}
                strokeDasharray={edge.risk || edge.opportunity ? "4 4" : undefined}
              />
            );
          })}

          {/* Nodes */}
          {KNOWLEDGE_GRAPH.nodes.map((node) => {
            const config = nodeTypeConfig[node.type] || nodeTypeConfig.external;
            const isHovered = hoveredNode === node.id;
            const isConnected = hoveredNode
              ? KNOWLEDGE_GRAPH.edges.some(
                  (e) => (e.source === hoveredNode && e.target === node.id) ||
                         (e.target === hoveredNode && e.source === node.id) ||
                         node.id === hoveredNode
                )
              : true;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {isHovered && (
                  <circle
                    r={node.size + 10}
                    fill={config.glow}
                    opacity={0.3}
                  />
                )}
                <circle
                  r={node.size}
                  fill={isHovered ? config.color : `${config.color}${isConnected ? "CC" : "33"}`}
                  stroke={config.color}
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={isConnected ? 1 : 0.3}
                  style={{ transition: "all 200ms ease-out" }}
                />
                <text
                  textAnchor="middle"
                  dy={node.size + 14}
                  fontSize={10}
                  fill={isConnected ? "#FFFFFF" : "rgba(232,237,245,0.3)"}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={isHovered ? "600" : "400"}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredNodeData && (
          <div className="absolute top-4 right-4 glass-card rounded-lg p-3 min-w-[160px]">
            <div className="text-xs text-[#C9A227] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {hoveredNodeData.type.toUpperCase()}
            </div>
            <div className="text-sm font-semibold text-[#FFFFFF]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {hoveredNodeData.label}
            </div>
            <div className="text-xs text-[#FFFFFF]/50 mt-1">
              {KNOWLEDGE_GRAPH.edges.filter(
                (e) => e.source === hoveredNodeData.id || e.target === hoveredNodeData.id
              ).length} connections
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 text-xs text-[#FFFFFF]/30"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Hover nodes to explore connections
        </div>
      </div>
    </div>
  );
}

// ── MAIN DEMO PAGE ──
export default function Demo() {
  const [activeModule, setActiveModule] = useState("dashboard");

  const ModuleContent = {
    dashboard: DashboardModule,
    priorities: PrioritiesModule,
    dna: BusinessDNAModule,
    recommendations: RecommendationsModule,
    timeline: TimelineModule,
    "knowledge-graph": KnowledgeGraphModule,
  }[activeModule];

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-10 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="section-label mb-4">EEOS Interactive Demo — Eagle Eye Automation</div>
            <h1
              className="text-4xl sm:text-5xl font-bold text-[#FFFFFF] tracking-tight mb-4 leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              See what leading
              <br />
              <span className="gradient-text">looks like.</span>
            </h1>
            <p className="text-lg text-[#FFFFFF]/60 max-w-xl">
              All six EEOS intelligence modules loaded with demonstration data from{" "}
              <span className="text-[#C9A227] font-semibold">{DEMO_COMPANY.name}</span> — a fictional{" "}
              {DEMO_COMPANY.industry} service business with {DEMO_COMPANY.employees.toLocaleString()} employees.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Interface */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Module Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {MODULES.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                  activeModule === module.id
                    ? "bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.4)] text-[#C9A227]"
                    : "border border-[rgba(201,162,39,0.1)] text-[#FFFFFF]/60 hover:text-[#FFFFFF]/80 hover:border-[rgba(201,162,39,0.2)]"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <module.icon className="w-4 h-4" />
                {module.label}
              </button>
            ))}
          </div>

          {/* Demo Panel */}
          <div className="bg-[#141414] rounded-2xl border border-[rgba(201,162,39,0.12)] overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(201,162,39,0.08)] bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
                </div>
                <span className="text-xs text-[#FFFFFF]/40"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  EEOS Executive Intelligence Platform · Demo Mode
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  DEMONSTRATION DATA
                </span>
              </div>
            </div>

            {/* Module Content */}
            <div className="p-6">
              {ModuleContent && <ModuleContent />}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 border-t border-[rgba(201,162,39,0.1)] pt-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12">
              <div className="flex-1">
                <p className="text-base font-semibold text-[#FFFFFF] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Ready to connect your business to EEOS?
                </p>
                <p className="text-sm text-[#FFFFFF]/50 leading-relaxed">
                  Connect your business systems. EEOS turns approved signals into executive recommendations — giving you clarity, speed, and decisive advantage.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/connect-ghl"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(201,162,39,0.35)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Plug className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
                <Link
                  href="/integration-health"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.35)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Activity className="w-4 h-4" />
                  View Integration Health
                </Link>
                <Link
                  href="/onboarding"
                  className="hidden sm:inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#FFFFFF]/60 border border-[rgba(232,237,245,0.1)] rounded-lg hover:border-[rgba(201,162,39,0.2)] hover:text-[#FFFFFF]/80 active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Start Private Beta
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
