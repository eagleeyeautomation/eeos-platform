import { Activity, Brain, Building2, ClipboardList, FileClock, LifeBuoy, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AuthenticatedPageBranding from "@/components/AuthenticatedPageBranding";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";

const ADMIN_MODULES = [
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Customer Onboarding", href: "/admin/onboarding", icon: ClipboardList },
  { label: "Global Integrations", href: "/admin/integrations", icon: Activity },
  { label: "Platform Health", href: "/admin/platform-health", icon: ShieldCheck },
  { label: "Audit Activity", href: "/admin/audit", icon: FileClock },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "AI Operations", href: "/admin/ai-operations", icon: Brain },
];

const ADMIN_SCREENS = {
  "/admin": {
    eyebrow: "Eagle Eye Internal Platform",
    title: "Platform Administrator Console",
    description: "Operate EEOS customers, onboarding, integrations, support, and Intelligence Engine health from a separated internal surface.",
    sectionTitle: "Platform Overview",
  },
  "/admin/organizations": {
    eyebrow: "Customer Management",
    title: "Organizations",
    description: "View customer organizations connected to EEOS and confirm production account separation.",
    sectionTitle: "Customer Organizations",
  },
  "/admin/onboarding": {
    eyebrow: "Customer Activation",
    title: "Customer Onboarding",
    description: "Track onboarding readiness, connection setup, and owner handoff activity.",
    sectionTitle: "Onboarding Queue",
  },
  "/admin/integrations": {
    eyebrow: "Global Connections",
    title: "Global Integrations",
    description: "Monitor provider readiness and integration policy for customer environments.",
    sectionTitle: "Integration Controls",
  },
  "/admin/platform-health": {
    eyebrow: "Reliability",
    title: "Platform Health",
    description: "Review production service health, deployment readiness, and protected API behavior.",
    sectionTitle: "Health Signals",
  },
  "/admin/audit": {
    eyebrow: "Governance",
    title: "Audit Activity",
    description: "Review security-sensitive administrator, authentication, and support events.",
    sectionTitle: "Audit Stream",
  },
  "/admin/support": {
    eyebrow: "Customer Support",
    title: "Support",
    description: "Enter explicit support workflows for customer assistance without bypassing tenant isolation.",
    sectionTitle: "Support Workspace",
  },
  "/admin/ai-operations": {
    eyebrow: "Intelligence Operations",
    title: "AI Operations",
    description: "Monitor the AI operating layer, knowledge health, and decision-support readiness.",
    sectionTitle: "AI Operations",
  },
} as const;

type AdminRoute = keyof typeof ADMIN_SCREENS;

function getAdminScreen(path: string) {
  return ADMIN_SCREENS[(path in ADMIN_SCREENS ? path : "/admin") as AdminRoute];
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function truncateId(value: string | null | undefined) {
  if (!value) return "Not recorded";
  if (value.length <= 14) return value;
  return `${value.slice(0, 7)}...${value.slice(-5)}`;
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#FFFFFF]/38">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-[#FFFFFF]/45">{detail}</div> : null}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-5 text-sm text-[#FFFFFF]/55">
      {children}
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: "good" | "warning" | "neutral" }) {
  const className = tone === "good"
    ? "border-[rgba(73,222,128,0.25)] text-green-300"
    : tone === "warning"
      ? "border-[rgba(201,162,39,0.35)] text-[#C9A227]"
      : "border-[rgba(255,255,255,0.12)] text-[#FFFFFF]/55";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

function AdminOverview() {
  const { data, isLoading, error } = trpc.admin.overview.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Platform overview could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading platform overview...</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={data.counts.activeOrganizations} detail={`${data.counts.organizations} total record(s)`} />
        <StatCard label="GHL Locations" value={data.counts.connectedLocations} detail={`${data.counts.activeSubaccounts} active subaccount(s)`} />
        <StatCard label="Users" value={data.counts.activeUsers} detail={`${data.counts.activeSessions} active session(s)`} />
        <StatCard label="Audit Events" value={data.counts.auditEvents} detail={`Latest: ${formatDate(data.latest.auditEventAt)}`} />
      </div>
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
        <div className="text-sm font-semibold">Production Data Status</div>
        <div className="mt-2 grid gap-2 text-xs text-[#FFFFFF]/50 sm:grid-cols-2">
          <div>Database: {data.database.connected ? "Connected" : "Unavailable"}</div>
          <div>Last GHL connection: {formatDate(data.latest.ghlConnectedAt)}</div>
          <div>Latest signal: {formatDate(data.latest.signalAt)}</div>
          <div>Latest Intelligence Engine metric: {formatDate(data.latest.ieMetricAt)}</div>
        </div>
      </div>
    </div>
  );
}

