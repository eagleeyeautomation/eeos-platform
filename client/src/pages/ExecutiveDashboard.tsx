import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BusinessMemoryCommandCenter from "@/components/BusinessMemoryCommandCenter";
import AthenaExecutiveBrief from "@/components/AthenaExecutiveBrief";
import AthenaLearningLoop from "@/components/AthenaLearningLoop";
import { EeosMascotGuide } from "@/components/eeos/EeosMascotGuide";
import { EeosMetricCard } from "@/components/eeos/EeosMetricCard";
import { EeosStatusBadge } from "@/components/eeos/EeosStatusBadge";
import { EeosSurface } from "@/components/eeos/EeosSurface";
import { Button } from "@/components/ui/button";

type EndpointHealth = {
  ok: boolean;
  status: number;
  path: string;
  responseTimeMs: number;
  errorSummary?: string;
  attempts?: Array<{
    ok: boolean;
    status: number;
    path: string;
    errorSummary?: string;
  }>;
};

type PrnDashboardResponse = {
  ok: boolean;
  mode: string;
  source: string;
  division: string;
  locationId: string;
  lastSync: string;
  location?: {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
  };
  metrics?: {
    totalContacts: number;
    users: number;
    opportunities: number;
    openOpportunities: number;
    pipelineValue: number;
    healthScore: number;
  };
  endpointHealth?: Record<string, EndpointHealth>;
  error?: string;
};

