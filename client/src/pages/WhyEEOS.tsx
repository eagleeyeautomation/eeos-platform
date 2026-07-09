// EEOS Why EEOS Page — Sovereign Night Design System

import { Link } from "wouter";
import { ArrowRight, AlertTriangle, Clock, Eye, TrendingUp, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    color: "#EF4444",
    title: "Decisions made on stale data",
    description: "Business reports are assembled manually, often days or weeks after the events they describe. By the time you see the signal, the window to act has already closed.",
  },
  {
    icon: Clock,
    color: "#F59E0B",
    title: "Hours lost to information gathering",
    description: "Service business owners spend 40% of their time gathering information that should already be at their fingertips. EEOS eliminates this entirely.",
  },
  {
    icon: Eye,
    color: "#F59E0B",
    title: "Blind spots across the business",
    description: "No single owner can see everything. Revenue risks, team utilization gaps, client health signals, and competitive shifts fall through the cracks between departments.",
  },
  {
    icon: TrendingUp,
    color: "#EF4444",
    title: "Reacting instead of leading",
    description: "Most service businesses operate in permanent reaction mode — solving yesterday's problems instead of making tomorrow's decisions. EEOS changes that equation.",
  },
];

const COMPARISON = [
  { category: "Data freshness", without: "Days to weeks old", with: "Real-time, continuous" },
  { category: "Decision speed", without: "Weeks of analysis", with: "Minutes with full context" },
  { category: "Organizational visibility", without: "Siloed by department", with: "Unified cross-org view" },
  { category: "Risk detection", without: "Reactive, post-incident", with: "Proactive, signal-based" },
  { category: "Executive time on intel", without: "40% of work week", with: "Under 5% of work week" },
  { category: "Strategic alignment", without: "Quarterly review cycles", with: "Continuous real-time scoring" },
  { category: "Integration effort", without: "Months of IT projects", with: "6-week activation" },
];

const TESTIMONIALS = [
  {
    quote: "EEOS gave me back 15 hours a week. I used to spend Monday mornings in briefings. Now I spend them making decisions.",
    name: "Founder & CEO",
    company: "Regional Staffing Firm",
    size: "320 employees",
  },
  {
    quote: "We caught a client retention risk 11 days before it would have cost us the account. That single alert paid for a full year of EEOS.",
    name: "Managing Director",
    company: "Professional Services Group",
    size: "85 employees",
  },
  {
    quote: "The Business DNA view changed how I think about our growth strategy. It's not a dashboard — it's a new way of seeing my entire business.",
    name: "President",
    company: "Healthcare Staffing Agency",
    size: "200 employees",
  },
];

export default function WhyEEOS() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="max-w-3xl">
            <div className="section-label mb-4">The Case for EEOS</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The information gap
              <br />
              is costing your business
              <br />
              <span className="gradient-text">more than you know.</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              Service business owners make decisions on incomplete, outdated, and siloed information every day. Eagle Eye Automation built EEOS to close that gap permanently — so you can stop managing and start leading.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The problem every enterprise faces
            </h2>
            <p className="text-[#E8EDF5]/60 max-w-2xl mx-auto">
              These aren't edge cases. They're the daily reality for executives leading complex organizations.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PAIN_POINTS.map((point, i) => (
              <AnimatedSection key={point.title} delay={i * 100}>
                <div className="glass-card rounded-xl p-8 h-full">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                    style={{ background: `${point.color}15`, border: `1px solid ${point.color}30` }}
                  >
                    <point.icon className="w-5 h-5" style={{ color: point.color }} />
                  </div>
                  <h3
                    className="text-xl font-semibold text-[#E8EDF5] mb-3"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {point.title}
                  </h3>
                  <p className="text-[#E8EDF5]/60 leading-relaxed">{point.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-[#050C1A] py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">The EEOS Difference</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Before and after EEOS
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-[#0F1E35] px-6 py-4">
                <div className="text-xs font-semibold text-[#E8EDF5]/40 uppercase tracking-wider"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Category
                </div>
                <div className="text-xs font-semibold text-[#EF4444]/70 uppercase tracking-wider text-center"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Without EEOS
                </div>
                <div className="text-xs font-semibold text-[#00D4C8] uppercase tracking-wider text-center"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  With EEOS
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.category}
                  className={`grid grid-cols-3 px-6 py-4 border-t border-[rgba(0,212,200,0.08)] ${
                    i % 2 === 0 ? "bg-[rgba(0,212,200,0.02)]" : ""
                  }`}
                >
                  <div className="text-sm font-medium text-[#E8EDF5]/80"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {row.category}
                  </div>
                  <div className="text-sm text-[#EF4444]/70 text-center">{row.without}</div>
                  <div className="text-sm text-[#00D4C8] text-center font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {row.with}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Executive Perspectives</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              What leaders say about EEOS
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 120}>
                <div className="glass-card rounded-xl p-8 h-full flex flex-col">
                  <div className="text-3xl text-[#00D4C8]/30 mb-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    "
                  </div>
                  <p className="text-[#E8EDF5]/80 leading-relaxed italic flex-1 mb-6">
                    {t.quote}
                  </p>
                  <div className="border-t border-[rgba(0,212,200,0.1)] pt-4">
                    <div className="text-sm font-semibold text-[#E8EDF5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {t.name}
                    </div>
                    <div className="text-xs text-[#00D4C8] mt-0.5">{t.company}</div>
                    <div className="text-xs text-[#E8EDF5]/40 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.size}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] border-t border-[rgba(0,212,200,0.1)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20">
              <div className="flex-1">
                <div className="section-label mb-3">Command Briefing</div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-4 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Observe EEOS under live conditions.
                  <br />
                  <span className="gradient-text">Six modules. Your data. Real decisions.</span>
                </h2>
                <p className="text-[#E8EDF5]/55 max-w-lg">
                  The interactive demo runs on a fictional Fortune 500 enterprise. Every signal, recommendation, and knowledge graph node is generated from the same intelligence engine that runs in production.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enter the Demo
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Begin Activation
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