function OrganizationsAdmin() {
  const { data = [], isLoading, error } = trpc.admin.organizations.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Organizations could not be loaded for this administrator session.</EmptyState>;
  if (isLoading) return <EmptyState>Loading organizations...</EmptyState>;
  if (data.length === 0) return <EmptyState>No customer organizations are available yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {data.map((organization) => (
        <div key={organization.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{organization.name}</div>
              <div className="text-[10px] text-[#FFFFFF]/35" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {organization.slug}
              </div>
            </div>
            <StatusPill tone={organization.isActive ? "good" : "neutral"}>{organization.isActive ? "Active" : "Inactive"}</StatusPill>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[#FFFFFF]/48 sm:grid-cols-4">
            <div>Type: {organization.type}</div>
            <div>Memberships: {organization.memberships.length}</div>
            <div>Subaccounts: {organization.subaccountCount}</div>
            <div>GHL connected: {organization.connectedLocationCount}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OnboardingAdmin() {
  const { data = [], isLoading, error } = trpc.admin.onboarding.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Onboarding status could not be loaded for this administrator session.</EmptyState>;
  if (isLoading) return <EmptyState>Loading onboarding records...</EmptyState>;
  if (data.length === 0) return <EmptyState>No customer onboarding records are available yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.organizationId} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{item.organizationName}</div>
              <div className="text-xs text-[#FFFFFF]/42">Plan: {item.plan ?? "Not assigned"} · Membership: {item.membershipStatus ?? "Not assigned"}</div>
            </div>
            <StatusPill tone={item.connectedLocations > 0 ? "good" : "warning"}>{item.status}</StatusPill>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[#FFFFFF]/48 sm:grid-cols-3">
            <div>Subaccounts: {item.subaccounts}</div>
            <div>Connected locations: {item.connectedLocations}</div>
            <div>Pending invitations: {item.pendingInvitations}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrationsAdmin() {
  const { data, isLoading, error } = trpc.admin.integrations.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Integration status could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading integration records...</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.providers.map((provider) => (
          <StatCard
            key={provider.provider}
            label={provider.provider}
            value={`${provider.activeConnections}/${provider.totalConnections}`}
            detail={`Latest connection: ${formatDate(provider.latestConnectedAt)}`}
          />
        ))}
      </div>
      {data.connections.length === 0 ? (
        <EmptyState>No GoHighLevel connections have been persisted yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.connections.map((connection) => (
            <div key={connection.tenantId} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{connection.subaccountName}</div>
                  <div className="text-xs text-[#FFFFFF]/42">{connection.organizationName ?? "Organization not linked"}</div>
                </div>
                <StatusPill tone={connection.connected ? "good" : "neutral"}>{connection.connected ? "Connected" : "Inactive"}</StatusPill>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[#FFFFFF]/48 sm:grid-cols-4">
                <div>Location: {truncateId(connection.locationId ?? connection.tenantId)}</div>
                <div>Token type: {connection.tokenType}</div>
                <div>Connected: {formatDate(connection.connectedAt)}</div>
                <div>Webhook: {connection.webhookRegistered ? "Registered" : "Not registered"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformHealthAdmin() {
  const { data, isLoading, error } = trpc.admin.platformHealth.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Platform health could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading platform health...</EmptyState>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Database" value={data.database.connected ? "Connected" : "Unavailable"} detail={`Checked: ${formatDate(data.checkedAt)}`} />
        <StatCard label="Latest Activity" value={formatDate(data.latestActivityAt)} />
      </div>
      <div className="space-y-2">
        {data.services.map((service) => (
          <div key={service.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div>
              <div className="text-sm font-semibold">{service.name}</div>
              <div className="text-xs text-[#FFFFFF]/42">{service.detail}</div>
            </div>
            <StatusPill tone={service.status === "online" ? "good" : "warning"}>{service.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditAdmin() {
  const { data, isLoading, error } = trpc.admin.auditActivity.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Audit activity could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading audit activity...</EmptyState>;
  if (data.events.length === 0) return <EmptyState>No audit events have been recorded yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {data.events.map((event) => (
        <div key={event.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">{event.action}</div>
            <div className="text-xs text-[#FFFFFF]/42">{formatDate(event.createdAt)}</div>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-[#FFFFFF]/48 sm:grid-cols-3">
            <div>Actor: {event.actorUserId ?? "System"}</div>
            <div>Target: {event.targetType ?? "Not recorded"}</div>
            <div>Organization: {event.organizationId ?? "Not recorded"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupportAdmin() {
  const { data, isLoading, error } = trpc.admin.support.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>Support data could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading support workspace...</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending Invitations" value={data.pendingInvitations.length} />
        <StatCard label="Password Resets" value={data.recentPasswordResets.length} />
        <StatCard label="Active Session Users" value={data.activeSessionCount} />
      </div>
      {data.supportRequests.length === 0 ? (
        <EmptyState>{data.emptyState}</EmptyState>
      ) : null}
      {data.pendingInvitations.length > 0 ? (
        <div className="space-y-2">
          {data.pendingInvitations.map((invite) => (
            <div key={invite.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm">
              <div className="font-semibold">{invite.email}</div>
              <div className="mt-1 text-xs text-[#FFFFFF]/45">Role: {invite.role} · Expires: {formatDate(invite.expiresAt)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AiOperationsAdmin() {
  const { data, isLoading, error } = trpc.admin.aiOperations.useQuery(undefined, { retry: false });

  if (error) return <EmptyState>AI Operations data could not be loaded for this administrator session.</EmptyState>;
  if (isLoading || !data) return <EmptyState>Loading AI Operations...</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Signals" value={data.counts.signals} detail={`Latest: ${formatDate(data.latestSignalAt)}`} />
        <StatCard label="Memory Records" value={data.counts.businessMemoryRecords} />
        <StatCard label="Knowledge Nodes" value={data.counts.knowledgeNodes} detail={`${data.counts.knowledgeEdges} edge(s)`} />
        <StatCard label="IE Metrics" value={data.counts.ieMetrics} detail={`Latest: ${formatDate(data.latestMetricAt)}`} />
      </div>
      {data.recentRecommendations.length === 0 ? (
        <EmptyState>No Intelligence Engine recommendations have been generated yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.recentRecommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold">{recommendation.title}</div>
                <StatusPill tone={recommendation.priority === "critical" || recommendation.priority === "high" ? "warning" : "neutral"}>
                  {recommendation.priority}
                </StatusPill>
              </div>
              <div className="mt-2 text-xs text-[#FFFFFF]/45">
                {recommendation.category} · {recommendation.status} · Confidence {recommendation.confidenceScore}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminRouteContent({ location }: { location: string }) {
  switch (location) {
    case "/admin/organizations":
      return <OrganizationsAdmin />;
    case "/admin/onboarding":
      return <OnboardingAdmin />;
    case "/admin/integrations":
      return <IntegrationsAdmin />;
    case "/admin/platform-health":
      return <PlatformHealthAdmin />;
    case "/admin/audit":
      return <AuditAdmin />;
    case "/admin/support":
      return <SupportAdmin />;
    case "/admin/ai-operations":
      return <AiOperationsAdmin />;
    default:
      return <AdminOverview />;
  }
}

export default function PlatformAdmin() {
  const [location] = useLocation();
  const screen = getAdminScreen(location);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[rgba(201,162,39,0.16)] bg-[#141414] p-6 sm:p-8">
          <div>
            <div className="section-label mb-3">{screen.eyebrow}</div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {screen.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#FFFFFF]/55">
              {screen.description}
            </p>
          </div>
        </section>

        <AuthenticatedPageBranding
          src="/eeos-assets/approved/eeos-executive-intelligence.png"
          title={`${screen.title} Operations`}
          subtitle="Protected administration context for organizations, platform health, governance, and support."
          alt={`EEOS branded platform operations artwork for ${screen.title}`}
          className="mt-6"
        />

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{screen.sectionTitle}</h2>
            <span className="text-xs text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              LIVE DATA
            </span>
          </div>
          <AdminRouteContent location={location} />
        </section>
      </main>
      <Footer hideConnectionLinks />
    </div>
  );
}
