// EEOS Industries Page — Sovereign Night Design System

import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { INDUSTRIES } from "@/lib/demo-data";

export default function Industries() {
  const [activeIndustry, setActiveIndustry] = useState(INDUSTRIES[0].id);
  const active = INDUSTRIES.find((i) => i.id === activeIndustry)!;

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">Industries</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#FFFFFF] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Built for service
              <br />
              <span className="gradient-text">businesses that grow</span>
            </h1>
            <p className="text-xl text-[#FFFFFF]/65 leading-relaxed">
              Eagle Eye Automation's EEOS is purpose-configured for the unique intelligence needs of each service industry — from staffing firms to healthcare operators to professional services groups.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Industry Selector */}
      <section className="bg-[#141414] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <div className="space-y-2">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => setActiveIndustry(industry.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 flex items-center gap-4 ${
                    activeIndustry === industry.id
                      ? "bg-[rgba(201,162,39,0.1)] border border-[rgba(201,162,39,0.3)]"
                      : "border border-transparent hover:bg-[rgba(201,162,39,0.04)] hover:border-[rgba(201,162,39,0.1)]"
                  }`}
                >
                  <span className="text-2xl">{industry.icon}</span>
                  <div>
                    <div
                      className={`text-sm font-semibold transition-colors ${
                        activeIndustry === industry.id ? "text-[#C9A227]" : "text-[#FFFFFF]/80"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {industry.name}
                    </div>
                    <div className="text-xs text-[#FFFFFF]/40 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {industry.metrics.clients} enterprise clients
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl p-8 h-full">
                <div className="flex items-start gap-4 mb-6">
                  <span className="text-4xl">{active.icon}</span>
                  <div>
                    <h2
                      className="text-2xl font-bold text-[#FFFFFF] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {active.name}
                    </h2>
                    <p className="text-[#FFFFFF]/60">{active.description}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Avg. ROI", value: active.metrics.avgROI },
                    { label: "Time to Value", value: active.metrics.timeToValue },
                    { label: "Enterprise Clients", value: active.metrics.clients },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="bg-[rgba(201,162,39,0.06)] border border-[rgba(201,162,39,0.15)] rounded-xl p-4 text-center"
                    >
                      <div
                        className="text-2xl font-bold text-[#C9A227] mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {m.value}
                      </div>
                      <div className="text-xs text-[#FFFFFF]/50"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Use Cases */}
                <div>
                  <h3
                    className="text-sm font-semibold text-[#FFFFFF]/60 uppercase tracking-wider mb-4"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}
                  >
                    Key Use Cases
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {active.useCases.map((uc) => (
                      <div
                        key={uc}
                        className="flex items-center gap-2.5 p-3 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.08)]"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                        <span className="text-sm text-[#FFFFFF]/75">{uc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[rgba(201,162,39,0.1)]">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_16px_rgba(201,162,39,0.3)]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Talk to an {active.name} Specialist
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Industries Grid */}
      <section className="bg-[#0B0B0B] py-24 scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              EEOS across every sector
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDUSTRIES.map((industry, i) => (
              <AnimatedSection key={industry.id} delay={i * 80}>
                <button
                  onClick={() => {
                    setActiveIndustry(industry.id);
                    window.scrollTo({ top: 400, behavior: "smooth" });
                  }}
                  className="w-full text-left glass-card rounded-xl p-6 hover:border-[rgba(201,162,39,0.3)] transition-all duration-300 group"
                >
                  <div className="text-3xl mb-4">{industry.icon}</div>
                  <h3
                    className="text-lg font-semibold text-[#FFFFFF] mb-2 group-hover:text-[#C9A227] transition-colors"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {industry.name}
                  </h3>
                  <p className="text-sm text-[#FFFFFF]/55 leading-relaxed mb-4">
                    {industry.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#C9A227]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>{industry.metrics.avgROI} avg ROI</span>
                    <span className="text-[#FFFFFF]/30">·</span>
                    <span>{industry.metrics.clients} clients</span>
                  </div>
                </button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
