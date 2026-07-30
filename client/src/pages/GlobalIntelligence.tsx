import { ArrowUpRight, Building2, CircleDollarSign, ShieldCheck, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import type { IntelligenceDomain } from "./C2bIntelligence";

export default function GlobalIntelligence({ domain }: { domain: IntelligenceDomain }) {
  const query = trpc.admin.globalIntelligence.useQuery({ domain }, { retry: false });
  const data = query.data;
  const opportunityCount = data
    ? data.summary.newOpportunities
      + data.summary.qualifiedOpportunities
      + data.summary.highPriority
      + data.summary.pendingReview
      + data.summary.assigned
      + data.summary.converted
    : 0;
  const metrics = [
    ["Organizations represented", data?.organizationCount ?? 0, Building2],
    ["Opportunities", opportunityCount, Target],
    ["High priority", data?.summary.highPriority ?? 0, ArrowUpRight],
    ["Estimated value", `$${(data?.summary.pipelineValue ?? 0).toLocaleString()}`, CircleDollarSign],
  ] as const;

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-[#141414] p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">Platform Owner Intelligence</p>
          <h1 className="mt-3 text-4xl font-bold">Global {domain.toUpperCase()} Intelligence</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/60">
            Platform-wide, read-only intelligence aggregates. Organization and location authorization remain enforced for every customer workspace.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 px-3 py-2 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Platform administrator only
          </span>
        </section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value, Icon]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <Icon className="h-5 w-5 text-[#C9A227]" />
              <p className="mt-4 text-3xl font-bold">{query.isLoading ? "—" : value}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-white/45">{label}</p>
            </article>
          ))}
        </section>
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <h2 className="text-xl font-semibold">Executive Recommendations</h2>
          <p className="mt-1 text-sm text-white/50">Every item requires source, evidence, confidence, reason, priority, and supporting data.</p>
          {data?.recommendations.length ? (
            <div className="mt-5 space-y-3">
              {data.recommendations.map((item) => (
                <article key={item.opportunityId} className="rounded-xl border border-white/10 p-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{item.reason}</p>
                  <p className="mt-2 text-xs text-white/40">Source: {item.source} · Confidence: {item.confidence}% · Organization: {item.organizationId}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 py-12 text-center text-sm text-white/50">
              {query.isError ? "Global intelligence is unavailable." : "No attributed platform-wide recommendations yet."}
            </div>
          )}
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
