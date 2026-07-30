import { Activity, Brain, Building2, ClipboardList, FileClock, LifeBuoy, Network, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useProductSession } from "@/contexts/ProductSessionContext";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

const ADMIN_MODULES = [
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Customer Onboarding", href: "/admin/onboarding", icon: ClipboardList },
  { label: "Global Integrations", href: "/admin/integrations", icon: Activity },
  { label: "Platform Health", href: "/admin/platform-health", icon: ShieldCheck },
  { label: "Audit Activity", href: "/admin/audit", icon: FileClock },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "AI Operations", href: "/admin/ai-operations", icon: Brain },
  { label: "Global C2C Intelligence", href: "/admin/global-c2c", icon: Network },
  { label: "Global C2B Intelligence", href: "/admin/global-c2b", icon: Network },
  { label: "Global B2B Intelligence", href: "/admin/global-b2b", icon: Network },
  { label: "Platform Analytics", href: "/admin/platform-analytics", icon: Activity },
  { label: "Connector Administration", href: "/admin/connector-administration", icon: Activity },
  { label: "Executive Intelligence", href: "/admin/executive-intelligence", icon: Brain },
  { label: "AI Recommendations", href: "/admin/ai-recommendations", icon: Brain },
  { label: "Marketplace", href: "/admin/marketplace", icon: Building2 },
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
  "/admin/platform-analytics": {
    eyebrow: "Platform Intelligence",
    title: "Platform Analytics",
    description: "Review verified organization growth, adoption, industry, and connector metrics without exposing customer records.",
    sectionTitle: "Platform Analytics",
  },
  "/admin/connector-administration": {
    eyebrow: "Platform Connections",
    title: "Connector Administration",
    description: "Govern connector availability and approval policy across EEOS organizations.",
    sectionTitle: "Connector Administration",
  },
  "/admin/executive-intelligence": {
    eyebrow: "Platform Intelligence",
    title: "Executive Intelligence",
    description: "Review attributed platform-wide trends and leadership decision support.",
    sectionTitle: "Executive Intelligence",
  },
  "/admin/ai-recommendations": {
    eyebrow: "Platform Intelligence",
    title: "AI Recommendations",
    description: "Review explainable platform recommendations backed by source evidence and confidence.",
    sectionTitle: "AI Recommendations",
  },
  "/admin/marketplace": {
    eyebrow: "Platform Ecosystem",
    title: "Marketplace",
    description: "Review approved intelligence and connector capabilities available to EEOS organizations.",
    sectionTitle: "Marketplace",
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
  const session = useProductSession();
  const [, navigate] = useLocation();
  const [enteringOrganizationId, setEnteringOrganizationId] = useState<number | null>(null);
  const [enterError, setEnterError] = useState<string | null>(null);

  async function enterOrganization(organizationId: number) {
    if (!session.csrfToken) {
      setEnterError("Your administrator session could not be verified. Refresh and try again.");
      return;
    }
    setEnteringOrganizationId(organizationId);
    setEnterError(null);
    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/enter`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "x-eeos-csrf-token": session.csrfToken,
        },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to enter this organization.");
      navigate(payload.redirectTo);
    } catch (requestError) {
      setEnterError(requestError instanceof Error ? requestError.message : "Unable to enter this organization.");
    } finally {
      setEnteringOrganizationId(null);
    }
  }

  if (error) return <EmptyState>Organizations could not be loaded for this administrator session.</EmptyState>;
  if (isLoading) return <EmptyState>Loading organizations...</EmptyState>;
  if (data.length === 0) return <EmptyState>No customer organizations are available yet.</EmptyState>;

  return (
    <div className="space-y-2">
      {enterError ? <div className="text-sm text-amber-300">{enterError}</div> : null}
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
          {organization.isActive && session.organization?.id === String(organization.id) && session.organizationRole === "ORGANIZATION_OWNER" ? (
            <button
              type="button"
              disabled={enteringOrganizationId === organization.id}
              onClick={() => void enterOrganization(organization.id)}
              className="mt-3 rounded-lg border border-[rgba(255,255,255,0.14)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
            >
              {enteringOrganizationId === organization.id ? "Opening..." : "Enter organization"}
            </button>
          ) : null}
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
      <FloridaBindingReconciliation />
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

type FloridaBindingInspection = {
  providerLocationId: string;
  legacy: {
    connection: {
      id: number;
      tokenType: string;
      active: boolean;
      expiresAt: string | null;
      lastRefreshedAt: string | null;
      connectedAt: string | null;
      updatedAt: string | null;
    } | null;
    subaccount: { id: number; membershipId: number; name: string } | null;
  };
  runtime: {
    connections: Array<{
      id: string;
      organization_id: string;
      operational_division_id: string;
      location_id: string;
      token_expires_at: string | null;
      connected_at: string;
      updated_at: string;
      disconnected_at: string | null;
    }>;
    auditHistory: Array<{ event_type: string; organization_id: string; created_at: string }>;
    onboardingStates: Array<{ status: string; organization_id: string; created_at: string }>;
    snapshotHistory: Array<{ created_at: string }>;
  };
};

function FloridaBindingReconciliation() {
  const session = useProductSession();
  const [inspection, setInspection] = useState<FloridaBindingInspection | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [repairingScopes, setRepairingScopes] = useState(false);

  async function loadInspection() {
    const response = await fetch("/api/admin/integrations/gohighlevel/florida-binding", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Florida binding inspection is unavailable.");
    setInspection(await response.json());
  }

  useEffect(() => {
    void loadInspection().catch((error) => setStatus(error instanceof Error ? error.message : "Inspection failed."));
  }, []);

  async function reconcile() {
    if (!session.csrfToken) {
      setStatus("Refresh the administrator session before reconciling.");
      return;
    }
    setReconciling(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/integrations/gohighlevel/florida-binding/reconcile", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "x-eeos-csrf-token": session.csrfToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Florida reconciliation stopped safely.");
      setStatus("Florida provider binding reconciled to PRN Staffers.");
      await loadInspection();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Florida reconciliation stopped safely.");
    } finally {
      setReconciling(false);
    }
  }

  async function repairScopes() {
    if (!session.csrfToken) {
      setStatus("Refresh the administrator session before repairing scope metadata.");
      return;
    }
    setRepairingScopes(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/integrations/gohighlevel/florida-binding/repair-scopes", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "x-eeos-csrf-token": session.csrfToken },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Florida scope repair stopped safely.");
      setStatus("Florida Private Integration read scopes recorded without rotating its token.");
      await loadInspection();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Florida scope repair stopped safely.");
    } finally {
      setRepairingScopes(false);
    }
  }

  if (!inspection) return <EmptyState>{status ?? "Inspecting the existing Florida provider binding..."}</EmptyState>;
  const activeRuntime = inspection.runtime.connections.filter((connection) => !connection.disconnected_at);
  const canReconcile = Boolean(
    inspection.legacy.connection?.active
    && !inspection.legacy.subaccount
    && activeRuntime.length <= 1,
  );

  return (
    <div className="rounded-xl border border-[rgba(201,162,39,0.2)] bg-[rgba(201,162,39,0.04)] p-4">
      <div className="text-sm font-semibold">Florida provider-binding reconciliation</div>
      <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2 lg:grid-cols-4">
        <div>Binding: {inspection.providerLocationId.slice(0, 8)}…{inspection.providerLocationId.slice(-5)}</div>
        <div>Legacy connection: {inspection.legacy.connection?.id ?? "Not found"}</div>
        <div>Subaccount: {inspection.legacy.subaccount?.id ?? "Not linked"}</div>
        <div>Runtime bindings: {activeRuntime.length}</div>
        <div>Token status: {inspection.legacy.connection?.active ? "Active" : "Inactive"}</div>
        <div>Last refresh: {formatDate(inspection.legacy.connection?.lastRefreshedAt)}</div>
        <div>Audit events: {inspection.runtime.auditHistory.length}</div>
        <div>Snapshots: {inspection.runtime.snapshotHistory.length}</div>
      </div>
      {status ? <p className="mt-3 text-xs text-amber-200">{status}</p> : null}
      {!inspection.legacy.subaccount ? (
        <button
          type="button"
          disabled={!canReconcile || reconciling}
          onClick={() => void reconcile()}
          className="mt-4 rounded-lg border border-[rgba(201,162,39,0.4)] px-3 py-2 text-xs font-semibold text-[#C9A227] disabled:opacity-40"
        >
          {reconciling ? "Reconciling..." : "Reconcile Florida binding"}
        </button>
      ) : (
        <>
          <p className="mt-3 text-xs text-emerald-200">Florida is linked to subaccount {inspection.legacy.subaccount.id}.</p>
          {activeRuntime.length === 1 && inspection.runtime.snapshotHistory.length === 0 ? (
            <button
              type="button"
              disabled={repairingScopes}
              onClick={() => void repairScopes()}
              className="mt-4 rounded-lg border border-[rgba(201,162,39,0.4)] px-3 py-2 text-xs font-semibold text-[#C9A227] disabled:opacity-40"
            >
              {repairingScopes ? "Updating..." : "Record verified snapshot read scopes"}
            </button>
          ) : null}
        </>
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
