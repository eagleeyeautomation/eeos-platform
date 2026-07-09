// KnowledgeGraphPreview.tsx
// Eagle Eye Automation — EEOS Executive Experience
// Knowledge Graph Preview: visual map of business entities and their relationships
// All data shapes designed to consume real GoHighLevel data once backend is live.
// GHL data: contacts, opportunities, pipelines, tags, companies, relationships

import { useState } from "react";
import { Link } from "wouter";
import {
  Network, Users, DollarSign, Building2, Tag, ArrowRight,
  Zap, Info, Circle, TrendingUp, MessageSquare
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

// ── GHL-READY DATA SHAPES ──────────────────────────────────────────────────
// When backend is live, replace with:
// GET /api/eeos/knowledge-graph?tenantId=xxx&depth=2&centerNode=company

type NodeType = "company" | "contact" | "opportunity" | "tag" | "department";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  value?: string;
  health?: number; // 0–100
  connections: string[]; // IDs of connected nodes
  ghlId?: string; // GoHighLevel entity ID placeholder
  x: number; // layout position (percentage of container)
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  strength: "strong" | "medium" | "weak";
}

const GRAPH_NODES: GraphNode[] = [
  // Center — Your Business
  { id: "biz", type: "company", label: "PRN Staffers", sublabel: "Your Business", x: 50, y: 50, connections: ["nh", "ai", "mg", "cp", "sl", "vx", "rec", "sales", "ops"] },
  // Clients
  { id: "nh", type: "company", label: "Northstar Health", sublabel: "Client · $128K", value: "$128K", health: 94, x: 22, y: 22, connections: ["biz", "sarah-m", "opp-nh"] },
  { id: "ai", type: "company", label: "Apex Industries", sublabel: "Client · $96K", value: "$96K", health: 87, x: 78, y: 22, connections: ["biz", "opp-ai"] },
  { id: "mg", type: "company", label: "Meridian Group", sublabel: "Client · $84K", value: "$84K", health: 72, x: 15, y: 65, connections: ["biz", "opp-mg"] },
  { id: "cp", type: "company", label: "Cascade Partners", sublabel: "At Risk · $72K", value: "$72K", health: 61, x: 85, y: 65, connections: ["biz"] },
  { id: "sl", type: "company", label: "Summit Logistics", sublabel: "Prospect", health: 89, x: 50, y: 18, connections: ["biz", "opp-sl"] },
  { id: "vx", type: "company", label: "Vertex Solutions", sublabel: "At Risk · $54K", value: "$54K", health: 55, x: 50, y: 82, connections: ["biz"] },
  // Contacts
  { id: "sarah-m", type: "contact", label: "Sarah Mitchell", sublabel: "Director HR", x: 12, y: 38, connections: ["nh", "biz"] },
  // Opportunities
  { id: "opp-nh", type: "opportunity", label: "Q3 Contract", sublabel: "Won · $128K", value: "$128K", x: 28, y: 10, connections: ["nh"] },
  { id: "opp-ai", type: "opportunity", label: "Expansion Q4", sublabel: "Proposal · $96K", value: "$96K", x: 88, y: 38, connections: ["ai"] },
  { id: "opp-mg", type: "opportunity", label: "Renewal", sublabel: "Negotiation", x: 8, y: 80, connections: ["mg"] },
  { id: "opp-sl", type: "opportunity", label: "Discovery", sublabel: "Qualified", x: 62, y: 10, connections: ["sl"] },
  // Departments
  { id: "rec", type: "department", label: "Recruiting", sublabel: "92% utilization", x: 35, y: 70, connections: ["biz"] },
  { id: "sales", type: "department", label: "Sales", sublabel: "71% utilization", x: 65, y: 70, connections: ["biz"] },
  { id: "ops", type: "department", label: "Operations", sublabel: "85% utilization", x: 50, y: 35, connections: ["biz"] },
];

