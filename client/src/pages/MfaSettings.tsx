import { useProductSession } from "@/contexts/ProductSessionContext";
import { FormEvent, useState } from "react";

export default function MfaSettings() {
  const session = useProductSession();
  const [uri, setUri] = useState(""); const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]); const [error, setError] = useState("");
  async function start() {
    const response = await fetch("/api/auth/mfa/enrollment/start", { method: "POST", credentials: "include", headers: { "x-eeos-csrf-token": session.csrfToken ?? "" } });
    const payload = await response.json(); if (!response.ok) return setError(payload.error); setUri(payload.provisioningUri);
  }
  async function confirm(event: FormEvent) {
    event.preventDefault(); const response = await fetch("/api/auth/mfa/enrollment/confirm", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "x-eeos-csrf-token": session.csrfToken ?? "" }, body: JSON.stringify({ code }) });
    const payload = await response.json(); if (!response.ok) return setError(payload.error); setRecoveryCodes(payload.recoveryCodes); setUri("");
  }
  return <main className="mx-auto max-w-2xl px-6 py-24"><h1 className="text-3xl font-bold">Multi-factor authentication</h1>
    {!uri && recoveryCodes.length === 0 && <button onClick={start} className="mt-6 rounded-xl bg-[#C9A227] px-5 py-3 font-semibold text-black">Begin secure enrollment</button>}
    {uri && <form onSubmit={confirm} className="mt-6 space-y-4"><p className="break-all rounded-lg bg-black/10 p-4 text-sm">{uri}</p><input aria-label="Authenticator code" value={code} onChange={(event) => setCode(event.target.value)} className="rounded-lg border px-4 py-3" /><button className="rounded-lg bg-[#C9A227] px-4 py-3 text-black">Confirm enrollment</button></form>}
    {recoveryCodes.length > 0 && <section className="mt-6"><h2 className="font-bold">Save these recovery codes now</h2><p className="text-sm">They will not be shown again.</p><ul className="mt-3 font-mono">{recoveryCodes.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    {error && <p className="mt-4 text-red-600">{error}</p>}</main>;
}
