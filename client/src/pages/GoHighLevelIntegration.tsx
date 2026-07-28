import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Lock, PlugZap, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import { GoHighLevelSecureConnectButton } from "@/components/GoHighLevelSecureConnectButton";
import Navigation from "@/components/Navigation";

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

type PreflightStatus = {
  provider: string;
  destination: string;
  stateStatus: string;
  expiresAt: string;
  organization: string;
  role: string;
  location: string;
  locationId: string;
};

function SafeOAuthPreflight() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PreflightStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyPreflight() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const sessionResponse = await fetch("/api/integrations/gohighlevel/session-context", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const session = await sessionResponse.json() as {
        message?: string;
        user?: { role?: string };
        organization?: { id?: string; name?: string };
        location?: { id?: string; name?: string };
      };
      if (!sessionResponse.ok || !session.organization?.id || !session.location?.id) {
        throw new Error(session.message ?? "The active organization-owner context could not be verified.");
      }

      const csrfToken = readCookie("eeos_csrf");
      if (!csrfToken) throw new Error("The protected preflight CSRF token is unavailable.");

      const query = new URLSearchParams({
        organizationId: session.organization.id,
        locationId: session.location.id,
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

      setResult({
        provider: payload.provider ?? "gohighlevel",
        destination: new URL(payload.authorizationUrl).origin,
        stateStatus: payload.state.status,
        expiresAt: payload.state.expiresAt ?? "Not reported",
        organization: session.organization.name ?? "Organization verified",
        role: session.user?.role ?? "ORGANIZATION_OWNER",
        location: session.location.name ?? "Authorized location verified",
        locationId: session.location.id,
      });
    } catch (preflightError) {
      setError(preflightError instanceof Error ? preflightError.message : "OAuth preflight verification failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-[rgba(201,162,39,0.16)] bg-[#0B0B0B]/40 p-4">
      <p className="text-sm font-semibold text-white">Safe production preflight</p>
      <p className="mt-1 text-xs leading-5 text-white/55">
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
      {result ? (
        <>
          <div className="mt-3 space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Preflight verified — HTTP 200</p>
            <p>Organization: {result.organization}</p>
            <p>Effective role: {result.role}</p>
            <p>Location: {result.location}</p>
            <p>Provider: {result.provider}</p>
            <p>Authorization destination: {result.destination}</p>
            <p>OAuth state: created and {result.stateStatus}</p>
            <p>Original expiry: {result.expiresAt}</p>
          </div>
          <div className="mt-3">
            <GoHighLevelSecureConnectButton locationId={result.locationId} />
          </div>
        </>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
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
