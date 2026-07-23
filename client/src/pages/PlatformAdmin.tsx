import { Building2, ShieldCheck, Activity, LifeBuoy, Brain, ClipboardList } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";

const ADMIN_MODULES = [
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Customer Onboarding", href: "/admin/onboarding", icon: ClipboardList },
  { label: "Global Integrations", href: "/admin/integrations", icon: Activity },
  { label: "Platform Health", href: "/admin/platform-health", icon: ShieldCheck },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "AI Operations", href: "/admin/ai-operations", icon: Brain },
];

const ADMIN_SCREENS = {
  "/admin": {
    eyebrow: "Eagle Eye Internal Platform",
    title: "Platform Administrator Console",
    description: "Operate EEOS customers, onboarding, integrations, support, and Intelligence Engine health from a separated internal surface.",
    sectionTitle: "Platform Overview",
    status: "ADMIN",
    body: "Review the major administrator workspaces and move into the area that needs attention.",
  },
  "/admin/organizations": {
    eyebrow: "Customer Management",
    title: "Organizations",
    description: "View customer organizations connected to EEOS and confirm production account separation.",
    sectionTitle: "Customer Organizations",
    status: "LIVE",
    body: "Organization records are loaded from the protected platform administration API.",
  },
  "/admin/onboarding": {
    eyebrow: "Customer Activation",
    title: "Customer Onboarding",
    description: "Track onboarding readiness, connection setup, and owner handoff activity.",
    sectionTitle: "Onboarding Queue",
    status: "READY",
    body: "Onboarding workspaces are ready for verified customer setup activity.",
  },
  "/admin/integrations": {
    eyebrow: "Global Connections",
    title: "Global Integrations",
    description: "Monitor provider readiness and integration policy for customer environments.",
    sectionTitle: "Integration Controls",
    status: "SECURE",
    body: "Integration controls remain protected and token values are never displayed.",
  },
  "/admin/platform-health": {
    eyebrow: "Reliability",
    title: "Platform Health",
    description: "Review production service health, deployment readiness, and protected API behavior.",
    sectionTitle: "Health Signals",
    status: "MONITORED",
    body: "Platform health views are reserved for verified operational signals.",
  },
  "/admin/audit": {
    eyebrow: "Governance",
    title: "Audit Activity",
    description: "Review security-sensitive administrator, authentication, and support events.",
    sectionTitle: "Audit Stream",
    status: "AUDITED",
    body: "Audit events will populate from protected production activity.",
  },
  "/admin/support": {
    eyebrow: "Customer Support",
    title: "Support",
    description: "Enter explicit support workflows for customer assistance without bypassing tenant isolation.",
    sectionTitle: "Support Workspace",
    status: "CONTROLLED",
    body: "Support access remains explicit, role-restricted, and auditable.",
  },
  "/admin/ai-operations": {
    eyebrow: "Intelligence Operations",
    title: "AI Operations",
    description: "Monitor the future AI operating layer, knowledge health, and decision-support readiness.",
    sectionTitle: "AI Operations",
    status: "READY",
    body: "AI operations will populate from verified Intelligence Engine activity.",
  },
} as const;

type AdminRoute = keyof typeof ADMIN_SCREENS;

function getAdminScreen(path: string) {
  return ADMIN_SCREENS[(path in ADMIN_SCREENS ? path : "/admin") as AdminRoute];
}

export default function PlatformAdmin() {
  const [location] = useLocation();
  const screen = getAdminScreen(location);
  const { data: organizations = [], isLoading } = trpc.admin.organizations.useQuery(undefined, {
    retry: false,
  });
  const isOrganizationsRoute = location === "/admin/organizations" || location === "/admin";

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[rgba(201,162,39,0.16)] bg-[#141414] p-6 sm:p-8">
          <div className="section-label mb-3">{screen.eyebrow}</div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {screen.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#FFFFFF]/55">
            {screen.description}
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={`glass-card rounded-2xl p-5 border transition ${
                location === module.href
                  ? "border-[rgba(201,162,39,0.42)] bg-[rgba(201,162,39,0.08)]"
                  : "border-[rgba(201,162,39,0.12)] hover:border-[rgba(201,162,39,0.28)]"
              }`}
            >
              <module.icon className="w-5 h-5 text-[#C9A227] mb-4" />
              <div className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{module.label}</div>
              <div className="mt-1 text-xs text-[#FFFFFF]/40">Internal administrator access only</div>
            </Link>
          ))}
        </section>

        <section className="mt-6 glass-card rounded-2xl p-6 border border-[rgba(201,162,39,0.12)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{screen.sectionTitle}</h2>
            <span className="text-xs text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {isOrganizationsRoute ? (isLoading ? "LOADING" : `${organizations.length} ACTIVE`) : screen.status}
            </span>
          </div>
          {isOrganizationsRoute ? (
            <div className="space-y-2">
              {organizations.length > 0 ? organizations.map((organization) => (
                <div key={organization.id} className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">{organization.name}</div>
                    <div className="text-[10px] text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{organization.slug}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#C9A227]">{organization.type}</span>
                </div>
              )) : (
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-5 text-sm text-[#FFFFFF]/55">
                  {isLoading ? "Loading organizations..." : "No customer organizations are available yet."}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-5 text-sm leading-6 text-[#FFFFFF]/55">
              {screen.body}
            </div>
          )}
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
