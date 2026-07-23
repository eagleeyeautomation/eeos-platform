import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Lock, Loader2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";

function readReturnTo() {
  if (typeof window === "undefined") return "/executive-home";
  const params = new URLSearchParams(window.location.search);
  const value = params.get("returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/")) {
    return "/executive-home";
  }
  return value;
}

export default function SignIn() {
  const utils = trpc.useUtils();
  const returnTo = useMemo(readReturnTo, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, returnTo }),
      });
      const payload = await response.json().catch(() => ({ error: "Sign in failed." }));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Sign in failed.");
      }
      await utils.auth.session.invalidate();
      window.location.href = payload.redirectTo || "/executive-home";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
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
              <Lock className="h-5 w-5 text-[#C9A227]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              EEOS Secure Access
            </p>
            <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sign in to Eagle Eye
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#FFFFFF]/55">
              Access the Owner Command Center or Platform Admin with your EEOS account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#FFFFFF]/45" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0B0B0B] outline-none transition focus:border-[#C9A227] focus:ring-2 focus:ring-[rgba(201,162,39,0.22)]"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A]"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#FFFFFF]/45">
            Need access?{" "}
            <Link href="/contact" className="font-semibold text-[#C9A227] hover:text-[#D8B84A]">
              Contact Eagle Eye Automation
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
