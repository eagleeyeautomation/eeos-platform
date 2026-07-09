// EEOS Pricing Page — Sovereign Night Design System

import { Link } from "wouter";
import { ArrowRight, CheckCircle2, HelpCircle, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { PRICING_TIERS } from "@/lib/demo-data";

const FAQS = [
  {
    q: "How long does implementation take?",
    a: "EEOS is live in 6 weeks for most enterprise deployments. Our dedicated onboarding team handles all integration configuration, data mapping, and executive training.",
  },
  {
    q: "Does EEOS store our data?",
    a: "No. EEOS operates on a read-only connector model. We read signals from your systems in real time but never store, copy, or replicate your underlying data. Your data stays in your systems.",
  },
  {
    q: "What integrations are included?",
    a: "All tiers include access to our full library of 50+ pre-built connectors. Custom connectors are available for proprietary or legacy systems on Sovereign and Apex tiers.",
  },
  {
    q: "Can we start with a pilot?",
    a: "Yes. We offer a 90-day pilot program for qualified enterprises. Contact our sales team to discuss pilot scope and terms.",
  },
  {
    q: "Is EEOS available for government agencies?",
    a: "Yes. EEOS is FedRAMP Ready and has been deployed in defense and intelligence-adjacent environments. Contact us for government-specific deployment options.",
  },
  {
    q: "What does 'Contact Sales' mean for pricing?",
    a: "EEOS is priced based on organizational complexity, number of integrations, and deployment requirements. Our starting price points are listed as guidance. All pricing is transparent and contract-based.",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-24">
            <AnimatedSection className="flex-1">
              <div className="section-label mb-4">Pricing Architecture</div>
              <h1
                className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6 leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Investment-grade
                <br />
                <span className="gradient-text">executive intelligence</span>
              </h1>
              <p className="text-xl text-[#E8EDF5]/60 leading-relaxed max-w-xl">
                EEOS delivers an average 340% ROI within the first year. Pricing scales with your organization's complexity — not your headcount.
              </p>
            </AnimatedSection>
            <AnimatedSection delay={200} className="shrink-0 lg:w-72">
              <div className="glass-card rounded-xl p-6">
                <div className="section-label mb-3">Average Client Outcomes</div>
                <div className="space-y-4">
                  {[
                    { label: "ROI Year 1", value: "340%", color: "#10B981" },
                    { label: "Decision Latency", value: "−73%", color: "#00D4C8" },
                    { label: "Time to Value", value: "6 wks", color: "#00D4C8" },
                    { label: "Retention Rate", value: "98%", color: "#10B981" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-[#E8EDF5]/50">{item.label}</span>
                      <span className="text-lg font-bold" style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(0,212,200,0.1)]">
                  <div className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Based on 42 enterprise deployments · 2023–2025
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <AnimatedSection key={tier.id} delay={i * 120}>
                <div
                  className={`rounded-2xl p-8 h-full flex flex-col relative overflow-hidden ${
                    tier.highlight
                      ? "border-2 border-[#00D4C8] bg-[#0F1E35] shadow-[0_0_40px_rgba(0,212,200,0.15)]"
                      : "glass-card"
                  }`}
                >
                  {tier.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00D4C8] to-transparent" />
                  )}
                  {tier.highlight && (
                    <div className="absolute top-4 right-4">
                      <span className="tag-teal text-[10px]">Most Popular</span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div
                      className="text-xs text-[#E8EDF5]/40 uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {tier.tagline}
                    </div>
                    <h3
                      className="text-3xl font-bold text-[#E8EDF5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {tier.name}
                    </h3>
                    <div
                      className={`text-lg font-semibold ${tier.highlight ? "text-[#00D4C8]" : "text-[#E8EDF5]/80"}`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {tier.price}
                    </div>
                    <div className="text-sm text-[#E8EDF5]/45 mt-1"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {tier.priceNote}
                    </div>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            tier.highlight ? "text-[#00D4C8]" : "text-[#10B981]"
                          }`}
                        />
                        <span className="text-sm text-[#E8EDF5]/70">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.highlight ? "/connect-ghl" : "/contact"}
                    className={`w-full text-center flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold active:scale-[0.97] transition-all duration-200 ${
                      tier.highlight
                        ? "bg-[#00D4C8] text-[#050C1A] hover:bg-[#00E8DB] shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                        : "border border-[rgba(0,212,200,0.35)] text-[#00D4C8] hover:bg-[rgba(0,212,200,0.08)]"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {tier.highlight && <Zap className="w-3.5 h-3.5" />}
                    {tier.highlight ? "Start Private Beta" : tier.cta}
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={400} className="mt-10 text-center">
            <p className="text-sm text-[#E8EDF5]/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              All plans include a 90-day satisfaction guarantee · No setup fees · Annual contracts
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ROI Calculator teaser */}
      <section className="bg-[#050C1A] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="glass-card rounded-2xl p-10 text-center">
              <div className="section-label mb-4">ROI Estimate</div>
              <h2
                className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                EEOS pays for itself — fast
              </h2>
              <p className="text-[#E8EDF5]/60 mb-8 max-w-2xl mx-auto">
                Our clients report an average 340% ROI in year one. A single prevented supply chain disruption, talent attrition event, or missed contract opportunity typically exceeds the annual cost of EEOS.
              </p>
              <div className="grid grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Average Year 1 ROI", value: "340%" },
                  { label: "Avg. Decision Speed Improvement", value: "12×" },
                  { label: "Executive Hours Saved / Week", value: "15 hrs" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div
                      className="text-3xl font-bold text-[#00D4C8] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs text-[#E8EDF5]/50">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/connect-ghl"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Start Private Beta
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Frequently asked questions
            </h2>
          </AnimatedSection>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <HelpCircle className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                    <h3
                      className="text-base font-semibold text-[#E8EDF5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {faq.q}
                    </h3>
                  </div>
                  <p className="text-sm text-[#E8EDF5]/60 leading-relaxed pl-7">{faq.a}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
