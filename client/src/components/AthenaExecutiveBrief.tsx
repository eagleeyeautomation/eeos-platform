import { useEffect, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, Clock, RefreshCw, ShieldCheck, Target, TrendingUp } from "lucide-react";

type AthenaPriority = {
  id: string;
  rank: number;
  title: string;
  category: string;
  priority: string;
  observation: string;
  recommendedAction: string;
  whyNow: string;
  businessImpact: { score: number; description: string };
  urgency: string;
  confidence: number;
  confidenceReason: string;
  measurement: string;
  memoryInfluence: string[];
};

type AthenaBrief = {
  businessId: string;
  generatedAt: string;
  dataFreshness: {
    status: "fresh" | "stale" | "incomplete";
    lastSync: string;
    ageMinutes: number;
  };
  executiveGreeting: string;
  businessHealth: {
    score: number;
    status: string;
    reason: string;
    components: Record<string, number>;
  };
  executiveSummary: string;
  whatChanged: string[];
  topPriorities: AthenaPriority[];
  topOpportunity: AthenaPriority | null;
  topRisk: AthenaPriority | null;
  decisionOfTheDay: {
    title: string;
    decision: string;
    recommendedAction: string;
    whyToday: string;
    expectedMeasurableResult: string;
    confidence: number;
    strategicAlignment: string[];
    memoryInfluence: string[];
  } | null;
  watchList: string[];
  memoryInfluence: string[];
  confidence: {
    score: number;
    level: "high" | "medium" | "low";
    reason: string;
  };
};

export default function AthenaExecutiveBrief() {
  const [brief, setBrief] = useState<AthenaBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBrief() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/prn/athena/executive-brief", { headers: { Accept: "application/json" } });
      const payload = await response.json() as AthenaBrief & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Athena request failed with HTTP ${response.status}`);
      }
      setBrief(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Athena Executive Brief.");
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBrief();
  }, []);

  return (
    <section data-testid="athena-executive-brief" className="rounded-lg border border-[#C9A227]/35 bg-[#FFFFFF] p-5 shadow-[0_28px_90px_rgba(201,162,39,0.10)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C6F12]">
            <Brain className="h-3.5 w-3.5" />
            Athena Executive Brief
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">{brief?.executiveGreeting || "Executive Brain V1"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8D8D8]">
            {brief?.executiveSummary || "Athena answers what the CEO should do next using verified production data and Business Memory."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBrief()}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#D9C579] bg-[#F8F4E8] px-3 text-xs font-semibold text-[#0B0B0B] transition hover:border-[#C9A227] hover:bg-[#F1E7C5] disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Athena
        </button>
      </div>

      {loading ? (
        <AthenaState title="Generating Athena brief" message="Athena is combining live GoHighLevel data, Intelligence Engine output, and Business Memory." />
      ) : error ? (
        <AthenaState title="Athena brief unavailable" message={error} tone="error" />
      ) : !brief ? (
        <AthenaState title="No Athena brief available" message="Insufficient verified data to make a reliable recommendation." />
      ) : (
        <div className="mt-5 space-y-5">
          {brief.dataFreshness.status !== "fresh" ? (
            <div className="rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-3 text-sm text-[#FBBF24]">
              Data freshness warning: {brief.dataFreshness.status}. Athena reduced confidence and avoids unsupported high-confidence recommendations.
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-4">
            <AthenaMetric icon={ShieldCheck} label="Business Health" value={`${brief.businessHealth.score}/100`} detail={brief.businessHealth.status} />
            <AthenaMetric icon={Clock} label="Data Freshness" value={brief.dataFreshness.status} detail={`${brief.dataFreshness.ageMinutes} minutes old`} />
            <AthenaMetric icon={CheckCircle2} label="Confidence" value={`${brief.confidence.score}/100`} detail={brief.confidence.level} />
            <AthenaMetric icon={Brain} label="Last Generated" value={formatDate(brief.generatedAt)} detail="Athena audit stored" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
              <div className="flex items-center gap-2 text-[#C9A227]">
                <Target className="h-4 w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">Decision of the Day</h3>
              </div>
              {brief.decisionOfTheDay ? (
                <div className="mt-3">
                  <p className="text-lg font-semibold text-white">{brief.decisionOfTheDay.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#E8E8E8]">{brief.decisionOfTheDay.recommendedAction}</p>
                  <p className="mt-2 text-xs leading-5 text-[#D8D8D8]">Why today: {brief.decisionOfTheDay.whyToday}</p>
                  <p className="mt-2 text-xs leading-5 text-[#D8D8D8]">Expected measurable result: {brief.decisionOfTheDay.expectedMeasurableResult}</p>
                  <p className="mt-2 text-xs text-[#8C6F12]">Confidence {brief.decisionOfTheDay.confidence}/100</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#D8D8D8]">Insufficient verified data to make a reliable recommendation.</p>
              )}
            </div>

            <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
              <div className="flex items-center gap-2 text-[#C9A227]">
                <TrendingUp className="h-4 w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">Top Opportunity and Risk</h3>
              </div>
              <BriefCallout label="Top Opportunity" priority={brief.topOpportunity} />
              <BriefCallout label="Top Risk" priority={brief.topRisk} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <BriefList title="Top 3 Priorities" items={brief.topPriorities.slice(0, 3).map((item) => `${item.rank}. ${item.title}: ${item.recommendedAction}`)} />
            <BriefList title="What Changed" items={brief.whatChanged} />
            <BriefList title="Watch List" items={brief.watchList} />
          </div>

          <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
            <div className="flex items-center gap-2 text-[#C9A227]">
              <Brain className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">Business Memory Influence</h3>
            </div>
            {brief.memoryInfluence.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#D8D8D8] md:grid-cols-2">
                {brief.memoryInfluence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#D8D8D8]">No current Business Memory record changed this brief.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function athenaBriefHasRequiredExecutiveFields(brief: AthenaBrief) {
  return Boolean(brief.decisionOfTheDay?.title && brief.dataFreshness.status && typeof brief.confidence.score === "number");
}

function AthenaMetric({ icon: Icon, label, value, detail }: { icon: typeof Brain; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2 text-[#C9A227]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold capitalize text-white">{value}</p>
      <p className="mt-1 text-xs text-[#A0A0A0]">{detail}</p>
    </div>
  );
}

function BriefCallout({ label, priority }: { label: string; priority: AthenaPriority | null }) {
  return (
    <div className="mt-3 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B8B8]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{priority?.title || "Insufficient verified data"}</p>
      <p className="mt-1 text-xs leading-5 text-[#D8D8D8]">{priority?.observation || "Insufficient verified data to make a reliable recommendation."}</p>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A227]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[#D8D8D8]">
          {items.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#A0A0A0]">Insufficient verified data.</p>
      )}
    </div>
  );
}

function AthenaState({ title, message, tone = "empty" }: { title: string; message: string; tone?: "empty" | "error" }) {
  return (
    <div className={`mt-5 rounded-md border p-4 text-sm ${tone === "error" ? "border-[#F59E0B]/35 bg-[#2A1C05] text-[#FBBF24]" : "border-[#E7D8A3] bg-[#FFFFFF] text-[#D8D8D8]"}`}>
      <div className="flex items-center gap-2">
        {tone === "error" ? <AlertTriangle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 animate-spin" />}
        <p className="font-semibold text-white">{title}</p>
      </div>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
