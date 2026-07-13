// EEOS Customer Experience — Home Page
// Eagle Eye Automation company positioning + EEOS as flagship product
// "Transcend Your Business. Stop managing. Start leading."
// Sovereign Night — aerospace command interface

import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  ArrowRight, Play, ChevronRight, Zap, Shield, Brain,
  BarChart3, Globe, Users, Database, Eye, Cpu, Lock,
  TrendingUp, Lightbulb, Target,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";

const STATS = [
  { value: 340, suffix: "%", label: "Average ROI" },
  { value: 6, suffix: " weeks", label: "Time to Value" },
  { value: 42, suffix: "+", label: "Service Businesses" },
  { value: 98, suffix: "%", label: "Retention Rate" },
];

const VALUE_PROPS = [
  {
    icon: Brain,
    title: "Executive Intelligence",
    description: "EEOS synthesizes data from every corner of your business into clear, actionable intelligence — delivered before you need to ask.",
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
    description: "Connect every system your business runs — CRM, HR, finance, operations — into one unified intelligence layer.",
  },
  {
    icon: BarChart3,
    title: "Business DNA Mapping",
    description: "EEOS builds a living model of your business's strengths, risks, and strategic momentum — updated in real time.",
  },
  {
    icon: Users,
    title: "Built for Business Owners",
    description: "Designed for founders, operators, and their leadership teams. No dashboards to configure. No data science required. Just intelligence.",
  },
];

const LOGOS = [
  "MERIDIAN STAFFING", "APEX SERVICES", "NORTHSTAR CONSULTING", "VANTAGE HEALTH",
  "SUMMIT OPERATIONS", "PINNACLE STAFFING", "SOVEREIGN SERVICES", "ATLAS GROUP",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Database,
    title: "Connects to your business systems",
    description: "EEOS uses read-only connectors to securely link your existing software — CRM, ERP, HR, finance, and operations platforms. No data is copied or stored.",
    color: "#00D4C8",
  },
  {
    step: "02",
    icon: Eye,
    title: "Reads approved signals",
    description: "Our intelligence engine monitors the signals you authorize — KPIs, alerts, trends, and anomalies — across every connected system in real time.",
    color: "#6366F1",
  },
  {
    step: "03",
    icon: Cpu,
    title: "Turns them into executive recommendations",
    description: "EEOS synthesizes every signal into prioritized, context-rich recommendations delivered directly to your executive dashboard. No noise. Just decisions.",
    color: "#10B981",
  },
];

