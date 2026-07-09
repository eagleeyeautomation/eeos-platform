// EEOS Home Page — Sovereign Night Design System
// Hero + Stats + Value Props + Features Preview + Social Proof + CTA

import { Link } from "wouter";
import { ArrowRight, Play, ChevronRight, Zap, Shield, Brain, BarChart3, Globe, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";

const STATS = [
  { value: 340, suffix: "%", label: "Average ROI", mono: true },
  { value: 6, suffix: " weeks", label: "Time to Value", mono: true },
  { value: 42, suffix: "+", label: "Enterprise Clients", mono: true },
  { value: 98, suffix: "%", label: "Retention Rate", mono: true },
];

const VALUE_PROPS = [
  {
    icon: Brain,
    title: "Executive Intelligence",
    description: "EEOS synthesizes data from every corner of your organization into clear, actionable intelligence — delivered before you need to ask.",
  },
  {
    icon: Zap,
    title: "Decisive Speed",
    description: "From signal to decision in minutes, not weeks. EEOS surfaces what matters, when it matters, with the context to act.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 Type II certified. Zero-trust architecture. Your data never leaves your control — EEOS connects, not copies.",
  },
  {
    icon: Globe,
    title: "Universal Integration",
    description: "Connect every system your organization runs — ERP, CRM, HR, finance, operations — into one unified intelligence layer.",
  },
  {
    icon: BarChart3,
    title: "Business DNA Mapping",
    description: "EEOS builds a living model of your organization's strengths, risks, and strategic momentum — updated in real time.",
  },
  {
    icon: Users,
    title: "Built for the C-Suite",
    description: "Designed for CEOs, CFOs, COOs, and their teams. No dashboards to configure. No data science required. Just intelligence.",
  },
];

const LOGOS = [
  "MERIDIAN GLOBAL", "APEX DEFENSE", "NORTHSTAR CAPITAL", "VANTAGE HEALTH",
  "ORBITAL SYSTEMS", "PINNACLE ENERGY", "SOVEREIGN TECH", "ATLAS MANUFACTURING",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/manus-storage/eeos-hero-bg_c4a9cb00.png"
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 scan-grid opacity-40" />
        </div>

        {/* Teal glow orb */}
        <div
          className="absolute right-[10%] top-[20%] w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,212,200,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="flex items-center gap-3 mb-8 animate-fade-up">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] animate-pulse-teal" />
              <span className="section-label">Executive Intelligence Platform</span>
            </div>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#E8EDF5] leading-[1.05] tracking-tight mb-6 animate-fade-up delay-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your organization
              <br />
              has a nervous system.
              <br />
              <span className="gradient-text">EEOS is its brain.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[#E8EDF5]/70 leading-relaxed max-w-2xl mb-10 animate-fade-up delay-200">
              The executive operating system that transforms organizational complexity into decisive clarity — connecting every department, system, and signal into one unified intelligence layer for the C-suite.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Request Access
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Play className="w-4 h-4" />
                Experience Live Demo
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 mt-10 animate-fade-up delay-400">
              {["SOC 2 Type II", "ISO 27001", "FedRAMP Ready", "Fortune 500 Trusted"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#00D4C8]" />
                  <span className="text-xs text-[#E8EDF5]/50 tracking-wide"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <div className="w-px h-12 bg-gradient-to-b from-[rgba(0,212,200,0.6)] to-transparent" />
          <span className="text-[10px] text-[#00D4C8] tracking-[0.2em] uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Scroll
          </span>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#0A1628] border-y border-[rgba(0,212,200,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100} className="text-center">
                <div
                  className="text-4xl font-bold text-[#00D4C8] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-[#E8EDF5]/55 tracking-wide"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                  {stat.label}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGO MARQUEE ── */}
      <section className="bg-[#050C1A] py-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <p className="text-center text-xs text-[#E8EDF5]/30 tracking-[0.2em] uppercase mb-6"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Trusted by enterprise leaders across industries
          </p>
        </div>
        <div className="flex gap-16 items-center" style={{
          animation: "marquee 30s linear infinite",
        }}>
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={i}
              className="whitespace-nowrap text-sm font-semibold text-[#E8EDF5]/20 tracking-[0.15em] uppercase shrink-0"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {logo}
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="bg-[#050C1A] scan-grid py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Why EEOS</div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-[#E8EDF5] tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Intelligence that operates
              <br />
              <span className="gradient-text">at executive speed</span>
            </h2>
            <p className="text-lg text-[#E8EDF5]/60 max-w-2xl mx-auto">
              EEOS doesn't just report what happened — it tells you what to do next, and why it matters now.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUE_PROPS.map((prop, i) => (
              <AnimatedSection key={prop.title} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 h-full hover:border-[rgba(0,212,200,0.3)] transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center mb-4 group-hover:bg-[rgba(0,212,200,0.15)] transition-colors">
                    <prop.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <h3
                    className="text-lg font-semibold text-[#E8EDF5] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {prop.title}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{prop.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section className="bg-[#0A1628] py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="section-label mb-4">Executive Dashboard</div>
              <h2
                className="text-4xl font-bold text-[#E8EDF5] tracking-tight mb-6"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                See everything.
                <br />
                <span className="gradient-text">Decide faster.</span>
              </h2>
              <p className="text-[#E8EDF5]/65 leading-relaxed mb-8">
                The EEOS Executive Dashboard delivers a real-time command view of your entire organization — from financial performance to talent risk, supply chain health to strategic momentum — in a single, actionable interface.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Real-time KPI synthesis across all departments",
                  "AI-prioritized action queue for the CEO",
                  "Risk signals surfaced before they become crises",
                  "Strategic alignment scoring across business units",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ChevronRight className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#E8EDF5]/70">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Experience the Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgba(0,212,200,0.08)] to-transparent" />
                <img
                  src="/manus-storage/eeos-demo-dashboard_bc692339.png"
                  alt="EEOS Executive Dashboard"
                  className="w-full rounded-2xl border border-[rgba(0,212,200,0.15)] shadow-[0_0_60px_rgba(0,212,200,0.1)]"
                />
                {/* Floating metric badges */}
                <div className="absolute -top-4 -right-4 glass-card rounded-lg px-4 py-2.5 animate-float">
                  <div className="text-xs text-[#E8EDF5]/50 mb-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Revenue YTD</div>
                  <div className="text-lg font-bold text-[#00D4C8]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$6.2B</div>
                  <div className="text-xs text-[#10B981]">↑ +12.4%</div>
                </div>
                <div className="absolute -bottom-4 -left-4 glass-card rounded-lg px-4 py-2.5 animate-float" style={{ animationDelay: "1s" }}>
                  <div className="text-xs text-[#E8EDF5]/50 mb-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>Priorities Active</div>
                  <div className="text-lg font-bold text-[#F59E0B]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>5</div>
                  <div className="text-xs text-[#E8EDF5]/50">1 Critical</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── KNOWLEDGE GRAPH PREVIEW ── */}
      <section className="bg-[#050C1A] py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection delay={200} className="order-2 lg:order-1">
              <div className="relative">
                <img
                  src="/manus-storage/eeos-knowledge-graph_63f83141.png"
                  alt="EEOS Knowledge Graph"
                  className="w-full rounded-2xl border border-[rgba(0,212,200,0.15)] shadow-[0_0_60px_rgba(0,212,200,0.08)]"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#050C1A]/40 to-transparent pointer-events-none" />
              </div>
            </AnimatedSection>

            <AnimatedSection className="order-1 lg:order-2">
              <div className="section-label mb-4">Knowledge Graph</div>
              <h2
                className="text-4xl font-bold text-[#E8EDF5] tracking-tight mb-6"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your organization,
                <br />
                <span className="gradient-text">mapped in real time.</span>
              </h2>
              <p className="text-[#E8EDF5]/65 leading-relaxed mb-6">
                EEOS builds a living knowledge graph of your entire organization — mapping relationships between people, departments, systems, risks, and opportunities. See how everything connects, and where the critical paths run.
              </p>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:gap-3 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Explore all features
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="section-label mb-6">Activate EEOS</div>
            <h2
              className="text-4xl sm:text-5xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Ready to operate at a
              <br />
              <span className="gradient-text">higher level of intelligence?</span>
            </h2>
            <p className="text-lg text-[#E8EDF5]/60 mb-10 max-w-2xl mx-auto">
              Join the executives who have transformed how they lead. EEOS is live in 6 weeks — from onboarding to full organizational intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Begin Activation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Schedule a Briefing
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
