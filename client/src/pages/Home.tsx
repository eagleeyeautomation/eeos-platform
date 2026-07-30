import { ArrowRight, Brain, Link2, Lock, Play, ShieldCheck, Zap } from "lucide-react";
import { Link } from "wouter";

import AnimatedSection from "@/components/AnimatedSection";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const CAPABILITIES = [
  {
    icon: Brain,
    title: "Executive intelligence",
    description: "Turn approved business signals into a clear view of health, priorities, and next actions.",
    href: "/why-eeos",
    linkLabel: "Why EEOS",
  },
  {
    icon: Link2,
    title: "Connected operations",
    description: "Connect the systems your business already uses, beginning with GoHighLevel.",
    href: "/integrations",
    linkLabel: "Explore integrations",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description: "Protect customer data with role-aware access, connection health, and disciplined operations.",
    href: "/security",
    linkLabel: "Review security",
  },
  {
    icon: Zap,
    title: "A practical path to value",
    description: "Start with a focused operating foundation designed for growing service businesses.",
    href: "/pricing",
    linkLabel: "View pricing",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF]">
      <Navigation />

      <main>
        <section className="relative overflow-hidden border-b border-[rgba(201,162,39,0.12)] bg-[#080808] pt-24">
          <div className="absolute inset-0 scan-grid opacity-20" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
            <AnimatedSection>
              <div className="overflow-hidden rounded-3xl border border-[#C9A227]/25 bg-black shadow-[0_28px_100px_rgba(0,0,0,0.65)]">
                <video
                  className="aspect-video h-auto w-full object-cover"
                  autoPlay
                  controls
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster="/eeos-assets/eeos-hero-bg.svg"
                  aria-label="EEOS executive operating system introduction"
                >
                  <source
                    src="/eeos-assets/video/eeos-first-commercial.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support embedded video.
                </video>
              </div>
            </AnimatedSection>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-[#C9A227]/10 bg-[#141414] py-20 sm:py-24">
          <div className="absolute inset-0 scan-grid opacity-20" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="max-w-4xl">
              <div className="section-label mb-5">Eagle Eye Operating System</div>
              <h1
                className="text-5xl font-bold leading-[1.04] tracking-tight text-[#FFFFFF] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Fortune 500 Power
                <br />
                for Small Business.
              </h1>
              <p className="mt-5 text-2xl font-semibold text-[#FFFFFF]/72 sm:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                The AI Operating System that helps owners <span className="gradient-text">lead with executive intelligence.</span>
              </p>
              <p className="mt-7 max-w-3xl text-base leading-7 text-[#FFFFFF]/68 sm:text-lg sm:leading-8">
                Eagle Eye Automation builds AI, automation, and executive intelligence for small businesses. Our flagship product, <span className="font-semibold text-[#C9A227]">EEOS</span>, gives owners enterprise-level visibility, decision support, workflow automation, and secure operations without requiring an enterprise-size team.
              </p>
              <div className="mt-6 flex max-w-3xl items-start gap-3 rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/[0.04] p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A227]" />
                <p className="text-sm leading-6 text-[#FFFFFF]/75">
                  <span className="font-semibold text-[#C9A227]">How EEOS works:</span> Connects to your business systems, reads approved signals, and turns them into executive intelligence — all without storing your source data.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/connect-ghl"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-6 py-3 text-sm font-bold text-[#0B0B0B] transition hover:bg-[#D8B84A]"
                >
                  <Zap className="h-4 w-4" />
                  Start Private Beta
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C9A227]/40 px-6 py-3 text-sm font-semibold text-[#C9A227] transition hover:bg-[#C9A227]/10"
                >
                  <Play className="h-4 w-4" />
                  Request Demo
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#FFFFFF]/72 transition hover:text-[#FFFFFF]"
                >
                  Connect Your Business
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                {["SOC 2 Type II", "ISO 27001", "FedRAMP Ready", "Service Business Specialists"].map((indicator) => (
                  <div key={indicator} className="flex items-center gap-2 text-xs tracking-wide text-[#FFFFFF]/55">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" aria-hidden="true" />
                    {indicator}
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        <section className="bg-[#0B0B0B] py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <AnimatedSection>
              <div className="section-label mb-4">One operating view</div>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                From scattered activity to executive clarity.
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#FFFFFF]/65">
                EEOS is the operating layer between your business systems and the decisions you make every day. It presents verified information, connection status, operational priorities, and supported recommendations without turning leadership into another reporting job.
              </p>
            </AnimatedSection>
          </div>
        </section>

        <section className="bg-[#0B0B0B] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="mb-10 max-w-3xl">
              <div className="section-label mb-4">Platform capabilities</div>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                The essentials, organized around how executives lead.
              </h2>
            </AnimatedSection>
            <div className="grid gap-5 md:grid-cols-2">
              {CAPABILITIES.map((capability, index) => (
                <AnimatedSection key={capability.title} delay={index * 80}>
                  <article className="glass-card flex h-full flex-col rounded-2xl p-6">
                    <span className="mb-5 w-fit rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-3 text-[#C9A227]">
                      <capability.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {capability.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-[#FFFFFF]/62">{capability.description}</p>
                    <Link
                      href={capability.href}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#C9A227] transition hover:text-[#D8B84A]"
                    >
                      {capability.linkLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#C9A227]/15 bg-[#141414] py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <AnimatedSection>
              <div className="section-label mb-4">See EEOS in context</div>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-5xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Build a clearer operating rhythm for your business.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#FFFFFF]/65">
                Request a focused walkthrough of the EEOS experience and its fit for your organization.
              </p>
              <Link
                href="/demo"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C9A227] px-7 py-3 text-sm font-bold text-[#0B0B0B] transition hover:bg-[#D8B84A]"
              >
                Request a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
