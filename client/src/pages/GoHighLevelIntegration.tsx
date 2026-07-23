import { ExternalLink, Lock, PlugZap, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
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
