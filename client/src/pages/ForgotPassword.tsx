import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({ message: "If the account exists, reset instructions will be sent." }));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Password reset could not be started.");
      }
      setMessage(payload.message || "If the account exists, reset instructions will be sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password reset could not be started.");
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
              <Mail className="h-5 w-5 text-[#C9A227]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              EEOS Account Recovery
            </p>
            <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Reset your password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#FFFFFF]/55">
              Enter your EEOS account email. If it exists, reset instructions will be sent.
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

            {message && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div>}
            {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

            <Button type="submit" disabled={submitting} className="h-12 w-full bg-[#C9A227] text-[#0B0B0B] hover:bg-[#D8B84A]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Reset Instructions
            </Button>
          </form>

          <Link href="/login" className="mt-6 inline-flex items-center text-sm font-semibold text-[#C9A227] hover:text-[#D8B84A]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </section>
      </main>
    </div>
  );
}
