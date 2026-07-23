import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";

function readToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function AcceptInvitation() {
  const token = useMemo(readToken, []);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, displayName, password }),
      });
      const payload = await response.json().catch(() => ({ error: "Invitation could not be accepted." }));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Invitation could not be accepted.");
      }
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invitation could not be accepted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />
      <main className="flex min-h-screen items-center justify-center px-4 py-28">
        <section className="w-full max-w-md rounded-2xl border border-[rgba(201,162,39,0.18)] bg-[rgba(255,255,255,0.04)] p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.08)]">
              <UserPlus className="h-5 w-5 text-[#C9A227]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              EEOS Invitation
            </p>
            <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Create your EEOS account
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#FFFFFF]/55">
              Accept the invitation and create a password for secure access.
            </p>
          </div>

          {!token ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Invitation token is missing.
            </div>
          ) : complete ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Invitation accepted. You can now sign in.
              </div>
              <Link href="/login" className="inline-flex w-full items-center justify-center rounded-xl bg-[#C9A227] px-4 py-3 text-sm font-semibold text-[#0B0B0B] hover:bg-[#D8B84A]">
                Continue to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Full Name
                </span>
                <input
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0B0B0B] outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[rgba(201,162,39,0.22)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={12}
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0B0B0B] outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[rgba(201,162,39,0.22)]"
                />
              </label>

              {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

              <Button type="submit" disabled={submitting} className="h-12 w-full bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A]">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Accept Invitation
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
