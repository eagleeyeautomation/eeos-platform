/**
 * EEOS — Knowledge Graph (Business DNA Layer)
 *
 * Visual map of every business entity and relationship extracted from GoHighLevel.
 * Populated by the EEOS Signal Pipeline and updated with every incoming webhook.
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Network, Users, DollarSign, Building2, Tag, ArrowRight,
  Zap, Info, Loader2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { trpc } from "@/lib/trpc";
import { useOwnerConnectionState } from "@/hooks/useOwnerConnectionState";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const NODE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; size: number }> = {
  company: { color: "#C9A227", bg: "rgba(201,162,39,0.12)", border: "rgba(201,162,39,0.4)", icon: Building2, size: 48 },
  contact: { color: "#7C3AED", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.4)", icon: Users, size: 36 },
  opportunity: { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", icon: DollarSign, size: 36 },
  tag: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", icon: Tag, size: 28 },
  department: { color: "#0F2747", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.4)", icon: Network, size: 32 },
  default: { color: "#6B7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.4)", icon: Network, size: 32 },
};

function healthColor(h: number) {
  if (h >= 80) return "#10B981";
  if (h >= 60) return "#F59E0B";
  return "#EF4444";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types matching the DB schema
// ─────────────────────────────────────────────────────────────────────────────

interface LiveNode {
  id: number;
  tenantId: string;
  nodeType: string;
  externalId: string;
  label: string | null;
  properties: Record<string, unknown> | null;
  signalCount: number | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}

interface LiveEdge {
  id: number;
  tenantId: string;
  fromNodeId: number;
  toNodeId: number;
  relationshipType: string;
  weight: number | null;
  properties: Record<string, unknown> | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function KnowledgeGraphPreview() {
  const { subaccounts, hasConnectedLocations, connectionsLoading } = useOwnerConnectionState();
  const [selectedNode, setSelectedNode] = useState<LiveNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Auto-select first subaccount
  useEffect(() => {
    if (subaccounts.length > 0 && !selectedTenantId) {
      setSelectedTenantId(subaccounts[0].ghlLocationId);
    }
  }, [subaccounts, selectedTenantId]);

  const tenantId = selectedTenantId || subaccounts[0]?.ghlLocationId || "";

  // Load live knowledge graph
  const { data: graphData, isLoading } = trpc.knowledgeGraph.get.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const nodes = (graphData?.nodes ?? []) as unknown as LiveNode[];
  const edges = (graphData?.edges ?? []) as unknown as LiveEdge[];

  // Build a node map for edge rendering
  const nodeMap = new Map<number, LiveNode>(nodes.map(n => [n.id, n]));

  // Derive stats
  const typeCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.nodeType] = (acc[n.nodeType] ?? 0) + 1;
    return acc;
  }, {});

  const selectedNodeConfig = selectedNode ? (NODE_CONFIG[selectedNode.nodeType] ?? NODE_CONFIG.default) : null;

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
                  <div className="section-label">Knowledge Graph</div>
                  {nodes.length > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.1)] text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      LIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      AWAITING DATA
                    </div>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Knowledge Graph
                </h1>
                <p className="text-sm text-[#FFFFFF]/50 mt-1">
                  EEOS maps every entity in your business — clients, contacts, opportunities — and the relationships between them.
                </p>
              </div>
              {!hasConnectedLocations && (
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)] shrink-0 self-start"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GHL
                </Link>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Subaccount Selector */}
      {subaccounts.length > 1 && (
        <section className="py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {subaccounts.map((sub) => (
                <button
                  key={sub.ghlLocationId}
                  onClick={() => setSelectedTenantId(sub.ghlLocationId)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    tenantId === sub.ghlLocationId
                      ? "bg-[rgba(201,162,39,0.12)] text-[#C9A227] border border-[rgba(201,162,39,0.3)]"
                      : "text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80 hover:bg-[rgba(255,255,255,0.04)] border border-transparent"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {nodes.length > 0 && (
        <section className="py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection delay={100}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(typeCounts).slice(0, 4).map(([type, count]) => {
                  const cfg = NODE_CONFIG[type] ?? NODE_CONFIG.default;
                  const Icon = cfg.icon;
                  return (
                    <div key={type} className="glass-card rounded-xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}18` }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: cfg.color, fontFamily: "'Space Grotesk', sans-serif" }}>{count}</div>
                        <div className="text-[10px] text-[#FFFFFF]/45 capitalize" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{type.toUpperCase()}S</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Graph Canvas */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection delay={150}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3">
                  <Network className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-sm font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Entity Relationship Map
                  </span>
                  {nodes.length > 0 && (
                    <span className="text-xs text-[#FFFFFF]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {nodes.length} nodes · {edges.length} edges
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-3 text-[10px]">
                    {Object.entries(NODE_CONFIG).filter(([k]) => k !== "tag" && k !== "default").map(([type, cfg]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-[#FFFFFF]/45 capitalize" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#FFFFFF]/30">
                    <Info className="w-3 h-3" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Click nodes to inspect</span>
                  </div>
                </div>
              </div>

              <div className="relative" style={{ height: "520px", background: "radial-gradient(ellipse at center, rgba(201,162,39,0.03) 0%, transparent 70%)" }}>

                {/* Loading */}
                {(isLoading || connectionsLoading) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
                  </div>
                )}

                {/* No tenant */}
                {!tenantId && !isLoading && !connectionsLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <Network className="w-12 h-12 text-[#FFFFFF]/15" />
                    <p className="text-sm text-[#FFFFFF]/40">Connect GoHighLevel to build your Knowledge Graph</p>
                    <Link
                      href="/connect-ghl"
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Zap className="w-4 h-4" />
                      Connect GoHighLevel
                    </Link>
                  </div>
                )}

                {/* Empty — connected but no nodes yet */}
                {tenantId && !isLoading && nodes.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Network className="w-12 h-12 text-[#FFFFFF]/15" />
                    <p className="text-sm text-[#FFFFFF]/40">Knowledge Graph builds as GoHighLevel sends signals to EEOS</p>
                    <p className="text-xs text-[#FFFFFF]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Webhook endpoint: POST /api/ghl/webhook
                    </p>
                  </div>
                )}

                {/* Live graph */}
                {!isLoading && nodes.length > 0 && (
                  <>
                    {/* SVG Edges */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                      {edges.map((edge) => {
                        const fromNode = nodeMap.get(edge.fromNodeId);
                        const toNode = nodeMap.get(edge.toNodeId);
                        if (!fromNode || !toNode) return null;
                        const isHighlighted =
                          hoveredNodeId === edge.fromNodeId || hoveredNodeId === edge.toNodeId ||
                          (selectedNode && (selectedNode.id === edge.fromNodeId || selectedNode.id === edge.toNodeId));
                        return (
                          <line
                            key={edge.id}
                            x1="50%" y1="50%"
                            x2="50%" y2="50%"
                            stroke={isHighlighted ? "rgba(201,162,39,0.5)" : "rgba(201,162,39,0.1)"}
                            strokeWidth={1}
                            style={{ transition: "stroke 0.2s" }}
                          />
                        );
                      })}
                    </svg>

                    {/* Nodes */}
                    {nodes.map((node) => {
                      const nConfig = NODE_CONFIG[node.nodeType] ?? NODE_CONFIG.default;
                      const Icon = nConfig.icon;
                      const isSelected = selectedNode?.id === node.id;
                      const isHovered = hoveredNodeId === node.id;

                      return (
                        <button
                          key={node.id}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
                          style={{ left: `${(node.properties as Record<string, unknown> | null)?.posX ?? 50}%`, top: `${(node.properties as Record<string, unknown> | null)?.posY ?? 50}%` }}
                          onClick={() => setSelectedNode(isSelected ? null : node)}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          aria-label={`${node.nodeType}: ${node.label}`}
                          aria-pressed={isSelected}
                        >
                          <div
                            className="rounded-full flex items-center justify-center transition-all duration-200"
                            style={{
                              width: nConfig.size,
                              height: nConfig.size,
                              background: nConfig.bg,
                              border: `2px solid ${isSelected || isHovered ? nConfig.color : nConfig.border}`,
                              boxShadow: isSelected || isHovered ? `0 0 20px ${nConfig.color}40` : "none",
                              transform: isSelected || isHovered ? "scale(1.1)" : "scale(1)",
                            }}
                          >
                            <Icon className="w-4 h-4" style={{ color: nConfig.color }} />
                          </div>

                          {/* Health indicator */}


                          <div className="text-center pointer-events-none">
                            <div
                              className="text-[10px] font-semibold whitespace-nowrap max-w-[80px] truncate"
                              style={{ color: isSelected || isHovered ? nConfig.color : "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                              {node.label}
                            </div>
                            {node.properties && typeof node.properties === 'object' && 'sublabel' in node.properties && (
                              <div className="text-[9px] text-[#FFFFFF]/35 whitespace-nowrap max-w-[80px] truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {String(node.properties.sublabel)}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
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
                      <span className="text-lg font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{selectedNode.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ background: selectedNodeConfig.bg, color: selectedNodeConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {selectedNode.nodeType}
                      </span>
                    </div>
                    {selectedNode.properties && typeof selectedNode.properties === 'object' && 'sublabel' in selectedNode.properties && (
                      <p className="text-sm text-[#FFFFFF]/55">{String(selectedNode.properties.sublabel)}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EDGES: </span>
                        <span className="text-[#FFFFFF]/70">
                          {edges.filter((e: LiveEdge) => e.fromNodeId === selectedNode.id || e.toNodeId === selectedNode.id).length}
                        </span>
                      </div>
                      {selectedNode.signalCount != null && (
                        <div>
                          <span className="text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SIGNALS: </span>
                          <span className="text-[#FFFFFF]/70">{selectedNode.signalCount}</span>
                        </div>
                      )}
                      {selectedNode.externalId && (
                        <div>
                          <span className="text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GHL ID: </span>
                          <span className="text-[#FFFFFF]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedNode.externalId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-[#FFFFFF]/30 hover:text-[#FFFFFF]/60 transition-colors shrink-0 text-xs"
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

      {/* CTA */}
      {!hasConnectedLocations && (
      <section className="py-16 bg-[#141414]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 glass-card rounded-2xl border border-[rgba(201,162,39,0.15)]">
              <div>
                <div className="text-xs text-[#C9A227] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EAGLE EYE AUTOMATION · EEOS</div>
                <h2 className="text-xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Your real Knowledge Graph is waiting.
                </h2>
                <p className="text-sm text-[#FFFFFF]/55 mt-1">
                  Connect GoHighLevel and EEOS maps every contact, opportunity, and relationship in your business automatically.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/connect-ghl"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(201,162,39,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Connect GoHighLevel
                </Link>
                <Link
                  href="/executive-home"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-lg hover:bg-[rgba(201,162,39,0.08)] active:scale-[0.97] transition-all duration-200"
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
      )}

      <Footer hideConnectionLinks={hasConnectedLocations} />
    </div>
  );
}
