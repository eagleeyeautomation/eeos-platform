import { FormEvent, useState } from "react";

export default function AdminBootstrap() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/bootstrap-admin-session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const result = await response.json() as { redirectTo?: string };
      if (!response.ok || !result.redirectTo) throw new Error("Administrator session could not be created.");
      window.location.assign(result.redirectTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Administrator session could not be created.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050C1A] text-[#E8EDF5] grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 space-y-5">
        <h1 className="text-2xl font-semibold">EEOS administrator activation</h1>
        <p className="text-sm text-white/60">This one-time page is not linked from public navigation.</p>
        <label className="block space-y-2">
          <span className="text-sm">Bootstrap secret</span>
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
            required
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !secret}
          className="w-full rounded-md bg-[#00D4C8] px-4 py-2 font-semibold text-[#050C1A] disabled:opacity-50"
        >
          {submitting ? "Creating session…" : "Create administrator session"}
        </button>
      </form>
    </main>
  );
}
