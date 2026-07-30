import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import OrganizationWelcomeBanner from "@/components/OrganizationWelcomeBanner";
import { trpc } from "@/lib/trpc";

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export type IntelligenceDomain = "c2c" | "c2b" | "b2b";

export default function C2bIntelligence({ domain = "c2b" }: { domain?: IntelligenceDomain }) {
  const dashboard = trpc.c2b.dashboard.useQuery({ domain });
  const utils = trpc.useUtils();
  const opportunityAction = trpc.c2b.act.useMutation({
    onSuccess: () => utils.c2b.dashboard.invalidate(),
  });
  const summary = dashboard.data?.summary;
  const metrics = [
    ["New Opportunities", number(summary?.newOpportunities ?? 0), Target],
    ["Qualified Opportunities", number(summary?.qualifiedOpportunities ?? 0), CheckCircle2],
    ["High Priority", number(summary?.highPriority ?? 0), ArrowUpRight],
    ["Pending Review", number(summary?.pendingReview ?? 0), Clock3],
    ["Assigned", number(summary?.assigned ?? 0), UserCheck],
    ["Converted", number(summary?.converted ?? 0), BriefcaseBusiness],
    ["Pipeline Value", currency(summary?.pipelineValue ?? 0), CircleDollarSign],
    ["Referral Partners", number(summary?.referralPartners ?? 0), Users],
  ] as const;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <OrganizationWelcomeBanner />

        <section className="rounded-3xl border border-white/10 bg-[#141414] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                {dashboard.data?.config.label ?? domain.toUpperCase() + " Intelligence"}
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                {dashboard.data?.config.title ?? "Intelligence Center"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                {dashboard.data?.config.purpose ?? "Loading organization intelligence..."} Every downstream action remains human controlled.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Approval required
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value, Icon]) => (
            <article key={label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-white/50">{label}</p>
                <Icon className="h-5 w-5 text-[#C9A227]" />
              </div>
              <p className="mt-4 text-3xl font-bold">{dashboard.isLoading ? "—" : value}</p>
              <p className="mt-2 text-xs text-white/45">Verified, organization-scoped records</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown title="Opportunities by State" icon={MapPinned} items={summary?.byState ?? []} />
          <Breakdown title="Opportunities by Source" icon={Database} items={summary?.bySource ?? []} />
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-[#C9A227]" />
            <div>
              <h2 className="text-xl font-semibold">Opportunity Review</h2>
              <p className="text-sm text-white/50">Human decisions are organization-scoped and recorded in the audit trail.</p>
            </div>
          </div>
          {dashboard.data?.opportunities.length ? (
            <div className="mt-5 grid gap-4">
              {dashboard.data.opportunities.map((opportunity) => (
                <article key={opportunity.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{opportunity.businessName || opportunity.name}</h3>
                      <p className="mt-1 text-xs text-white/45">
                        {[opportunity.city, opportunity.state].filter(Boolean).join(", ")} · {opportunity.source}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide">
                      {opportunity.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-white/65">{opportunity.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {([
                      ["approve", "Approve"],
                      ["reject", "Reject"],
                      ["assign", "Assign to me"],
                      ["research", "Research"],
                      ["create_task", "Create Task"],
                      ["convert_to_ghl", "Convert to GHL"],
                    ] as const).map(([action, label]) => (
                      <button
                        key={action}
                        type="button"
                        disabled={opportunityAction.isPending || (action === "convert_to_ghl" && opportunity.status !== "approved")}
                        onClick={() => opportunityAction.mutate({ opportunityId: opportunity.id, action })}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold transition hover:border-[#C9A227] hover:text-[#C9A227] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No opportunities awaiting review"
              message="Approved connectors remain disabled until an administrator explicitly configures and enables them."
            />
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#C9A227]" />
            <div>
              <h2 className="text-xl font-semibold">Executive Recommendations</h2>
              <p className="text-sm text-white/50">Source, reason, confidence, and supporting data are required.</p>
            </div>
          </div>
          {dashboard.data?.recommendations.length ? (
            <div className="mt-5 grid gap-4">
              {dashboard.data.recommendations.map((recommendation) => (
                <article key={recommendation.opportunityId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9A227]">{recommendation.priority}</p>
                  <h3 className="mt-2 text-lg font-semibold">{recommendation.title}</h3>
                  <p className="mt-2 text-sm text-white/65">{recommendation.recommendation}</p>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                    <div><dt className="text-white/40">Source</dt><dd className="mt-1">{recommendation.source}</dd></div>
                    <div><dt className="text-white/40">Reason</dt><dd className="mt-1">{recommendation.reason}</dd></div>
                    <div><dt className="text-white/40">Confidence</dt><dd className="mt-1">{recommendation.confidence}%</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={dashboard.isError ? "C2B data is unavailable" : "No attributed recommendations yet"}
              message={dashboard.isError
                ? "The acquisition service could not load verified records."
                : "Recommendations will appear only after an approved connector supplies attributed evidence."}
            />
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#141414] p-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[#C9A227]" />
            <div>
              <h2 className="text-xl font-semibold">Approved Connector Framework</h2>
              <p className="text-sm text-white/50">All connectors default to disabled until reviewed.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(dashboard.data?.connectors ?? []).map((connector) => (
              <article key={connector.key} className="rounded-xl border border-white/10 p-4">
                <p className="font-semibold">{connector.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">{connector.type}</p>
                <p className="mt-3 text-xs text-white/55">
                  {connector.enabled ? "Enabled" : "Disabled"} · {connector.approvalStatus}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}

function Breakdown({ title, icon: Icon, items }: {
  title: string;
  icon: typeof MapPinned;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#141414] p-6">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#C9A227]" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {items.length ? (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <span>{item.label}</span><strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No verified opportunities" message="Attributed opportunity records will populate this view." compact />}
    </section>
  );
}

function EmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-5 py-8" : "mt-5 py-12"} rounded-2xl border border-dashed border-white/15 text-center`}>
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/50">{message}</p>
    </div>
  );
}