const GRAPH_EDGES: GraphEdge[] = [
  { from: "biz", to: "nh", strength: "strong" },
  { from: "biz", to: "ai", strength: "strong" },
  { from: "biz", to: "mg", strength: "medium" },
  { from: "biz", to: "cp", strength: "weak" },
  { from: "biz", to: "sl", strength: "medium" },
  { from: "biz", to: "vx", strength: "weak" },
  { from: "nh", to: "sarah-m", strength: "strong" },
  { from: "nh", to: "opp-nh", strength: "strong" },
  { from: "ai", to: "opp-ai", strength: "medium" },
  { from: "mg", to: "opp-mg", strength: "medium" },
  { from: "sl", to: "opp-sl", strength: "medium" },
  { from: "biz", to: "rec", strength: "strong" },
  { from: "biz", to: "sales", strength: "strong" },
  { from: "biz", to: "ops", strength: "strong" },
];

const NODE_CONFIG: Record<NodeType, { color: string; bg: string; border: string; icon: any; size: number }> = {
  company: { color: "#00D4C8", bg: "rgba(0,212,200,0.12)", border: "rgba(0,212,200,0.4)", icon: Building2, size: 48 },
  contact: { color: "#7C3AED", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.4)", icon: Users, size: 36 },
  opportunity: { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", icon: DollarSign, size: 36 },
  tag: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", icon: Tag, size: 28 },
  department: { color: "#6366F1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.4)", icon: Network, size: 32 },
};

function healthColor(h: number) {
  if (h >= 80) return "#10B981";
  if (h >= 60) return "#F59E0B";
  return "#EF4444";
}

const ENTITY_STATS = [
  { label: "Companies", value: "6", icon: Building2, color: "#00D4C8" },
  { label: "Contacts", value: "1", icon: Users, color: "#7C3AED" },
  { label: "Opportunities", value: "4", icon: DollarSign, color: "#10B981" },
  { label: "Departments", value: "3", icon: Network, color: "#6366F1" },
];

export default function KnowledgeGraphPreview() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const selectedNodeConfig = selectedNode ? NODE_CONFIG[selectedNode.type] : null;

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
                  <div className="section-label">Knowledge Graph</div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    DEMO DATA
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Knowledge Graph
                </h1>
                <p className="text-sm text-[#E8EDF5]/50 mt-1">
                  EEOS maps every entity in your business — clients, contacts, opportunities, and departments — and the relationships between them.
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

      {/* Stats */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ENTITY_STATS.map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                    <div className="text-[10px] text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.label.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Graph Canvas */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={150}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3">
                  <Network className="w-4 h-4 text-[#00D4C8]" />
                  <span className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Entity Relationship Map</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Legend */}
                  <div className="hidden sm:flex items-center gap-3 text-[10px]">
                    {Object.entries(NODE_CONFIG).filter(([k]) => k !== "tag").map(([type, cfg]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-[#E8EDF5]/45 capitalize" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#E8EDF5]/30">
                    <Info className="w-3 h-3" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Click nodes to inspect</span>
                  </div>
                </div>
              </div>

              <div className="relative" style={{ height: "520px", background: "radial-gradient(ellipse at center, rgba(0,212,200,0.03) 0%, transparent 70%)" }}>
                {/* SVG Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                  {GRAPH_EDGES.map((edge) => {
                    const fromNode = GRAPH_NODES.find(n => n.id === edge.from);
                    const toNode = GRAPH_NODES.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to ||
                      (selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to));
                    return (
                      <line
                        key={`${edge.from}-${edge.to}`}
                        x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                        x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                        stroke={isHighlighted ? "rgba(0,212,200,0.5)" : "rgba(0,212,200,0.1)"}
                        strokeWidth={edge.strength === "strong" ? 1.5 : edge.strength === "medium" ? 1 : 0.5}
                        strokeDasharray={edge.strength === "weak" ? "4 4" : undefined}
                        style={{ transition: "stroke 0.2s, stroke-opacity 0.2s" }}
                      />
                    );
                  })}
                </svg>

                {/* Nodes */}
                {GRAPH_NODES.map((node) => {
                  const nConfig = NODE_CONFIG[node.type];
                  const Icon = nConfig.icon;
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNode === node.id;
                  const isCenter = node.id === "biz";

                  return (
                    <button
                      key={node.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={() => setSelectedNode(isSelected ? null : node)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      aria-label={`${node.type}: ${node.label}`}
                      aria-pressed={isSelected}
                    >
                      {/* Node circle */}
                      <div
                        className="rounded-full flex items-center justify-center transition-all duration-200"
                        style={{
                          width: isCenter ? 64 : nConfig.size,
                          height: isCenter ? 64 : nConfig.size,
                          background: nConfig.bg,
                          border: `2px solid ${isSelected || isHovered ? nConfig.color : nConfig.border}`,
                          boxShadow: isSelected || isHovered ? `0 0 20px ${nConfig.color}40` : isCenter ? `0 0 30px rgba(0,212,200,0.2)` : "none",
                          transform: isSelected || isHovered ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        <Icon className={isCenter ? "w-7 h-7" : "w-4 h-4"} style={{ color: nConfig.color }} />
                      </div>

                      {/* Health indicator dot */}
                      {node.health !== undefined && (
                        <div
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050C1A]"
                          style={{ background: healthColor(node.health) }}
                          title={`Health: ${node.health}`}
                        />
                      )}

                      {/* Label */}
                      <div className="text-center pointer-events-none">
                        <div
                          className="text-[10px] font-semibold whitespace-nowrap max-w-[80px] truncate"
                          style={{ color: isSelected || isHovered ? nConfig.color : "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {node.label}
                        </div>
                        {node.sublabel && (
                          <div className="text-[9px] text-[#E8EDF5]/35 whitespace-nowrap max-w-[80px] truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {node.sublabel}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Selected Node Detail */}
      {selectedNode && selectedNodeConfig && (
        <section className="py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection>
              <div className="glass-card rounded-2xl p-5 border" style={{ borderColor: selectedNodeConfig.border }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: selectedNodeConfig.bg }}>
                    <selectedNodeConfig.icon className="w-6 h-6" style={{ color: selectedNodeConfig.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{selectedNode.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: selectedNodeConfig.bg, color: selectedNodeConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {selectedNode.type}
                      </span>
                    </div>
                    {selectedNode.sublabel && <p className="text-sm text-[#E8EDF5]/55">{selectedNode.sublabel}</p>}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONNECTIONS: </span>
                        <span className="text-[#E8EDF5]/70">{selectedNode.connections.length}</span>
                      </div>
                      {selectedNode.value && (
                        <div>
                          <span className="text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>VALUE: </span>
                          <span className="text-[#10B981] font-semibold">{selectedNode.value}</span>
                        </div>
                      )}
                      {selectedNode.health !== undefined && (
                        <div>
                          <span className="text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HEALTH: </span>
                          <span style={{ color: healthColor(selectedNode.health) }}>{selectedNode.health}/100</span>
                        </div>
                      )}
                      {selectedNode.ghlId && (
                        <div>
                          <span className="text-[#E8EDF5]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GHL ID: </span>
                          <span className="text-[#E8EDF5]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedNode.ghlId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-[#E8EDF5]/30 hover:text-[#E8EDF5]/60 transition-colors shrink-0 text-xs"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    aria-label="Close node detail"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* GHL Connection CTA */}
      <section className="py-16 bg-[#0A1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 glass-card rounded-2xl border border-[rgba(0,212,200,0.15)]">
              <div>
                <div className="text-xs text-[#00D4C8] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EAGLE EYE AUTOMATION · EEOS</div>
                <h2 className="text-xl font-bold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Your real knowledge graph is waiting.
                </h2>
                <p className="text-sm text-[#E8EDF5]/55 mt-1">
                  Connect GoHighLevel and EEOS maps every contact, opportunity, and relationship in your business automatically.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/connect-ghl" className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.3)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
                <Link href="/executive-home" className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
