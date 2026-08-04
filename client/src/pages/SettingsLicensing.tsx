import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";

export default function SettingsLicensing() {
  const { data, isLoading, error } = trpc.licensing.current.useQuery(undefined, { retry: false });

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-[#141414] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">Licensing & Usage</p>
          <h1 className="mt-3 text-4xl font-bold">Current license</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/55">
            Review your EEOS plan, active add-ons, available add-ons, usage limits, effective dates, and upgrade paths.
          </p>
        </section>

        {isLoading ? <EmptyState>Loading licensing...</EmptyState> : null}
        {error ? <EmptyState>Licensing could not be loaded for this organization.</EmptyState> : null}
        {!isLoading && !error && !data ? <EmptyState>No organization licensing context is available.</EmptyState> : null}

        {data ? (
          <div className="mt-6 space-y-6">
            {data.organization.warningBanner ? (
              <section className="rounded-2xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F6E6A7]">{data.organization.warningBanner.title}</p>
                <p className="mt-2 text-sm text-white/70">{data.organization.warningBanner.body}</p>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              <Metric label="Current plan" value={planName(data.organization.basePlanCode)} detail={`${data.organization.basePlanCode ?? "Not assigned"} · v${data.basePlanVersion}`} />
              <Metric label="License status" value={data.organization.licenseStatus ?? "ACTIVE"} detail="Governed by EEOS licensing" />
              <Metric label="Billing state" value={data.organization.billingExempt ? "Exempt" : "Active"} detail={data.organization.billingExempt ? "Synthetic certification tenant" : "Customer billing policy"} />
              <Metric label="External execution" value={data.organization.externalExecutionStatus} detail="Human-governed actions only" />
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{data.organization.organizationName}</h2>
                  {data.organization.subtitle ? <p className="mt-1 text-sm text-[#C9A227]">{data.organization.subtitle}</p> : null}
                  <p className="mt-2 text-sm text-white/50">
                    Base license: {planName(data.organization.basePlanCode)} · ${data.organization.basePlanMonthlyPrice}/month
                  </p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                  {data.organization.isSynthetic ? "Synthetic" : "Customer"} workspace
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Info label="Usage and limits" value={data.organization.isSynthetic ? "Certification only; no customer data or connectors" : "Usage limits follow current plan and approved add-ons"} />
                <Info label="Effective dates" value={data.organization.addons.length ? "Shown on active add-ons below" : "No active add-ons"} />
                <Info label="Upgrade states" value="Available add-ons can be requested or discussed with sales" />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">Active add-ons</h2>
                <div className="mt-4 space-y-3">
                  {data.organization.addons.length === 0 ? (
                    <div className="rounded-xl border border-white/10 p-4 text-sm text-white/45">No growth add-ons are active.</div>
                  ) : data.organization.addons.map((addon) => (
                    <div key={addon.key} className="rounded-xl border border-[#C9A227]/25 bg-[#C9A227]/10 p-4">
                      <div className="font-semibold text-white">{addon.name}</div>
                      <div className="mt-1 text-xs text-[#F6E6A7]">${addon.monthlyPrice}/month · {addon.source}</div>
                      <div className="mt-2 text-xs text-white/50">Started {formatDate(addon.startsAt)} · Ends {addon.endsAt ? formatDate(addon.endsAt) : "Not scheduled"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">Available add-ons</h2>
                <div className="mt-4 space-y-3">
                  {data.addons.map((addon) => {
                    const active = data.organization.addons.some((item) => item.key === addon.key);
                    return (
                      <div key={addon.key} className="rounded-xl border border-white/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{addon.name}</div>
                            <p className="mt-1 text-sm text-white/52">{addon.description}</p>
                            <p className="mt-2 text-xs text-white/40">${addon.monthlyPrice}/month</p>
                          </div>
                          <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                            {active ? "Active" : "Upgrade required"}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-white/70">Request Add-on</button>
                          <button type="button" className="rounded-lg border border-[#C9A227]/35 bg-[#C9A227]/10 px-3 py-2 text-xs font-semibold text-[#F6E6A7]">Contact Sales</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{detail}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="text-xs font-semibold text-white">{label}</div>
      <div className="mt-2 text-sm text-white/52">{value}</div>
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/55">{children}</div>;
}

function planName(code: string | null | undefined) {
  if (code === "FOUNDATION") return "Starter";
  if (code === "INTELLIGENCE") return "Growth";
  if (code === "ENTERPRISE") return "Scale";
  return "Not assigned";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
