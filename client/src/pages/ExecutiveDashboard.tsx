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
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="flex flex-col gap-5 border-b border-[#E7D8A3] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A227]/40 bg-[#071C33] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              <Database className="h-3.5 w-3.5" />
              Live PRN Staffers GoHighLevel Data
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              EEOS Executive Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D8D8D8]">
              Eagle Eye operating view for PRN Staffers South Carolina, powered by the private GoHighLevel integration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#D9C579] bg-[#F8F4E8] px-4 text-sm font-semibold text-[#0B0B0B] transition hover:border-[#C9A227] hover:bg-[#F1E7C5] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </section>

        {loading ? (
          <StatePanel title="Loading live dashboard" message="EEOS is retrieving PRN Staffers data from GoHighLevel." tone="loading" />
        ) : error ? (
          <StatePanel title="Unable to load dashboard" message={error} tone="error" />
        ) : !hasLiveData ? (
          <StatePanel title="No live records returned" message="The integration responded, but no dashboard records were available." tone="empty" />
        ) : (
          <>
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
                <MetricCard key={card.label} {...card} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-[#E7D8A3] bg-[#FFFFFF] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9A227]">Business Health Score</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-6xl font-semibold text-white">{metrics.healthScore}</span>
                      <span className="pb-2 text-lg text-[#B8B8B8]">/ 100</span>
                    </div>
                    <p className="mt-3 text-sm text-[#D8D8D8]">Live signal quality, opportunity coverage, and data availability are all healthy.</p>
                  </div>
                  <div className="rounded-full border border-[#C9A227]/40 bg-[#061A2F] p-3 text-[#C9A227]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#E7D8A3] bg-[#FFFFFF] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9A227]">Connection Details</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow icon={Clock} label="Last Sync" value={formatDate(data?.lastSync)} />
                  <DetailRow icon={MapPin} label="Connected Location" value={locationName} />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#E7D8A3] bg-[#FFFFFF] p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9A227]">Endpoint Health Status</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">GoHighLevel API checks</h2>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#10B981]/35 bg-[#05291F] px-3 py-1 text-xs font-semibold text-[#34D399]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {Object.entries(data?.endpointHealth || {}).map(([name, health]) => (
                  <EndpointRow key={name} name={name} health={health} />
                ))}
              </div>
            </section>
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
    <section className="rounded-lg border border-[#C9A227]/35 bg-[#FFFFFF] p-5 shadow-[0_24px_80px_rgba(201,162,39,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C6F12]">
            <Brain className="h-3.5 w-3.5" />
            Executive Recommendations
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Intelligence Engine V1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8D8D8]">
            Rules-based analysis of verified live PRN Staffers GoHighLevel metrics. No automatic actions are taken.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {top ? <PriorityBadge priority={toDisplayPriority(top.priority)} /> : null}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#D9C579] bg-[#F8F4E8] px-3 text-xs font-semibold text-[#0B0B0B] transition hover:border-[#C9A227] hover:bg-[#F1E7C5]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Recommendations
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-4 text-sm text-[#FBBF24]">{error}</div>
      ) : !response || response.recommendations.length === 0 ? (
        <div className="mt-5 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4 text-sm text-[#D8D8D8]">No recommendation data available. Insufficient data.</div>
      ) : (
        <>
          {response.stale ? (
            <div className="mt-5 rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-4 text-sm text-[#FBBF24]">
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
    </section>
  );
}

function RecommendationCard({ label, value, icon: Icon, recommendation }: {
  label: string;
  value: string;
  icon: typeof Brain;
  recommendation?: ExecutiveRecommendation;
}) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[#C9A227]">
          <Icon className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
        </div>
        {recommendation ? <PriorityBadge priority={toDisplayPriority(recommendation.priority)} compact /> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#E8E8E8]">{value}</p>
      {recommendation ? (
        <div className="mt-4 space-y-3 border-t border-[#E7D8A3] pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">Confidence</p>
            <p className="mt-1 text-sm text-white">{recommendation.confidence}/100</p>
            <p className="mt-1 text-xs leading-5 text-[#A0A0A0]">{recommendation.confidenceReason}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">Supporting Evidence</p>
            <ul className="mt-1 space-y-1 text-xs leading-5 text-[#D8D8D8]">
              {recommendation.evidence.map((item) => (
                <li key={`${item.metric}-${item.value}`}>{item.metric}: {item.value} ({item.source})</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">Recommended Action</p>
            <p className="mt-1 text-xs leading-5 text-[#E8E8E8]">{recommendation.recommendedAction}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">How Success Will Be Measured</p>
            <p className="mt-1 text-xs leading-5 text-[#E8E8E8]">{recommendation.measurement}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PriorityBadge({ priority, compact = false }: { priority: RecommendationPriority; compact?: boolean }) {
  const styles: Record<RecommendationPriority, string> = {
    Critical: "border-[#EF4444]/45 bg-[#2A0808] text-[#FCA5A5]",
    High: "border-[#F59E0B]/45 bg-[#2A1C05] text-[#FBBF24]",
    Medium: "border-[#C9A227]/45 bg-[#F8F4E8] text-[#8C6F12]",
    Low: "border-[#10B981]/40 bg-[#05291F] text-[#34D399]",
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
    <section className="rounded-lg border border-[#C9A227]/30 bg-[#FFFFFF] p-5 shadow-[0_24px_80px_rgba(201,162,39,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C6F12]">
            <Database className="h-3.5 w-3.5" />
            B2B Intelligence
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">GoHighLevel Business Development Signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8D8D8]">
            {response?.summary || "Insufficient data."}
          </p>
        </div>
        {response ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8C6F12]">
            Confidence {response.confidence}/100
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-4 text-sm text-[#FBBF24]">{error}</div>
      ) : !response ? (
        <div className="mt-5 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4 text-sm text-[#D8D8D8]">No B2B intelligence data available. Insufficient data.</div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <B2BInsightCard key={item.label} label={item.label} insight={item.insight} icon={item.icon} />
          ))}
        </div>
      )}
    </section>
  );
}

function B2BInsightCard({ label, insight, icon: Icon }: {
  label: string;
  insight?: B2BInsight;
  icon: typeof Database;
}) {
  const displayInsight = insight || insufficientB2BInsight(label);

  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2 text-[#C9A227]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#E8E8E8]">{displayInsight.observation}</p>
      <div className="mt-4 border-t border-[#E7D8A3] pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">Evidence</p>
        <ul className="mt-1 space-y-1 text-xs leading-5 text-[#D8D8D8]">
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
    <section className="rounded-lg border border-[#C9A227]/30 bg-[#FFFFFF] p-5 shadow-[0_24px_80px_rgba(201,162,39,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C6F12]">
            <Users className="h-3.5 w-3.5" />
            C2B Intelligence
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Consumer Activity Signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8D8D8]">
            {response?.consumerDemandSummary || "Insufficient data."}
          </p>
        </div>
        {response ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8C6F12]">
            Confidence {response.confidence}/100
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-4 text-sm text-[#FBBF24]">{error}</div>
      ) : !response ? (
        <div className="mt-5 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4 text-sm text-[#D8D8D8]">No C2B intelligence data available. Insufficient data.</div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <B2BInsightCard key={item.label} label={item.label} insight={item.insight} icon={item.icon} />
          ))}
        </div>
      )}
    </section>
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

function MetricCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-[#E7D8A3] bg-[#FFFFFF] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-[#A0A0A0]">{detail}</p>
        </div>
        <div className="rounded-md border border-[#C9A227]/35 bg-[#F8F4E8] p-2.5 text-[#C9A227]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2 text-[#C9A227]">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function EndpointRow({ name, health }: { name: string; health: EndpointHealth }) {
  const attempt = health.attempts?.find((item) => item.ok) || health.attempts?.[0];
  const visiblePath = attempt?.path || health.path;
  const visibleStatus = attempt?.status || health.status;
  const ok = Boolean(attempt?.ok ?? health.ok);

  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-white">{name}</p>
          <p className="mt-1 break-all text-xs text-[#A0A0A0]">{visiblePath}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? "border-[#10B981]/35 bg-[#05291F] text-[#34D399]" : "border-[#F59E0B]/35 bg-[#2A1C05] text-[#FBBF24]"}`}>
          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          HTTP {visibleStatus}
        </span>
      </div>
      <p className="mt-3 text-xs text-[#B8B8B8]">{health.responseTimeMs} ms response time</p>
      {health.errorSummary ? <p className="mt-2 text-xs text-[#FBBF24]">{health.errorSummary}</p> : null}
    </div>
  );
}

function StatePanel({ title, message, tone }: { title: string; message: string; tone: "loading" | "error" | "empty" }) {
  const Icon = tone === "error" ? AlertTriangle : tone === "empty" ? Database : RefreshCw;
  return (
    <section className="rounded-lg border border-[#E7D8A3] bg-[#FFFFFF] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] text-[#C9A227]">
        <Icon className={`h-6 w-6 ${tone === "loading" ? "animate-spin" : ""}`} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#D8D8D8]">{message}</p>
    </section>
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
