import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Lock, PlugZap, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import { GoHighLevelSecureConnectButton } from "@/components/GoHighLevelSecureConnectButton";
import Navigation from "@/components/Navigation";
import {
  buildGhlMarketplaceInstallUrl,
  confirmInstallation,
  hasInstallationConfirmation,
} from "@/lib/gohighlevel-marketplace";
import {
  loadManagedLocations,
  selectManagedLocation,
  SELECTED_LOCATION_STORAGE_KEY,
  type ManagedLocation,
} from "@/lib/location-management";

export default function GoHighLevelIntegration() {
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      <main className="pt-28">
        <section className="relative overflow-hidden pb-12">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute right-0 top-12 h-[420px] w-[420px] rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #C9A227 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="section-label mb-4">GoHighLevel Integration</div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#FFFFFF] sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Secure GoHighLevel connection
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#FFFFFF]/65">
              Connect PRN Staffers South Carolina through the EEOS OAuth layer. The browser never receives tokens, authorization codes, client secrets, or OAuth state.
            </p>
          </div>
        </section>

        <section className="bg-[#141414] py-10">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
            <div className="space-y-4 rounded-2xl border border-[rgba(201,162,39,0.16)] bg-[rgba(255,255,255,0.04)] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#C9A227]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Secure connection manager
                </h2>
              </div>
              <p className="text-sm leading-6 text-[#FFFFFF]/60">
                GoHighLevel locations are loaded from your authenticated EEOS organization. The browser never owns customer location IDs or stored token values.
              </p>
              <Link
                href="/connect-ghl"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C9A227] px-5 text-sm font-semibold text-[#0B0B0B] shadow-[0_0_20px_rgba(201,162,39,0.25)] transition hover:bg-[#D8B84A]"
              >
                Manage GoHighLevel Connections
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
              <SafeOAuthPreflight />
            </div>

            <aside className="space-y-4">
              <InfoCard
                icon={ShieldCheck}
                title="POST-only start"
                description="EEOS starts authorization with an authenticated POST request and CSRF header, not a public GET link."
              />
              <InfoCard
                icon={Lock}
                title="Server-verified organization"
                description="User and organization details are loaded from the server session before the connect button is enabled."
              />
              <InfoCard
                icon={PlugZap}
                title="Read-first integration"
                description="This screen prepares the OAuth handshake without enabling production writes or modifying GoHighLevel records."
              />
            </aside>
          </div>
        </section>

        <section className="bg-[#0B0B0B] py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <ExternalLink className="mt-1 h-5 w-5 text-[#C9A227]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    What happens next
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#FFFFFF]/60">
                    After George clicks Connect GoHighLevel, EEOS opens the official GoHighLevel authorization page. George must manually select only the existing PRN Staffers South Carolina location.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export function resolveSelectedOwnerLocation(
  locations: ManagedLocation[],
  storedSelection: string | null,
) {
  return selectManagedLocation(locations, storedSelection);
}

type OwnerSessionContext = {
  organizationId: string;
  organization: string;
  role: string;
  location: string;
  locationId: string;
  csrfToken: string;
};

export type SafeGhlConnectionStatus = {
  connected: boolean;
  provider: "gohighlevel";
  organizationId: string;
  maskedLocationId: string;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  refreshAvailable: boolean;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
};

export type SafeGhlOperationsSnapshot = {
  organizationId: string;
  organizationName: string;
  location: { name: string; maskedProviderLocationId: string };
  provider: "gohighlevel";
  connection: { connected: true; healthy: true };
  contacts: { total: number; createdLast7Days: number; createdLast30Days: number };
  opportunities: {
    openTotal: number;
    createdLast7Days: number;
    createdLast30Days: number;
    byStage: Array<{
      pipelineIdentifier: string;
      pipelineName: string;
      stageIdentifier: string;
      stageName: string;
      count: number;
    }>;
  };
  generatedAt: string;
  partial: boolean;
};

export function getGhlConnectionPresentation(
  status: SafeGhlConnectionStatus | null,
  locationName: string,
) {
  return status?.connected
    ? { label: `${locationName} Connected`, showConnect: false }
    : { label: `Connect ${locationName} to EEOS`, showConnect: status !== null };
}

export async function loadGhlConnectionStatus(context: Pick<OwnerSessionContext, "organizationId" | "locationId">) {
  const query = new URLSearchParams({
    tenantId: context.organizationId,
    locationId: context.locationId,
  });
  const response = await fetch(`/api/ghl/status?${query}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json() as SafeGhlConnectionStatus & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "GoHighLevel connection status could not be loaded.");
  return payload;
}

export async function verifyGhlLocation(context: Pick<OwnerSessionContext, "organizationId" | "locationId">) {
  const query = new URLSearchParams({
    tenantId: context.organizationId,
    locationId: context.locationId,
  });
  const response = await fetch(`/api/ghl/verify-location?${query}`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json() as {
    success?: boolean;
    message?: string;
    provider?: string;
    organizationId?: string;
    maskedLocationId?: string;
    locationName?: string;
    accountContext?: string;
    verifiedAt?: string;
  };
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "The GoHighLevel location identity check failed.");
  }
  return payload;
}

export async function loadGhlOperationsSnapshot(context: OwnerSessionContext) {
  const query = new URLSearchParams({
    organizationId: context.organizationId,
    locationId: context.locationId,
  });
  const response = await fetch(`/api/ghl/operations-snapshot?${query}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "x-eeos-csrf-token": context.csrfToken,
    },
  });
  const payload = await response.json() as SafeGhlOperationsSnapshot & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    const message = payload.error === "reauthorization_required"
      ? "Reauthorization required before a new snapshot can run."
      : response.status === 403
        ? "Permission denied for this organization or location."
        : "Provider unavailable. No snapshot values were changed.";
    throw new Error(payload.message || message);
  }
  return payload;
}

