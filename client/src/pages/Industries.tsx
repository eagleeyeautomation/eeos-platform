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
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">Industries</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Built for service
              <br />
              <span className="gradient-text">businesses that grow</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              Eagle Eye Automation's EEOS is purpose-configured for the unique intelligence needs of each service industry — from staffing firms to healthcare operators to professional services groups.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Industry Selector */}
      <section className="bg-[#0A1628] py-24">
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
                      ? "bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.3)]"
                      : "border border-transparent hover:bg-[rgba(0,212,200,0.04)] hover:border-[rgba(0,212,200,0.1)]"
                  }`}
                >
                  <span className="text-2xl">{industry.icon}</span>
                  <div>
                    <div
                      className={`text-sm font-semibold transition-colors ${
                        activeIndustry === industry.id ? "text-[#00D4C8]" : "text-[#E8EDF5]/80"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {industry.name}
                    </div>
                    <div className="text-xs text-[#E8EDF5]/40 mt-0.5"
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
                      className="text-2xl font-bold text-[#E8EDF5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {active.name}
                    </h2>
                    <p className="text-[#E8EDF5]/60">{active.description}</p>
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
                      className="bg-[rgba(0,212,200,0.06)] border border-[rgba(0,212,200,0.15)] rounded-xl p-4 text-center"
                    >
                      <div
                        className="text-2xl font-bold text-[#00D4C8] mb-1"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {m.value}
                      </div>
                      <div className="text-xs text-[#E8EDF5]/50"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Use Cases */}
                <div>
                  <h3
                    className="text-sm font-semibold text-[#E8EDF5]/60 uppercase tracking-wider mb-4"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}
                  >
                    Key Use Cases
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {active.useCases.map((uc) => (
                      <div
                        key={uc}
                        className="flex items-center gap-2.5 p-3 rounded-lg bg-[rgba(0,212,200,0.04)] border border-[rgba(0,212,200,0.08)]"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#00D4C8] shrink-0" />
                        <span className="text-sm text-[#E8EDF5]/75">{uc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[rgba(0,212,200,0.1)]">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_16px_rgba(0,212,200,0.3)]"
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
      <section className="bg-[#050C1A] py-24 scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
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
                  className="w-full text-left glass-card rounded-xl p-6 hover:border-[rgba(0,212,200,0.3)] transition-all duration-300 group"
                >
                  <div className="text-3xl mb-4">{industry.icon}</div>
                  <h3
                    className="text-lg font-semibold text-[#E8EDF5] mb-2 group-hover:text-[#00D4C8] transition-colors"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {industry.name}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/55 leading-relaxed mb-4">
                    {industry.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#00D4C8]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>{industry.metrics.avgROI} avg ROI</span>
                    <span className="text-[#E8EDF5]/30">·</span>
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