const emptyMetrics = {
  totalContacts: 0,
  users: 0,
  opportunities: 0,
  openOpportunities: 0,
  pipelineValue: 0,
  healthScore: 0,
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

type RecommendationPriority = "Critical" | "High" | "Medium" | "Low";

type ExecutiveRecommendation = {
  id: string;
  category: "sales" | "revenue" | "operations" | "risk";
  priority: "critical" | "high" | "medium" | "low";
  observation: string;
  evidence: Array<{
    metric: string;
    value: string;
    source: "GoHighLevel";
  }>;
  recommendedAction: string;
  expectedImpact: string;
  confidence: number;
  confidenceReason: string;
  measurement: string;
  dataTimestamp: string;
};

type ExecutiveRecommendationResponse = {
  ok: boolean;
  dataTimestamp: string;
  stale: boolean;
  summary: {
    executiveSummary: string;
    topDecision: string;
    revenueInsight: string;
    salesInsight: string;
    operationalInsight: string;
    riskAlert: string;
  };
  recommendations: ExecutiveRecommendation[];
  error?: string;
};

type B2BInsight = {
  id: string;
  label: string;
  observation: string;
  evidence: Array<{
    metric: string;
    value: string;
    source: "GoHighLevel";
    recordIds?: string[];
  }>;
};

type B2BIntelligenceResponse = {
  ok: boolean;
  summary: string;
  sourcePerformance: B2BInsight[];
  stalledOpportunities: B2BInsight[];
  highValueOpportunities: B2BInsight[];
  referralInsights: B2BInsight[];
  territoryInsights: B2BInsight[];
  recommendedActions: B2BInsight[];
  confidence: number;
  dataTimestamp: string;
  error?: string;
};

type C2BIntelligenceResponse = {
  ok: boolean;
  consumerDemandSummary: string;
  serviceInterest: B2BInsight[];
  geographicDemand: B2BInsight[];
  journeyDropOffs: B2BInsight[];
  responseTimeInsights: B2BInsight[];
  conversionSignals: B2BInsight[];
  recommendedActions: B2BInsight[];
  confidence: number;
  dataTimestamp: string;
  error?: string;
};

export default function ExecutiveDashboard() {
  const [data, setData] = useState<PrnDashboardResponse | null>(null);
  const [recommendationData, setRecommendationData] = useState<ExecutiveRecommendationResponse | null>(null);
  const [b2bData, setB2bData] = useState<B2BIntelligenceResponse | null>(null);
  const [c2bData, setC2bData] = useState<C2BIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [b2bError, setB2bError] = useState<string | null>(null);
  const [c2bError, setC2bError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setRecommendationError(null);
    setB2bError(null);
    setC2bError(null);

    try {
      const [dashboardResponse, recommendationResponse, b2bResponse, c2bResponse] = await Promise.all([
        fetch("/api/prn/gohighlevel/live-dashboard", { headers: { Accept: "application/json" } }),
        fetch("/api/prn/executive-recommendations", { headers: { Accept: "application/json" } }),
        fetch("/api/prn/b2b-intelligence", { headers: { Accept: "application/json" } }),
        fetch("/api/prn/c2b-intelligence", { headers: { Accept: "application/json" } }),
      ]);
      const payload = (await dashboardResponse.json()) as PrnDashboardResponse;
      const recommendationPayload = (await recommendationResponse.json()) as ExecutiveRecommendationResponse;
      const b2bPayload = (await b2bResponse.json()) as B2BIntelligenceResponse;
      const c2bPayload = (await c2bResponse.json()) as C2BIntelligenceResponse;

      if (!dashboardResponse.ok) {
        throw new Error(payload.error || `Dashboard request failed with HTTP ${dashboardResponse.status}`);
      }

      setData(payload);
      if (recommendationResponse.ok || recommendationResponse.status === 207) {
        setRecommendationData(recommendationPayload);
      } else {
        setRecommendationData(null);
        setRecommendationError(recommendationPayload.error || `Recommendation request failed with HTTP ${recommendationResponse.status}`);
      }
      if (b2bResponse.ok || b2bResponse.status === 207) {
        setB2bData(b2bPayload);
      } else {
        setB2bData(null);
        setB2bError(b2bPayload.error || `B2B intelligence request failed with HTTP ${b2bResponse.status}`);
      }
      if (c2bResponse.ok || c2bResponse.status === 207) {
        setC2bData(c2bPayload);
      } else {
        setC2bData(null);
        setC2bError(c2bPayload.error || `C2B intelligence request failed with HTTP ${c2bResponse.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load live PRN Staffers data.");
      setData(null);
      setRecommendationData(null);
      setB2bData(null);
      setC2bData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = data?.metrics || emptyMetrics;
  const locationName = useMemo(() => {
    const location = data?.location;
    if (!location) return "Not connected";
    const region = [location.city, location.state].filter(Boolean).join(", ");
    return region ? `${location.name || "PRN Staffers"} - ${region}` : location.name || "PRN Staffers South Carolina";
  }, [data?.location]);

  const cards = [
    {
      label: "Total Contacts",
      value: numberFormatter.format(metrics.totalContacts),
      detail: "Live CRM records",
      icon: Users,
    },
    {
      label: "Users",
      value: numberFormatter.format(metrics.users),
      detail: "Location users",
      icon: ShieldCheck,
    },
    {
      label: "Open Opportunities",
      value: numberFormatter.format(metrics.openOpportunities),
      detail: `${numberFormatter.format(metrics.opportunities)} total opportunities`,
      icon: Activity,
    },
    {
      label: "Pipeline Value",
      value: moneyFormatter.format(metrics.pipelineValue),
      detail: "Current opportunity value",
      icon: DollarSign,
    },
  ];

  const hasLiveData = Boolean(data?.ok && data.metrics && (metrics.totalContacts > 0 || metrics.users > 0 || metrics.opportunities > 0));

  return (
    <div className="eeos-dashboard-shell min-h-screen text-[var(--text-primary)]">
      <Navigation />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="flex flex-col gap-5 border-b border-[var(--border-primary)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:rgba(201,162,39,0.4)] bg-[var(--surface-primary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--eeos-gold)]">
              <Database className="h-3.5 w-3.5" />
              Live PRN Staffers GoHighLevel Data
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-[var(--text-primary)] sm:text-4xl">
              EEOS Executive Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Executive operating view for PRN Staffers South Carolina, powered by the private GoHighLevel integration.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void loadDashboard()}
            variant="eeosPrimary"
            className="h-11 px-4 font-semibold"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </section>

        {loading ? (
          <StatePanel title="Loading live dashboard" message="EEOS is retrieving PRN Staffers data from GoHighLevel." tone="loading" />
        ) : error ? (
          <StatePanel title="Unable to load dashboard" message={error} tone="error" />
        ) : !hasLiveData ? (
          <StatePanel title="No live records returned" message="The integration responded, but no dashboard records were available." tone="empty" />
        ) : (
          <>
            <EeosMascotGuide
              variant="welcome"
              title={`Executive intelligence for ${locationName}`}
              description="EEOS is monitoring live operational signals, recommendations, system health, and connected data from one executive command view."
              alt="EEOS eagle intelligence guide"
            />

            <AthenaExecutiveBrief />

            <AthenaLearningLoop />

            <ExecutiveRecommendations
              response={recommendationData}
              error={recommendationError}
              onRefresh={() => void loadDashboard()}
            />

            <BusinessMemoryCommandCenter />

            <B2BIntelligenceSection response={b2bData} error={b2bError} />

            <C2BIntelligenceSection response={c2bData} error={c2bError} />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <EeosMetricCard key={card.label} {...card} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <EeosSurface className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--eeos-gold)]">Business Health Score</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-6xl font-semibold text-[var(--text-primary)]">{metrics.healthScore}</span>
                      <span className="pb-2 text-lg text-[var(--text-muted)]">/ 100</span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">Live signal quality, opportunity coverage, and data availability are all healthy.</p>
                  </div>
                  <div className="rounded-full border border-[color:rgba(16,185,129,0.42)] bg-[color:rgba(16,185,129,0.1)] p-3 text-[#6ee7b7]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                </div>
              </EeosSurface>

              <EeosSurface className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--eeos-gold)]">Connection Details</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow icon={Clock} label="Last Sync" value={formatDate(data?.lastSync)} />
                  <DetailRow icon={MapPin} label="Connected Location" value={locationName} />
                </div>
              </EeosSurface>
            </section>

            <EeosSurface className="p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--eeos-gold)]">Endpoint Health Status</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">GoHighLevel API checks</h2>
                </div>
                <EeosStatusBadge status="healthy">
                  Connected
                </EeosStatusBadge>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {Object.entries(data?.endpointHealth || {}).map(([name, health]) => (
                  <EndpointRow key={name} name={name} health={health} />
                ))}
              </div>
            </EeosSurface>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ExecutiveRecommendations({ response, error, onRefresh }: {
  response: ExecutiveRecommendationResponse | null;
  error: string | null;
  onRefresh: () => void;
}) {
  const top = response?.recommendations.find((item) => item.priority === "critical")
    || response?.recommendations.find((item) => item.priority === "high")
    || response?.recommendations[0];
  const revenue = response?.recommendations.find((item) => item.category === "revenue");
  const sales = response?.recommendations.find((item) => item.category === "sales");
  const operations = response?.recommendations.find((item) => item.category === "operations");
  const risk = response?.recommendations.find((item) => item.category === "risk");
  const items = response ? [
    { label: "Executive Summary", value: response.summary.executiveSummary, icon: Brain, recommendation: top },
    { label: "Top Decision", value: response.summary.topDecision, icon: Target, recommendation: top },
    { label: "Revenue Insight", value: response.summary.revenueInsight, icon: DollarSign, recommendation: revenue },
    { label: "Sales Insight", value: response.summary.salesInsight, icon: TrendingUp, recommendation: sales },
    { label: "Operational Insight", value: response.summary.operationalInsight, icon: Activity, recommendation: operations },
    { label: "Risk Alert", value: response.summary.riskAlert, icon: AlertTriangle, recommendation: risk },
  ] : [];

  return (
    <EeosSurface tone="intelligence" className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(201,162,39,0.4)] bg-[color:rgba(201,162,39,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--eeos-gold)]">
            <Brain className="h-3.5 w-3.5" />
            Executive Recommendations
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Intelligence Engine V1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Rules-based analysis of verified live PRN Staffers GoHighLevel metrics. No automatic actions are taken.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {top ? <PriorityBadge priority={toDisplayPriority(top.priority)} /> : null}
          <Button
            type="button"
            onClick={onRefresh}
            size="sm"
            variant="eeosPrimary"
            className="text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Recommendations
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[color:rgba(239,68,68,0.45)] bg-[color:rgba(239,68,68,0.1)] p-4 text-sm text-[#fca5a5]">{error}</div>
      ) : !response || response.recommendations.length === 0 ? (
        <div className="mt-5 rounded-md border border-[var(--border-primary)] bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">No recommendation data available. Insufficient data.</div>
      ) : (
        <>
          {response.stale ? (
            <div className="mt-5 rounded-md border border-[color:rgba(201,162,39,0.48)] bg-[color:rgba(201,162,39,0.1)] p-4 text-sm text-[#e4c75f]">
              Stale-data warning: last recommendation data is older than 15 minutes.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {items.map((item) => (
              <RecommendationCard key={item.label} {...item} />
            ))}
          </div>
        </>
      )}
    </EeosSurface>
  );
}

function RecommendationCard({ label, value, icon: Icon, recommendation }: {
  label: string;
  value: string;
  icon: typeof Brain;
  recommendation?: ExecutiveRecommendation;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--eeos-gold)]">
          <Icon className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
        </div>
        {recommendation ? <PriorityBadge priority={toDisplayPriority(recommendation.priority)} compact /> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{value}</p>
      {recommendation ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border-primary)] pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Confidence</p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">{recommendation.confidence}/100</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{recommendation.confidenceReason}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Supporting Evidence</p>
            <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
              {recommendation.evidence.map((item) => (
                <li key={`${item.metric}-${item.value}`}>{item.metric}: {item.value} ({item.source})</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Recommended Action</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{recommendation.recommendedAction}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">How Success Will Be Measured</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{recommendation.measurement}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PriorityBadge({ priority, compact = false }: { priority: RecommendationPriority; compact?: boolean }) {
  const styles: Record<RecommendationPriority, string> = {
    Critical: "border-[color:rgba(239,68,68,0.48)] bg-[color:rgba(239,68,68,0.1)] text-[#fca5a5]",
    High: "border-[color:rgba(239,68,68,0.38)] bg-[color:rgba(239,68,68,0.08)] text-[#fca5a5]",
    Medium: "border-[color:rgba(201,162,39,0.45)] bg-[color:rgba(201,162,39,0.1)] text-[#e4c75f]",
    Low: "border-[var(--border-primary)] bg-white/[0.04] text-[var(--text-secondary)]",
  };

  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border ${compact ? "px-2 py-0.5" : "px-3 py-1"} text-xs font-semibold uppercase tracking-[0.14em] ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function toDisplayPriority(priority: ExecutiveRecommendation["priority"]): RecommendationPriority {
  return priority.charAt(0).toUpperCase() + priority.slice(1) as RecommendationPriority;
}

function B2BIntelligenceSection({ response, error }: {
  response: B2BIntelligenceResponse | null;
  error: string | null;
}) {
  const bestSource = response?.sourcePerformance.find((item) => !item.observation.startsWith("Insufficient data"));
  const highestValue = response?.highValueOpportunities.find((item) => !item.observation.startsWith("Insufficient data"));
  const stalled = response?.stalledOpportunities[0];
  const referral = response?.referralInsights[0];
  const ownership = response?.recommendedActions.find((item) => item.label === "Ownership gaps");
  const nextAction = response?.recommendedActions.find((item) => item.label === "Recommended next business-development action") || response?.recommendedActions[0];
  const items = response ? [
    { label: "Best-performing lead source", insight: bestSource || response.sourcePerformance[0], icon: TrendingUp },
    { label: "Highest-value opportunity source", insight: highestValue || response.highValueOpportunities[0], icon: DollarSign },
    { label: "Stalled B2B opportunities", insight: stalled, icon: Clock },
    { label: "Referral pipeline health", insight: referral, icon: Users },
    { label: "Ownership gaps", insight: ownership || insufficientB2BInsight("Ownership gaps"), icon: ShieldCheck },
    { label: "Recommended next business-development action", insight: nextAction, icon: Target },
  ] : [];

  return (
    <EeosSurface tone="intelligence" className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <EeosStatusBadge status="intelligence">B2B Intelligence</EeosStatusBadge>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">GoHighLevel Business Development Signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {response?.summary || "Insufficient data."}
          </p>
        </div>
        {response ? (
          <EeosStatusBadge status="intelligence" showIcon={false}>
            Confidence {response.confidence}/100
          </EeosStatusBadge>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[color:rgba(239,68,68,0.45)] bg-[color:rgba(239,68,68,0.1)] p-4 text-sm text-[#fca5a5]">{error}</div>
      ) : !response ? (
        <div className="mt-5 rounded-md border border-[var(--border-primary)] bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">No B2B intelligence data available. Insufficient data.</div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <B2BInsightCard key={item.label} label={item.label} insight={item.insight} icon={item.icon} />
          ))}
        </div>
      )}
    </EeosSurface>
  );
}

function B2BInsightCard({ label, insight, icon: Icon }: {
  label: string;
  insight?: B2BInsight;
  icon: typeof Database;
}) {
  const displayInsight = insight || insufficientB2BInsight(label);

  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-[var(--eeos-gold)]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{displayInsight.observation}</p>
      <div className="mt-4 border-t border-[var(--border-primary)] pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Evidence</p>
        <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
          {displayInsight.evidence.map((item) => (
            <li key={`${item.metric}-${item.value}`}>{item.metric}: {item.value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function insufficientB2BInsight(label: string): B2BInsight {
  return {
    id: `insufficient-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label,
    observation: "Insufficient data.",
    evidence: [{ metric: "Available evidence", value: "Insufficient data", source: "GoHighLevel" }],
  };
}

function C2BIntelligenceSection({ response, error }: {
  response: C2BIntelligenceResponse | null;
  error: string | null;
}) {
  const service = response?.serviceInterest.find((item) => !item.observation.startsWith("Insufficient data"));
  const geography = response?.geographicDemand.find((item) => !item.observation.startsWith("Insufficient data"));
  const movement = response?.conversionSignals.find((item) => !item.observation.startsWith("Insufficient data"));
  const dropOff = response?.journeyDropOffs[0];
  const action = response?.recommendedActions.find((item) => item.label === "Recommended customer-experience action") || response?.recommendedActions[0];
  const items = response ? [
    { label: "New consumer demand", insight: demandSummaryInsight(response), icon: Users },
    { label: "Most requested service", insight: service || response.serviceInterest[0], icon: Activity },
    { label: "Highest-demand location", insight: geography || response.geographicDemand[0], icon: MapPin },
    { label: "Inquiry-to-opportunity movement", insight: movement || response.responseTimeInsights[0] || response.conversionSignals[0], icon: TrendingUp },
    { label: "Customer journey drop-offs", insight: dropOff, icon: AlertTriangle },
    { label: "Recommended customer-experience action", insight: action, icon: Target },
  ] : [];

  return (
    <EeosSurface tone="intelligence" className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <EeosStatusBadge status="intelligence">C2B Intelligence</EeosStatusBadge>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Consumer Activity Signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {response?.consumerDemandSummary || "Insufficient data."}
          </p>
        </div>
        {response ? (
          <EeosStatusBadge status="intelligence" showIcon={false}>
            Confidence {response.confidence}/100
          </EeosStatusBadge>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[color:rgba(239,68,68,0.45)] bg-[color:rgba(239,68,68,0.1)] p-4 text-sm text-[#fca5a5]">{error}</div>
      ) : !response ? (
        <div className="mt-5 rounded-md border border-[var(--border-primary)] bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">No C2B intelligence data available. Insufficient data.</div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <B2BInsightCard key={item.label} label={item.label} insight={item.insight} icon={item.icon} />
          ))}
        </div>
      )}
    </EeosSurface>
  );
}

function demandSummaryInsight(response: C2BIntelligenceResponse): B2BInsight {
  return {
    id: "consumer-demand-summary",
    label: "New consumer demand",
    observation: response.consumerDemandSummary,
    evidence: [
      { metric: "Consumer demand summary", value: response.consumerDemandSummary, source: "GoHighLevel" },
      { metric: "Data timestamp", value: response.dataTimestamp, source: "GoHighLevel" },
    ],
  };
}

function DetailRow({ icon: Icon, label, value }: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-[var(--eeos-gold)]">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function EndpointRow({ name, health }: { name: string; health: EndpointHealth }) {
  const attempt = health.attempts?.find((item) => item.ok) || health.attempts?.[0];
  const visiblePath = attempt?.path || health.path;
  const visibleStatus = attempt?.status || health.status;
  const ok = Boolean(attempt?.ok ?? health.ok);

  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">{name}</p>
          <p className="mt-1 break-all text-xs text-[var(--text-muted)]">{visiblePath}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? "border-[color:rgba(16,185,129,0.42)] bg-[color:rgba(16,185,129,0.1)] text-[#6ee7b7]" : "border-[color:rgba(239,68,68,0.48)] bg-[color:rgba(239,68,68,0.1)] text-[#fca5a5]"}`}>
          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          HTTP {visibleStatus}
        </span>
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">{health.responseTimeMs} ms response time</p>
      {health.errorSummary ? <p className="mt-2 text-xs text-[#fca5a5]">{health.errorSummary}</p> : null}
    </div>
  );
}

function StatePanel({ title, message, tone }: { title: string; message: string; tone: "loading" | "error" | "empty" }) {
  const Icon = tone === "error" ? AlertTriangle : tone === "empty" ? Database : RefreshCw;
  return (
    <EeosSurface tone={tone === "error" ? "critical" : "operational"} className="p-8 text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${tone === "error" ? "border-[color:rgba(239,68,68,0.5)] bg-[color:rgba(239,68,68,0.1)] text-[#fca5a5]" : "border-[color:rgba(201,162,39,0.42)] bg-[color:rgba(201,162,39,0.1)] text-[var(--eeos-gold)]"}`}>
        <Icon className={`h-6 w-6 ${tone === "loading" ? "animate-spin" : ""}`} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
    </EeosSurface>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