function OperationsSnapshotPanel({ context }: { context: OwnerSessionContext }) {
  const [snapshot, setSnapshot] = useState<SafeGhlOperationsSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  async function refresh() {
    setRunning(true);
    setSnapshotError(null);
    try {
      setSnapshot(await loadGhlOperationsSnapshot(context));
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : "Provider unavailable.");
    } finally {
      setRunning(false);
    }
  }

  const metrics = snapshot ? [
    ["Total contacts", snapshot.contacts.total],
    ["Contacts · 7 days", snapshot.contacts.createdLast7Days],
    ["Contacts · 30 days", snapshot.contacts.createdLast30Days],
    ["Open opportunities", snapshot.opportunities.openTotal],
    ["Opportunities · 7 days", snapshot.opportunities.createdLast7Days],
    ["Opportunities · 30 days", snapshot.opportunities.createdLast30Days],
  ] as const : [];

  return (
    <div className="mt-4 rounded-xl border border-[rgba(201,162,39,0.22)] bg-[#0B0B0B]/55 p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">South Carolina operations</p>
          <p className="mt-1 text-xs text-white/55">
            On-demand aggregate counts only. No contact records are displayed or stored.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={running}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(201,162,39,0.35)] px-4 text-sm font-semibold text-[#C9A227] disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          {running ? "Loading snapshot…" : "Refresh snapshot"}
        </button>
      </div>
      {snapshot ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">Connected</span>
            <span className={`rounded-full px-3 py-1 ${snapshot.partial ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>
              {snapshot.partial ? "Partial result" : "Snapshot available"}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white/5 p-3">
                <p className="text-[11px] text-white/50">{label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Open opportunities by pipeline stage</p>
            {snapshot.opportunities.byStage.length ? (
              <ul className="mt-2 space-y-1 text-xs text-white/65">
                {snapshot.opportunities.byStage.map((stage) => (
                  <li key={`${stage.pipelineIdentifier}:${stage.stageIdentifier}`} className="flex justify-between gap-3">
                    <span>{stage.pipelineName} · {stage.stageName}</span>
                    <span className="font-semibold text-white">{stage.count}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-xs text-white/50">No open opportunities were returned.</p>}
          </div>
          <p className="text-[11px] text-white/45">
            Generated {new Date(snapshot.generatedAt).toLocaleString()} · {snapshot.location.name} · {snapshot.location.maskedProviderLocationId}
          </p>
        </div>
      ) : !running ? (
        <p className="mt-4 text-xs text-white/50">Connected. Request a snapshot when you are ready.</p>
      ) : null}
      {snapshotError ? <p className="mt-4 text-xs text-red-300">{snapshotError}</p> : null}
    </div>
  );
}

function SafeOAuthPreflight() {
  const [sessionContext, setSessionContext] = useState<OwnerSessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [preflightResult, setPreflightResult] = useState<{
    provider: string;
    destination: string;
    stateStatus: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installationConfirmed, setInstallationConfirmed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<SafeGhlConnectionStatus | null>(null);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [locationVerification, setLocationVerification] = useState<{
    locationName: string;
    maskedLocationId: string;
    verifiedAt: string;
  } | null>(null);
  const connectionPresentation = getGhlConnectionPresentation(
    connectionStatus,
    sessionContext?.location ?? "authorized location",
  );

  useEffect(() => {
    let active = true;

    async function loadOwnerContext() {
      const sessionResponse = await fetch("/api/integrations/gohighlevel/session-context", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const session = await sessionResponse.json() as {
        message?: string;
        user?: { role?: string };
        organization?: { id?: string; name?: string };
        location?: { id?: string; name?: string };
        csrfToken?: string;
      };
      if (!sessionResponse.ok || !session.organization?.id || !session.location?.id || !session.csrfToken) {
        throw new Error(session.message ?? "The active organization-owner context could not be verified.");
      }

      if (!active) return;
      const managedLocations = await loadManagedLocations();
      const selectedLocation = resolveSelectedOwnerLocation(
        managedLocations,
        window.localStorage.getItem(SELECTED_LOCATION_STORAGE_KEY),
      );
      const context = {
        organizationId: selectedLocation?.organization.id ?? session.organization.id,
        organization: selectedLocation?.organization.name ?? session.organization.name ?? "Organization verified",
        role: session.user?.role ?? "ORGANIZATION_OWNER",
        location: selectedLocation?.location.name ?? session.location.name ?? "Authorized location verified",
        locationId: selectedLocation?.location.id ?? session.location.id,
        csrfToken: session.csrfToken,
      };
      setSessionContext(context);
      setConnectionStatus(await loadGhlConnectionStatus(context));
      setInstallationConfirmed(
        hasInstallationConfirmation(window.localStorage, context.organizationId, context.locationId),
      );
    }

    void loadOwnerContext()
      .catch((contextError) => {
        if (active) {
          setError(contextError instanceof Error ? contextError.message : "The secure connection manager could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function verifyPreflight() {
    if (!sessionContext) return;
    setRunning(true);
    setPreflightResult(null);
    setError(null);

    try {
      const csrfToken = sessionContext.csrfToken;
      if (!csrfToken) throw new Error("The protected preflight CSRF token is unavailable.");

      const query = new URLSearchParams({
        organizationId: sessionContext.organizationId,
        locationId: sessionContext.locationId,
      });
      const response = await fetch(`/api/integrations/gohighlevel/oauth/start?${query}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "x-eeos-csrf-token": csrfToken,
          "x-eeos-oauth-preflight": "verify",
        },
      });
      const payload = await response.json() as {
        message?: string;
        provider?: string;
        authorizationUrl?: string;
        state?: { status?: string; expiresAt?: string };
      };
      if (!response.ok || !payload.authorizationUrl || payload.state?.status !== "invalidated") {
        throw new Error(payload.message ?? "OAuth preflight verification failed.");
      }

      setPreflightResult({
        provider: payload.provider ?? "gohighlevel",
        destination: new URL(payload.authorizationUrl).origin,
        stateStatus: payload.state.status,
        expiresAt: payload.state.expiresAt ?? "Not reported",
      });
    } catch (preflightError) {
      setError(preflightError instanceof Error ? preflightError.message : "OAuth preflight verification failed.");
    } finally {
      setRunning(false);
    }
  }

  async function verifyConnectedLocation() {
    if (!sessionContext || !connectionStatus?.connected) return;
    setVerifyingLocation(true);
    setLocationVerification(null);
    setError(null);
    try {
      const result = await verifyGhlLocation(sessionContext);
      setLocationVerification({
        locationName: result.locationName ?? sessionContext.location,
        maskedLocationId: result.maskedLocationId ?? connectionStatus.maskedLocationId,
        verifiedAt: result.verifiedAt ?? new Date().toISOString(),
      });
    } catch (verificationError) {
      setError(verificationError instanceof Error
        ? verificationError.message
        : "The GoHighLevel location identity check failed.");
    } finally {
      setVerifyingLocation(false);
    }
  }

  return (
    <div className="rounded-xl border border-[rgba(201,162,39,0.16)] bg-[#0B0B0B]/40 p-4">
      <p className="text-sm font-semibold text-white">Safe production preflight</p>
      <p className="mt-1 text-xs leading-5 text-white/55">
        Installation and connection are separate. The install action never creates EEOS OAuth state or marks the location connected.
      </p>
      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading secure organization context…
        </p>
      ) : null}
      {sessionContext ? (
        <>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[rgba(201,162,39,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">Stage 1</p>
              <h3 className="mt-1 text-base font-semibold text-white">Install EEOS in HighLevel</h3>
              <p className="mt-2 text-xs leading-5 text-white/55">
                This opens the authoritative private Marketplace listing. Installation alone does not connect data to EEOS, create EEOS OAuth state, exchange a code, or store tokens.
              </p>
              <a
                href={buildGhlMarketplaceInstallUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(201,162,39,0.35)] px-4 text-sm font-semibold text-[#C9A227]"
              >
                Install EEOS in HighLevel
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              {!installationConfirmed ? (
                <button
                  type="button"
                  onClick={() => {
                    confirmInstallation(window.localStorage, sessionContext.organizationId, sessionContext.locationId);
                    setInstallationConfirmed(true);
                  }}
                  className="ml-0 mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white sm:ml-3"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  I installed EEOS in {sessionContext.location}
                </button>
              ) : (
                <p className="mt-3 text-xs font-semibold text-emerald-300">
                  Marketplace installation owner-confirmed for {sessionContext.location}. This is not an OAuth connection status.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[rgba(201,162,39,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">Stage 2</p>
              <h3 className="mt-1 text-base font-semibold text-white">Connect {sessionContext.location} to EEOS</h3>
              <p className="mt-2 text-xs leading-5 text-white/55">
                EEOS creates persisted, single-use OAuth state only when the protected Connect action starts. The callback remains bound to this organization and location.
              </p>
              {connectionStatus === null ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading authoritative connection status…
                </p>
              ) : connectionStatus.connected ? (
                <div className="mt-3 space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {connectionPresentation.label}
                  </p>
                  <p>Location binding: {connectionStatus.maskedLocationId}</p>
                  <button
                    type="button"
                    onClick={verifyConnectedLocation}
                    disabled={verifyingLocation}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/30 px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    {verifyingLocation
                      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    {verifyingLocation ? "Verifying location…" : `Verify ${sessionContext.location} location`}
                  </button>
                  {locationVerification ? (
                    <div className="space-y-1">
                      <p>Verified location: {locationVerification.locationName}</p>
                      <p>Verified binding: {locationVerification.maskedLocationId}</p>
                      <p>Read-only verification completed: {locationVerification.verifiedAt}</p>
                    </div>
                  ) : null}
                  <OperationsSnapshotPanel context={sessionContext} />
                </div>
              ) : installationConfirmed && connectionPresentation.showConnect ? (
                <div className="mt-3">
                  <GoHighLevelSecureConnectButton locationId={sessionContext.locationId} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-300">
                  Confirm the South Carolina Marketplace installation before connecting.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[rgba(201,162,39,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">Safe verification</p>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Verify owner authorization and create an immediately invalidated OAuth state without opening GoHighLevel.
              </p>
              <button
                type="button"
                onClick={verifyPreflight}
                disabled={running}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(201,162,39,0.35)] px-4 text-sm font-semibold text-[#C9A227] disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {running ? "Verifying…" : "Verify OAuth Preflight"}
              </button>
              {preflightResult ? (
                <div className="mt-3 space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Preflight verified — HTTP 200</p>
                  <p>Organization: {sessionContext.organization}</p>
                  <p>Effective role: {sessionContext.role}</p>
                  <p>Location: {sessionContext.location}</p>
                  <p>Provider: {preflightResult.provider}</p>
                  <p>Authorization destination: {preflightResult.destination}</p>
                  <p>OAuth state: created and {preflightResult.stateStatus}</p>
                  <p>Original expiry: {preflightResult.expiresAt}</p>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#C9A227]" aria-hidden="true" />
        <h2 className="text-base font-semibold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#FFFFFF]/55">{description}</p>
    </div>
  );
}
