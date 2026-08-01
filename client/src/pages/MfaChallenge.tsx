import Navigation from "@/components/Navigation";
import { FormEvent, useEffect, useState } from "react";

export default function MfaChallenge() {
  const [csrfToken, setCsrfToken] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/auth/mfa/pending", { credentials: "include" }).then(async (response) => {
    if (!response.ok) throw new Error();
    setCsrfToken((await response.json()).csrfToken);
  }).catch(() => { window.location.href = "/login"; }); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/auth/mfa/challenge", { method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "x-eeos-csrf-token": csrfToken }, body: JSON.stringify({ code }) });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error ?? "Authentication failed.");
    window.location.href = payload.redirectTo;
  }
  return <div className="min-h-screen bg-[#0B0B0B] text-white"><Navigation /><main className="mx-auto max-w-md px-4 py-32">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8">
      <h1 className="text-2xl font-bold">Two-step verification</h1><p className="text-sm text-white/60">Enter an authenticator code or one unused recovery code.</p>
      <input aria-label="Authentication code" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required className="w-full rounded-xl bg-white px-4 py-3 text-black" />
      {error && <p className="text-sm text-red-300">{error}</p>}<button className="w-full rounded-xl bg-[#C9A227] px-4 py-3 font-semibold text-black">Verify</button>
    </form></main></div>;
}
