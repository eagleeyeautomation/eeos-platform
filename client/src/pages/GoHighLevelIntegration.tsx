import { ExternalLink, Lock, PlugZap, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import { GoHighLevelSecureConnectButton } from "@/components/GoHighLevelSecureConnectButton";
import Navigation from "@/components/Navigation";

const prnSouthCarolinaLocationId = "rJH8XytyAfEQSoOTQeuZ";

export default function GoHighLevelIntegration() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      <main className="pt-28">
        <section className="relative overflow-hidden pb-12">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute right-0 top-12 h-[420px] w-[420px] rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #00D4C8 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="section-label mb-4">GoHighLevel Integration</div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#E8EDF5] sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Secure GoHighLevel connection
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#E8EDF5]/65">
              Connect PRN Staffers South Carolina through the EEOS OAuth layer. The browser never receives tokens, authorization codes, client secrets, or OAuth state.
            </p>
          </div>
        </section>

        <section className="bg-[#0A1628] py-10">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_0.78fr] lg:px-8">
            <GoHighLevelSecureConnectButton locationId={prnSouthCarolinaLocationId} />

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

        <section className="bg-[#050C1A] py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <ExternalLink className="mt-1 h-5 w-5 text-[#00D4C8]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    What happens next
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#E8EDF5]/60">
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
        <Icon className="h-5 w-5 text-[#00D4C8]" aria-hidden="true" />
        <h2 className="text-base font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#E8EDF5]/55">{description}</p>
    </div>
  );
}
