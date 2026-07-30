export type ReadinessComponent =
  | "operations" | "revenue" | "growth" | "risk"
  | "customerExperience" | "staffing" | "connectorHealth" | "aiConfidence";

const WEIGHTS: Record<ReadinessComponent, number> = {
  operations: 0.16,
  revenue: 0.16,
  growth: 0.14,
  risk: 0.14,
  customerExperience: 0.12,
  staffing: 0.08,
  connectorHealth: 0.1,
  aiConfidence: 0.1,
};

export function calculateExecutiveReadiness(
  components: Partial<Record<ReadinessComponent, number | null>>,
  previousScore?: number | null,
) {
  const available = Object.entries(components)
    .filter((entry): entry is [ReadinessComponent, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
    .map(([key, value]) => ({ key, value: Math.max(0, Math.min(100, value)), weight: WEIGHTS[key] }));
  if (!available.length) return { score: null, trend: "unavailable" as const, coverage: 0, components };
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round(available.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
  const trend = typeof previousScore !== "number"
    ? "baseline" as const
    : score > previousScore ? "up" as const : score < previousScore ? "down" as const : "stable" as const;
  return {
    score,
    trend,
    coverage: Math.round((available.length / Object.keys(WEIGHTS).length) * 100),
    components,
  };
}

export function healthLabel(score: number | null) {
  if (score === null) return "Unavailable";
  if (score >= 80) return "Strong";
  if (score >= 60) return "Watch";
  return "Attention";
}

export function buildExecutiveBriefing(recommendations: Array<{
  id: number;
  title: string;
  why: string;
  recommendedAction: string;
  confidenceScore: number;
  priority: string;
  category: string;
  evidence: unknown;
  businessImpact: string;
  createdAt: Date;
}>) {
  const attributed = recommendations.filter((item) => Array.isArray(item.evidence) && item.evidence.length > 0);
  const ranked = [...attributed].sort((a, b) => {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
    return (rank[b.priority] ?? 0) - (rank[a.priority] ?? 0) || b.confidenceScore - a.confidenceScore;
  });
  return {
    topPriorities: ranked.slice(0, 3),
    criticalRisks: ranked.filter((item) => item.category === "risk" || item.priority === "critical").slice(0, 3),
    growthOpportunities: ranked.filter((item) => ["growth", "revenue", "pipeline"].includes(item.category)).slice(0, 3),
    confidence: ranked.length ? Math.round(ranked.reduce((sum, item) => sum + item.confidenceScore, 0) / ranked.length) : null,
    evidenceCount: ranked.reduce((sum, item) => sum + (item.evidence as unknown[]).length, 0),
  };
}
