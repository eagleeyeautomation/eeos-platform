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

type ExecutiveRecommendationSet = {
  priority: RecommendationPriority;
  healthBand: "Green" | "Yellow" | "Red";
  executiveSummary: string;
  businessHealth: string;
  topRecommendation: string;
  revenueInsight: string;
  salesInsight: string;
  operationalInsight: string;
};

export default function ExecutiveDashboard() {
  const [data, setData] = useState<PrnDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/prn/gohighlevel/live-dashboard", {
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as PrnDashboardResponse;

      if (!response.ok) {
        throw new Error(payload.error || `Dashboard request failed with HTTP ${response.status}`);
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load live PRN Staffers data.");
      setData(null);
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
  const recommendations = useMemo(() => buildExecutiveRecommendations(metrics), [metrics]);

  return (
    <div className="min-h-screen bg-[#050B18] text-white">
      <Navigation />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="flex flex-col gap-5 border-b border-[#12314D] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/40 bg-[#071C33] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#38BDF8]">
              <Database className="h-3.5 w-3.5" />
              Live PRN Staffers GoHighLevel Data
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              EEOS Executive Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B7C5D8]">
              Eagle Eye operating view for PRN Staffers South Carolina, powered by the private GoHighLevel integration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#1D4F73] bg-[#08233D] px-4 text-sm font-semibold text-[#DDF7FF] transition hover:border-[#38BDF8] hover:bg-[#0B2D4D] disabled:cursor-not-allowed disabled:opacity-60"
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
            <ExecutiveRecommendations recommendations={recommendations} />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-[#12314D] bg-[#071426] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#38BDF8]">Business Health Score</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-6xl font-semibold text-white">{metrics.healthScore}</span>
                      <span className="pb-2 text-lg text-[#86A6C8]">/ 100</span>
                    </div>
                    <p className="mt-3 text-sm text-[#B7C5D8]">Live signal quality, opportunity coverage, and data availability are all healthy.</p>
                  </div>
                  <div className="rounded-full border border-[#0EA5E9]/40 bg-[#061A2F] p-3 text-[#38BDF8]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#12314D] bg-[#071426] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#38BDF8]">Connection Details</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow icon={Clock} label="Last Sync" value={formatDate(data?.lastSync)} />
                  <DetailRow icon={MapPin} label="Connected Location" value={locationName} />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#12314D] bg-[#071426] p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#38BDF8]">Endpoint Health Status</p>
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

function buildExecutiveRecommendations(metrics: typeof emptyMetrics): ExecutiveRecommendationSet {
  const pipelineRuleActive = metrics.openOpportunities > 50;
  const revenueRuleActive = metrics.pipelineValue > 10000;
  const contactsRuleActive = metrics.totalContacts > metrics.opportunities;
  const healthBand = metrics.healthScore >= 90 ? "Green" : metrics.healthScore >= 70 ? "Yellow" : "Red";

  const priority: RecommendationPriority =
    healthBand === "Red" ? "Critical" :
      pipelineRuleActive && revenueRuleActive ? "High" :
        pipelineRuleActive || revenueRuleActive || healthBand === "Yellow" ? "Medium" :
          "Low";

  return {
    priority,
    healthBand,
    executiveSummary: `EEOS is reading ${numberFormatter.format(metrics.totalContacts)} contacts, ${numberFormatter.format(metrics.openOpportunities)} open opportunities, and ${moneyFormatter.format(metrics.pipelineValue)} in live pipeline value from PRN Staffers GoHighLevel.`,
    businessHealth: `${healthBand} health status at ${metrics.healthScore}/100. ${healthBand === "Green" ? "Core data signals are strong and operational coverage is healthy." : healthBand === "Yellow" ? "Performance is serviceable, but leadership should review conversion and follow-up discipline." : "Immediate executive attention is recommended before pipeline or follow-up risk compounds."}`,
    topRecommendation: pipelineRuleActive
      ? "High opportunity volume detected. Review stalled opportunities and assign follow-up tasks."
      : "Opportunity volume is controlled. Keep monitoring follow-up ownership and stage movement.",
    revenueInsight: revenueRuleActive
      ? "Strong sales pipeline. Focus on increasing conversion rate to maximize revenue."
      : "Pipeline value is below the V1 revenue trigger. Prioritize qualified opportunity creation.",
    salesInsight: contactsRuleActive
      ? "Lead generation is healthy. Improve lead-to-opportunity conversion."
      : "Contact-to-opportunity balance is tight. Protect lead quality while expanding pipeline coverage.",
    operationalInsight: metrics.openOpportunities > 0
      ? `${numberFormatter.format(metrics.openOpportunities)} open opportunities need consistent ownership, next steps, and stage hygiene.`
      : "No open opportunities are currently visible in the live feed.",
  };
}

function ExecutiveRecommendations({ recommendations }: { recommendations: ExecutiveRecommendationSet }) {
  const items = [
    { label: "Executive Summary", value: recommendations.executiveSummary, icon: Brain },
    { label: "Business Health", value: recommendations.businessHealth, icon: ShieldCheck },
    { label: "Top Recommendation", value: recommendations.topRecommendation, icon: Target },
    { label: "Revenue Insight", value: recommendations.revenueInsight, icon: DollarSign },
    { label: "Sales Insight", value: recommendations.salesInsight, icon: TrendingUp },
    { label: "Operational Insight", value: recommendations.operationalInsight, icon: Activity },
  ];

  return (
    <section className="rounded-lg border border-[#0EA5E9]/35 bg-[#061527] p-5 shadow-[0_24px_80px_rgba(14,165,233,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#38BDF8]/35 bg-[#08233D] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
            <Brain className="h-3.5 w-3.5" />
            Executive Recommendations
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Intelligence Engine V1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C5D8]">
            Rules-based analysis of live PRN Staffers GoHighLevel metrics. No automatic actions are taken.
          </p>
        </div>
        <PriorityBadge priority={recommendations.priority} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <RecommendationCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ label, value, icon: Icon }: {
  label: string;
  value: string;
  icon: typeof Brain;
}) {
  return (
    <div className="rounded-md border border-[#12314D] bg-[#050F1D] p-4">
      <div className="flex items-center gap-2 text-[#38BDF8]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#D7E6F8]">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: RecommendationPriority }) {
  const styles: Record<RecommendationPriority, string> = {
    Critical: "border-[#EF4444]/45 bg-[#2A0808] text-[#FCA5A5]",
    High: "border-[#F59E0B]/45 bg-[#2A1C05] text-[#FBBF24]",
    Medium: "border-[#38BDF8]/45 bg-[#08233D] text-[#7DD3FC]",
    Low: "border-[#10B981]/40 bg-[#05291F] text-[#34D399]",
  };

  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-[#12314D] bg-[#071426] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86A6C8]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-[#7D91AA]">{detail}</p>
        </div>
        <div className="rounded-md border border-[#0EA5E9]/35 bg-[#08233D] p-2.5 text-[#38BDF8]">
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
    <div className="rounded-md border border-[#12314D] bg-[#050F1D] p-4">
      <div className="flex items-center gap-2 text-[#38BDF8]">
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
    <div className="rounded-md border border-[#12314D] bg-[#050F1D] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-white">{name}</p>
          <p className="mt-1 break-all text-xs text-[#7D91AA]">{visiblePath}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? "border-[#10B981]/35 bg-[#05291F] text-[#34D399]" : "border-[#F59E0B]/35 bg-[#2A1C05] text-[#FBBF24]"}`}>
          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          HTTP {visibleStatus}
        </span>
      </div>
      <p className="mt-3 text-xs text-[#86A6C8]">{health.responseTimeMs} ms response time</p>
      {health.errorSummary ? <p className="mt-2 text-xs text-[#FBBF24]">{health.errorSummary}</p> : null}
    </div>
  );
}

function StatePanel({ title, message, tone }: { title: string; message: string; tone: "loading" | "error" | "empty" }) {
  const Icon = tone === "error" ? AlertTriangle : tone === "empty" ? Database : RefreshCw;
  return (
    <section className="rounded-lg border border-[#12314D] bg-[#071426] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#0EA5E9]/35 bg-[#08233D] text-[#38BDF8]">
        <Icon className={`h-6 w-6 ${tone === "loading" ? "animate-spin" : ""}`} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#B7C5D8]">{message}</p>
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
