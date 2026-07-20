import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

type GoHighLevelSessionContext = {
  authenticated: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    membershipId: number;
  };
  location: {
    id: string;
    name: string;
  };
  csrfCookieReady: boolean;
};

type GoHighLevelSecureConnectButtonProps = {
  locationId: string;
};

export function GoHighLevelSecureConnectButton({ locationId }: GoHighLevelSecureConnectButtonProps) {
  const [sessionContext, setSessionContext] = useState<GoHighLevelSessionContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "starting" | "blocked" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSessionContext() {
      try {
        const response = await fetch(`/api/integrations/gohighlevel/session-context?locationId=${encodeURIComponent(locationId)}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json().catch(() => null)) as GoHighLevelSessionContext | { message?: string } | null;

        if (!active) return;

        if (!response.ok || !payload || !("authenticated" in payload)) {
          setStatus("blocked");
          setMessage(payload && "message" in payload ? payload.message ?? "Sign in before connecting GoHighLevel." : "Sign in before connecting GoHighLevel.");
          return;
        }

        setSessionContext(payload);
        setStatus("ready");
        setMessage(null);
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to verify your EEOS session.");
      }
    }

    void loadSessionContext();

    return () => {
      active = false;
    };
  }, [locationId]);

  async function startOAuth() {
    if (!sessionContext || status === "starting") {
      return;
    }

    setStatus("starting");
    setMessage(null);

    try {
      const csrfToken = readCookie("eeos_csrf");

      if (!csrfToken) {
        throw new Error("Your secure session token is missing. Refresh this page and sign in again before connecting GoHighLevel.");
      }

      const response = await fetch(`/api/integrations/gohighlevel/oauth/start?locationId=${encodeURIComponent(locationId)}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "x-eeos-csrf-token": csrfToken,
        },
      });
      const payload = (await response.json().catch(() => null)) as { authorizationUrl?: string; message?: string; error?: string } | null;

      if (!response.ok || !payload?.authorizationUrl) {
        throw new Error(payload?.message ?? payload?.error ?? "GoHighLevel authorization could not be started.");
      }

      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "GoHighLevel authorization could not be started.");
    }
  }

  const disabled = status === "loading" || status === "starting" || status === "blocked" || !sessionContext;

  return (
    <div className="space-y-4 rounded-2xl border border-[rgba(0,212,200,0.16)] bg-[rgba(255,255,255,0.04)] p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#00D4C8]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Secure EEOS session
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SessionTile label="Authenticated User" value={sessionContext ? `${sessionContext.user.name} (${sessionContext.user.email})` : "Not verified"} />
        <SessionTile label="Organization ID" value={sessionContext?.organization.id ?? "Not verified"} />
        <SessionTile label="Organization Name" value={sessionContext?.organization.name ?? "Not verified"} />
      </div>

      <div className="rounded-xl border border-[rgba(0,212,200,0.12)] bg-[rgba(0,212,200,0.05)] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#00D4C8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Target GoHighLevel location
        </p>
        <p className="mt-2 text-sm font-semibold text-[#E8EDF5]">{sessionContext?.location.name ?? "Awaiting session verification"}</p>
        <p className="mt-1 text-xs text-[#E8EDF5]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {sessionContext?.location.id ?? locationId}
        </p>
      </div>

      <button
        type="button"
        onClick={startOAuth}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#00D4C8] px-5 text-sm font-semibold text-[#050C1A] shadow-[0_0_20px_rgba(0,212,200,0.25)] transition hover:bg-[#00E8DB] disabled:cursor-not-allowed disabled:bg-[#E8EDF5]/20 disabled:text-[#E8EDF5]/45 disabled:shadow-none"
      >
        {status === "starting" || status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
        {status === "starting" ? "Opening GoHighLevel..." : "Connect GoHighLevel"}
      </button>

      {status === "ready" ? (
        <InlineNotice tone="success" message="Ready to start the secure GoHighLevel authorization flow. EEOS will use POST plus CSRF protection." />
      ) : null}
      {message ? <InlineNotice tone={status === "blocked" ? "warning" : "error"} message={message} /> : null}
    </div>
  );
}

function SessionTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.04)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[#E8EDF5]">{value}</p>
    </div>
  );
}

function InlineNotice({ tone, message }: { tone: "success" | "warning" | "error"; message: string }) {
  const className =
    tone === "success"
      ? "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)] text-[#10B981]"
      : tone === "warning"
        ? "border-[rgba(246,200,95,0.25)] bg-[rgba(246,200,95,0.08)] text-[#F6C85F]"
        : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-[#EF4444]";
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <p className={`inline-flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function readCookie(name: string) {
  const prefix = `${name}=`;

  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}
