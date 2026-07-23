import { Building2, ShieldCheck, Activity, LifeBuoy, Brain, ClipboardList } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

const ADMIN_MODULES = [
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Customer Onboarding", href: "/admin/onboarding", icon: ClipboardList },
  { label: "Global Integrations", href: "/admin/integrations", icon: Activity },
  { label: "Platform Health", href: "/admin/platform-health", icon: ShieldCheck },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "AI Operations", href: "/admin/ai-operations", icon: Brain },
];

export default function PlatformAdmin() {
  const { data: organizations = [], isLoading } = trpc.admin.organizations.useQuery(undefined, {
    retry: false,
  });

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[rgba(201,162,39,0.16)] bg-[#141414] p-6 sm:p-8">
          <div className="section-label mb-3">Eagle Eye Internal Platform</div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Platform Administrator Console
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#FFFFFF]/55">
            Operate EEOS customers, onboarding, integrations, support, and Intelligence Engine health from a separated internal surface.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_MODULES.map((module) => (
            <a
              key={module.href}
              href={module.href}
              className="glass-card rounded-2xl p-5 border border-[rgba(201,162,39,0.12)] hover:border-[rgba(201,162,39,0.28)] transition"
            >
              <module.icon className="w-5 h-5 text-[#C9A227] mb-4" />
              <div className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{module.label}</div>
              <div className="mt-1 text-xs text-[#FFFFFF]/40">Internal administrator access only</div>
            </a>
          ))}
        </section>

        <section className="mt-6 glass-card rounded-2xl p-6 border border-[rgba(201,162,39,0.12)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Customer Organizations</h2>
            <span className="text-xs text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {isLoading ? "LOADING" : `${organizations.length} ACTIVE`}
            </span>
          </div>
          <div className="space-y-2">
            {organizations.map((organization) => (
              <div key={organization.id} className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">{organization.name}</div>
                  <div className="text-[10px] text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{organization.slug}</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#C9A227]">{organization.type}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
