import {
  Activity, AlertTriangle, Brain, Building2, CalendarDays,
  CircleDollarSign, HeartPulse, Megaphone, ShieldAlert, Sparkles, Target, Users,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import OrganizationWelcomeBanner from "@/components/OrganizationWelcomeBanner";
import { trpc } from "@/lib/trpc";

const tone = (score: number | null) => score === null ? "text-white/45" : score >= 80 ? "text-emerald-300" : score >= 60 ? "text-[#C9A227]" : "text-red-300";

function Empty({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">{children}</p>;
}

export default function ExecutiveMissionControl() {
  const query = trpc.missionControl.dashboard.useQuery(undefined, { retry: false, refetchInterval: 60000 });
  const data = query.data;
  const health = [
    ["Business Health", data?.health.business, HeartPulse],
    ["Financial Health", data?.health.financial, CircleDollarSign],
    ["Marketing Health", data?.health.marketing, Megaphone],
    ["Operations Health", data?.health.operations, Activity],
    ["Customer Health", data?.health.customer, Users],
  ] as const;
  const intelligence = [
    ["C2C Intelligence", data?.intelligence.c2c, Users],
    ["C2B Intelligence", data?.intelligence.c2b, Target],
    ["B2B Intelligence", data?.intelligence.b2b, Building2],
  ] as const;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <OrganizationWelcomeBanner />
        <section className="rounded-3xl border border-white/10 bg-[#141414] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">Executive Mission Control</p>
              <h1 className="mt-3 text-4xl font-bold">Today’s Executive Operating Picture</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/55">One evidence-based view across business health, intelligence, risks, opportunities, and executive priorities.</p>
            </div>
            <div className="min-w-52 rounded-2xl border border-[#C9A227]/25 bg-[#C9A227]/[0.06] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">Executive Readiness</p>
              <p className={`mt-2 text-5xl font-bold ${tone(data?.readiness.score ?? null)}`}>{query.isLoading ? "—" : data?.readiness.score ?? "N/A"}</p>
              <p className="mt-2 text-xs capitalize text-white/45">{data?.readiness.trend ?? "unavailable"} trend · {data?.readiness.coverage ?? 0}% evidence coverage</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {health.map(([label, item, Icon]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <Icon className="h-5 w-5 text-[#C9A227]" />
              <p className={`mt-4 text-3xl font-bold ${tone(item?.score ?? null)}`}>{item?.score ?? "N/A"}</p>
              <p className="mt-1 text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-white/40">{item?.label ?? "Unavailable"}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {intelligence.map(([label, item, Icon]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <Icon className="h-5 w-5 text-[#C9A227]" />
              <p className="mt-4 text-3xl font-bold">{item?.highPriority ?? 0}</p>
              <p className="mt-1 font-semibold">{label}</p>
              <p className="mt-2 text-xs text-white/45">{item?.pendingReview ?? 0} pending review · {item?.converted ?? 0} converted</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <div className="flex items-center gap-3"><Brain className="h-5 w-5 text-[#C9A227]" /><h2 className="text-xl font-semibold">Executive Briefing</h2></div>
          <p className="mt-2 text-sm text-white/50">Confidence: {data?.briefing.confidence ?? "Unavailable"} · Supporting evidence: {data?.briefing.evidenceCount ?? 0}</p>
          {data?.briefing.topPriorities.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {data.briefing.topPriorities.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-[#C9A227]">{item.priority} priority</p>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/55">{item.why}</p>
                  <p className="mt-3 text-sm"><strong>Action:</strong> {item.recommendedAction}</p>
                  <p className="mt-2 text-xs text-white/40">Confidence {item.confidenceScore}% · {item.businessImpact}</p>
                </article>
              ))}
            </div>
          ) : <Empty>No attributed executive recommendations are available. Nothing has been fabricated.</Empty>}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <List title="Critical Alerts" icon={AlertTriangle} items={data?.criticalAlerts ?? []} empty="No verified critical alerts." />
          <List title="Upcoming Risks" icon={ShieldAlert} items={data?.upcomingRisks ?? []} empty="No attributed upcoming risks." />
          <List title="Growth Opportunities" icon={Sparkles} items={data?.growthOpportunities ?? []} empty="No attributed growth opportunities." />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Period title="Today’s Priorities" items={data?.periods.today ?? []} />
          <Period title="This Week" items={data?.periods.thisWeek ?? []} />
          <Period title="This Month" items={data?.periods.thisMonth ?? []} />
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}

function List({ title, icon: Icon, items, empty }: { title: string; icon: typeof AlertTriangle; items: Array<{ id: number; title: string; confidenceScore: number }>; empty: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#141414] p-5">
      <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#C9A227]" /><h2 className="font-semibold">{title}</h2></div>
      {items.length ? <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">{item.title}<span className="mt-1 block text-xs text-white/40">{item.confidenceScore}% confidence</span></li>)}</ul> : <p className="mt-4 text-sm text-white/40">{empty}</p>}
    </section>
  );
}

function Period({ title, items }: { title: string; items: Array<{ id: number; title: string; priority: string }> }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#C9A227]" /><h2 className="font-semibold">{title}</h2></div>
      {items.length ? <ul className="mt-4 space-y-2 text-sm">{items.slice(0, 5).map((item) => <li key={item.id}>{item.title} <span className="text-white/35">· {item.priority}</span></li>)}</ul> : <p className="mt-4 text-sm text-white/40">No attributed priorities in this period.</p>}
    </section>
  );
}