// The transformation narrative — what business owners move from and to
const TRANSFORMATION = [
  {
    from: "Reacting to yesterday's problems",
    to: "Making tomorrow's decisions with confidence",
    icon: Target,
  },
  {
    from: "Buried in reports and dashboards",
    to: "One clear view of what matters most",
    icon: Eye,
  },
  {
    from: "Managing the business",
    to: "Leading the business",
    icon: TrendingUp,
  },
  {
    from: "Guessing what to prioritize",
    to: "Acting on AI-ranked recommendations",
    icon: Lightbulb,
  },
];

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="/manus-storage/eeos-hero-bg_c4a9cb00.png"
            alt=""
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 scan-grid opacity-30" />
        </div>

        {/* Teal glow */}
        <div
          className="absolute right-[5%] top-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,212,200,0.10) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="max-w-3xl">

            {/* Company badge */}
            <div className="flex items-center gap-3 mb-8 animate-fade-up">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.06)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] animate-pulse" />
                <span className="section-label text-[10px]">Eagle Eye Automation — AI Software for Service Businesses</span>
              </div>
            </div>

            {/* Primary headline — the transcendence message */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#E8EDF5] leading-[1.05] tracking-tight mb-4 animate-fade-up"
              style={{ fontFamily: "'Space Grotesk', sans-serif", animationDelay: "100ms" }}
            >
              Transcend Your
              <br />
              Business.
            </h1>
            <p
              className="text-2xl sm:text-3xl font-semibold text-[#E8EDF5]/70 mb-6 animate-fade-up"
              style={{ fontFamily: "'Space Grotesk', sans-serif", animationDelay: "150ms" }}
            >
              Stop managing.{" "}
              <span className="gradient-text">Start leading.</span>
            </p>

            {/* The core explanation */}
            <div className="mb-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
                <p className="text-base sm:text-lg text-[#E8EDF5]/65 leading-relaxed max-w-2xl mb-5">
                  Eagle Eye Automation builds AI software that helps service businesses grow. Our flagship product, <span className="text-[#00D4C8] font-semibold">EEOS</span>, transforms your business data into accurate executive intelligence — helping leaders move beyond reacting to today's problems and begin making tomorrow's decisions with confidence.
                </p>
              <div className="flex items-start gap-3 p-4 rounded-xl border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.04)]">
                <Lock className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <p className="text-sm text-[#E8EDF5]/75 leading-relaxed">
                  <span className="text-[#00D4C8] font-semibold">How EEOS works:</span> Connects to your business systems, reads approved signals, and turns them into executive recommendations — all without storing your data.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <Link
                href="/connect-ghl"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_28px_rgba(0,212,200,0.45)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-4 h-4" />
                Start Private Beta
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] hover:border-[rgba(0,212,200,0.6)] active:scale-[0.97] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Play className="w-4 h-4" />
                Request Demo
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-[#E8EDF5]/70 hover:text-[#E8EDF5] active:scale-[0.97] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Connect Your Business
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust signals */}
            <div
              className="flex flex-wrap items-center gap-4 sm:gap-6 mt-10 animate-fade-up"
              style={{ animationDelay: "400ms" }}
            >
              {["SOC 2 Type II", "ISO 27001", "FedRAMP Ready", "Service Business Specialists"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[#00D4C8]" />
                  <span
                    className="text-xs text-[#E8EDF5]/45 tracking-wide"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float hidden sm:flex">
          <div className="w-px h-12 bg-gradient-to-b from-[rgba(0,212,200,0.6)] to-transparent" />
          <span
            className="text-[10px] text-[#00D4C8] tracking-[0.2em] uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Scroll
          </span>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#0A1628] border-y border-[rgba(0,212,200,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100} className="text-center">
                <div
                  className="text-3xl sm:text-4xl font-bold text-[#00D4C8] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <div
                  className="text-xs text-[#E8EDF5]/50 tracking-wide"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {stat.label}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE TRANSFORMATION ── */}
      <section className="bg-[#050C1A] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-14">
            <div className="section-label mb-3">The Shift</div>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight leading-tight max-w-xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                From reactive operator
                <br />
                <span className="gradient-text">to confident leader.</span>
              </h2>
              <p className="text-[#E8EDF5]/55 max-w-sm text-sm leading-relaxed lg:text-right">
                EEOS doesn't just report what happened — it tells you what to do next, and why it matters now.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRANSFORMATION.map((item, i) => (
              <AnimatedSection key={item.from} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 h-full group hover:border-[rgba(0,212,200,0.3)] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.18)] flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-[#00D4C8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Before */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold text-[#EF4444]/60 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BEFORE</span>
                        <div className="flex-1 h-px bg-[rgba(239,68,68,0.15)]" />
                      </div>
                      <p className="text-sm text-[#E8EDF5]/40 line-through mb-3 leading-snug">{item.from}</p>
                      {/* After */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold text-[#00D4C8]/70 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WITH EEOS</span>
                        <div className="flex-1 h-px bg-[rgba(0,212,200,0.2)]" />
                      </div>
                      <p className="text-sm font-semibold text-[#E8EDF5] leading-snug">{item.to}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#0A1628] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-14">
            <div className="section-label mb-3">How EEOS Works</div>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight leading-tight max-w-xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Three steps from
                <br />
                <span className="gradient-text">data to decision.</span>
              </h2>
              <p className="text-[#E8EDF5]/55 max-w-sm text-sm leading-relaxed lg:text-right">
                EEOS connects to your business systems, reads approved signals, and turns them into executive recommendations.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-12 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-gradient-to-r from-[rgba(0,212,200,0.3)] via-[rgba(99,102,241,0.3)] to-[rgba(16,185,129,0.3)]" />

            {HOW_IT_WORKS.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 120}>
                <div className="relative glass-card rounded-2xl p-6 sm:p-8 h-full group hover:border-[rgba(0,212,200,0.3)] transition-all duration-300">
                  <div
                    className="text-[10px] font-bold tracking-[0.2em] mb-4"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: step.color }}
                  >
                    STEP {step.step}
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                  >
                    <step.icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <h3
                    className="text-lg font-semibold text-[#E8EDF5] mb-3 leading-snug"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{step.description}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="md:hidden flex justify-center mt-6">
                      <ArrowRight className="w-5 h-5 text-[#00D4C8]/40 rotate-90" />
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={400} className="mt-10 text-center">
            <Link
              href="/integrations"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:gap-3 transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              See all integrations and security details
              <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── LOGO MARQUEE ── */}
      <section className="bg-[#050C1A] border-t border-[rgba(0,212,200,0.06)] py-10 overflow-hidden">
        <p
          className="text-center text-[10px] text-[#E8EDF5]/25 tracking-[0.2em] uppercase mb-6"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Trusted by service businesses across industries
        </p>
        <div
          className="flex gap-16 items-center"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={i}
              className="whitespace-nowrap text-sm font-semibold text-[#E8EDF5]/18 tracking-[0.15em] uppercase shrink-0"
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
      <section className="bg-[#050C1A] scan-grid py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-14">
            <div className="section-label mb-3">Why EEOS</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Intelligence that operates
              <br />
              <span className="gradient-text">at the speed of leadership</span>
            </h2>
            <p className="text-[#E8EDF5]/55 max-w-lg text-sm leading-relaxed">
              EEOS doesn't just report what happened — it tells you what to do next, and why it matters now.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUE_PROPS.map((prop, i) => (
              <AnimatedSection key={prop.title} delay={i * 70}>
                <div className="glass-card rounded-xl p-6 h-full hover:border-[rgba(0,212,200,0.3)] transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.18)] flex items-center justify-center mb-4 group-hover:bg-[rgba(0,212,200,0.14)] transition-colors">
                    <prop.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <h3
                    className="text-base font-semibold text-[#E8EDF5] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {prop.title}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/58 leading-relaxed">{prop.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section className="bg-[#0A1628] py-20 sm:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <div className="section-label mb-4">EEOS — Executive Dashboard</div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                See everything.
                <br />
                <span className="gradient-text">Decide faster.</span>
              </h2>
              <p className="text-[#E8EDF5]/62 leading-relaxed mb-6 text-sm sm:text-base">
                The EEOS Executive Dashboard delivers a real-time command view of your entire business — from financial performance to team utilization, pipeline health to strategic momentum — in a single, actionable interface.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Real-time KPI synthesis across all departments",
                  "AI-prioritized action queue for the business owner",
                  "Risk signals surfaced before they become crises",
                  "Strategic alignment scoring across business units",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ChevronRight className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#E8EDF5]/68">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/connect-ghl"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Start Private Beta
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgba(0,212,200,0.08)] to-transparent" />
                <img
                  src="/manus-storage/eeos-demo-dashboard_bc692339.png"
                  alt="EEOS Executive Dashboard"
                  className="w-full rounded-2xl border border-[rgba(0,212,200,0.15)] shadow-[0_0_60px_rgba(0,212,200,0.1)]"
                />
                <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 glass-card rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 animate-float">
                  <div className="text-[10px] text-[#E8EDF5]/50 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Revenue YTD</div>
                  <div className="text-base sm:text-lg font-bold text-[#00D4C8]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$4.2M</div>
                  <div className="text-xs text-[#10B981]">↑ +18.4%</div>
                </div>
                <div className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-4 glass-card rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 animate-float" style={{ animationDelay: "1s" }}>
                  <div className="text-[10px] text-[#E8EDF5]/50 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Priorities Active</div>
                  <div className="text-base sm:text-lg font-bold text-[#F59E0B]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>5</div>
                  <div className="text-xs text-[#E8EDF5]/50">1 Critical</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── KNOWLEDGE GRAPH PREVIEW ── */}
      <section className="bg-[#050C1A] py-20 sm:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
              <div className="section-label mb-4">Business DNA</div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your business,
                <br />
                <span className="gradient-text">mapped in real time.</span>
              </h2>
              <p className="text-[#E8EDF5]/62 leading-relaxed mb-6 text-sm sm:text-base">
                EEOS builds a living knowledge graph of your entire business — mapping relationships between people, departments, systems, risks, and opportunities. See how everything connects, and where the critical paths run.
              </p>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:gap-3 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Explore all EEOS features
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#0A1628] border-t border-[rgba(0,212,200,0.1)] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20">
              <div className="flex-1">
                {/* Company attribution */}
                <div className="text-[10px] text-[#E8EDF5]/30 tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Eagle Eye Automation · Flagship Product
                </div>
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#E8EDF5] tracking-tight mb-4 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Ready to transcend
                  <br />
                  <span className="gradient-text">your business?</span>
                </h2>
                <p className="text-[#E8EDF5]/55 max-w-lg text-sm sm:text-base leading-relaxed">
                  Join the service business owners who have moved beyond managing and started leading. EEOS is live in 6 weeks — from onboarding to full organizational intelligence.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
                <Link
                  href="/connect-ghl"
                  className="flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_28px_rgba(0,212,200,0.45)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Start Private Beta
                </Link>
                <Link
                  href="/demo"
                  className="flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                </Link>
                <Link
                  href="/onboarding"
                  className="flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-[#E8EDF5]/60 hover:text-[#E8EDF5] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Connect Your Business
                  <ArrowRight className="w-4 h-4" />
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
