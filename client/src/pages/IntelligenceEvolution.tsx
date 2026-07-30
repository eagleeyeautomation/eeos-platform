import { Activity, Brain, CheckCircle2, Gauge, History, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import OrganizationWelcomeBanner from "@/components/OrganizationWelcomeBanner";
import { trpc } from "@/lib/trpc";

export default function IntelligenceEvolution() {
  const query = trpc.evolution.dashboard.useQuery(undefined, { retry: false });
  const data = query.data;
  const metrics = [
    ["Approved evidence", data?.metrics.approvedLearningEvents ?? 0, ShieldCheck],
    ["Measured outcomes", data?.metrics.recordedOutcomes ?? 0, History],
    ["Accuracy", `${data?.metrics.accuracyRate ?? 0}%`, Gauge],
    ["Adaptive profiles", data?.metrics.adaptiveProfiles ?? 0, Brain],
  ] as const;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <OrganizationWelcomeBanner />
        <section className="rounded-3xl border border-white/10 bg-[#141414] p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">The Brain</p>
          <h1 className="mt-3 text-4xl font-bold">Continuous Intelligence Evolution</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/60">
            Approved evidence, executive decisions, and verified business outcomes improve organization-specific recommendations without sharing private customer memory.
          </p>
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
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-[#141414] p-6">
            <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-[#C9A227]" /><h2 className="text-xl font-semibold">Intelligence Health</h2></div>
            <p className="mt-4 text-lg font-semibold capitalize">{data?.health.status ?? "Loading"}</p>
            {data?.health.diagnostics.length ? (
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                {data.health.diagnostics.map((item) => <li key={item}>• {item.replaceAll("_", " ")}</li>)}
              </ul>
            ) : <p className="mt-4 text-sm text-white/55">No active diagnostic warnings.</p>}
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#141414] p-6">
            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#C9A227]" /><h2 className="text-xl font-semibold">Learning Governance</h2></div>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              <li>Only explicitly approved, attributed sources enter Intelligence Memory.</li>
              <li>Five verified outcomes are required before model-area recalibration.</li>
              <li>Adjustments are bounded and remain explainable.</li>
              <li>Human approval and existing RBAC remain authoritative.</li>
            </ul>
          </article>
        </section>
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <h2 className="text-xl font-semibold">Organization Learning Profiles</h2>
          {data?.profiles.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.profiles.map((profile) => (
                <article key={profile.id} className="rounded-xl border border-white/10 p-4">
                  <p className="font-semibold capitalize">{profile.modelArea}</p>
                  <p className="mt-2 text-sm text-white/55">{profile.explanation}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-white/50">
              No learning profile has reached the verified-outcome threshold. No adjustment has been applied.
            </p>
          )}
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
