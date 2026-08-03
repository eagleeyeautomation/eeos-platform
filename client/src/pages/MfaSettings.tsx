import { useProductSession } from "@/contexts/ProductSessionContext";
import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useEffect, useState } from "react";

function readBase32Secret(provisioningUri: string) {
  try {
    const secret = new URL(provisioningUri).searchParams.get("secret") ?? "";
    return /^otpauth:\/\/totp\//.test(provisioningUri) && /^[A-Z2-7]+$/.test(secret) ? secret : "";
  } catch {
    return "";
  }
}

export default function MfaSettings() {
  const session = useProductSession();
  const [uri, setUri] = useState(""); const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]); const [error, setError] = useState("");
  const setupKey = readBase32Secret(uri);
  const hasValidSetup = Boolean(setupKey);
  useEffect(() => {
    if (!session.csrfToken) return;
    const controller = new AbortController();
    void fetch("/api/auth/mfa/enrollment/resume", {
      method: "POST", credentials: "include", signal: controller.signal,
      headers: { "x-eeos-csrf-token": session.csrfToken },
    }).then(async (response) => {
      if (response.status === 404) return;
      const payload = await response.json();
      if (response.ok) setUri(payload.provisioningUri);
      else setError(payload.error);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("MFA enrollment could not be loaded.");
    });
    return () => controller.abort();
  }, [session.csrfToken]);
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
    {uri && !hasValidSetup && <p className="mt-4 text-red-600">The authenticator setup could not be displayed safely. Begin enrollment again.</p>}
    {uri && hasValidSetup && <form onSubmit={confirm} className="mt-6 space-y-4">
      <section aria-labelledby="mfa-qr-heading" className="space-y-3">
        <h2 id="mfa-qr-heading" className="font-bold">Scan with your authenticator app</h2>
        <p className="text-sm">Use your authenticator app to scan this QR code, then enter the six-digit code it generates.</p>
        <div className="w-fit rounded-xl bg-white p-4 shadow-sm">
          <QRCodeSVG value={uri} size={224} level="M" marginSize={1} title="EEOS authenticator setup QR code" />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Can&apos;t scan the QR code?</summary>
          <p className="mt-2">Enter this Base32 setup key manually. Keep it private.</p>
          <p className="mt-2 break-all rounded-lg bg-black/10 p-4 font-mono text-xs tracking-wider">{setupKey}</p>
        </details>
      </section>
      <input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="rounded-lg border px-4 py-3" />
      <button className="rounded-lg bg-[#C9A227] px-4 py-3 text-black">Confirm enrollment</button>
    </form>}
    {recoveryCodes.length > 0 && <section className="mt-6"><h2 className="font-bold">Save these recovery codes now</h2><p className="text-sm">They will not be shown again.</p><ul className="mt-3 font-mono">{recoveryCodes.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    {error && <p className="mt-4 text-red-600">{error}</p>}</main>;
}
