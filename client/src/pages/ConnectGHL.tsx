// EEOS Connect GoHighLevel — Customer Journey Page
// Sovereign Night Design System
// Explains how EEOS connects to GoHighLevel and guides customers through the process

import { Link } from "wouter";
import {
  ArrowRight, Zap, Shield, CheckCircle, Lock, Eye, Database,
  RefreshCw, AlertCircle, ChevronRight, Building2, Users, BarChart3,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const STEPS = [
  {
    step: "01",
    title: "Tell us about your business",
    description: "Complete a brief 8-step onboarding wizard. We collect your company profile, departments, goals, and KPIs — no technical setup required.",
    action: "Start Onboarding →",
    href: "/onboarding",
    color: "#00D4C8",
  },
  {
    step: "02",
    title: "Connect GoHighLevel",
    description: "Authorize EEOS to read your GoHighLevel account using a secure OAuth connection. We request read-only access to contacts, pipelines, campaigns, and reporting data.",
    action: "Authorize Connection →",
    href: "/api/integrations/gohighlevel/oauth/start",
    color: "#6366F1",
    highlight: true,
  },
  {
    step: "03",
    title: "EEOS maps your business",
    description: "Within 24 hours, EEOS builds your Business DNA — a living model of your pipeline health, customer acquisition patterns, team performance, and growth opportunities.",
    action: "See what gets mapped →",
    href: "/features",
    color: "#10B981",
  },
  {
    step: "04",
    title: "Receive executive recommendations",
    description: "Your Executive Dashboard goes live. EEOS surfaces prioritized recommendations every morning — what to act on, what to watch, and what to delegate.",
    action: "View the demo →",
    href: "/demo",
    color: "#F59E0B",
  },
];

const GHL_SIGNALS = [
  { icon: Users, label: "Contact & Lead Data", description: "Pipeline stages, lead sources, conversion rates" },
  { icon: BarChart3, label: "Campaign Performance", description: "Email opens, funnel metrics, ad attribution" },
  { icon: Building2, label: "Pipeline Health", description: "Deal velocity, close rates, revenue forecasts" },
  { icon: RefreshCw, label: "Automation Activity", description: "Workflow triggers, follow-up sequences, task completion" },
];

const SECURITY_POINTS = [
  { icon: Lock, text: "Read-only OAuth — EEOS never writes to your GoHighLevel account" },
  { icon: Eye, text: "You see exactly what data EEOS reads, always" },
  { icon: Shield, text: "SOC 2 Type II certified infrastructure — your data stays in your control" },
  { icon: Database, text: "Zero data replication — signals are processed, not stored" },
  { icon: CheckCircle, text: "Revoke access instantly at any time from your GoHighLevel settings" },
  { icon: AlertCircle, text: "All connections are encrypted end-to-end with AES-256" },
];

const WHAT_EEOS_DOES = [
  {
    title: "Reads approved signals",
    items: ["Pipeline stage changes", "Lead source attribution", "Campaign engagement rates", "Revenue forecasts", "Team activity metrics"],
    color: "#00D4C8",
  },
  {
    title: "Never touches",
    items: ["Contact personal data beyond business context", "Payment or billing information", "Private messages or conversations", "Any data outside your authorized scope"],
    color: "#EF4444",
    negative: true,
  },
];

export default function ConnectGHL() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* ── HERO ── */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20 bg-[#050C1A] scan-grid relative overflow-hidden">
        <div
          className="absolute right-0 top-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,212,200,0.07) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] animate-pulse" />
                <span className="section-label">Connect Your Business</span>
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6 leading-[1.05]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Connect GoHighLevel.
                <br />
                <span className="gradient-text">Unlock executive clarity.</span>
              </h1>
              <p className="text-lg text-[#E8EDF5]/65 leading-relaxed mb-8">
                EEOS connects to your GoHighLevel account, reads the signals that matter, and turns them into executive-grade recommendations — so you lead with intelligence, not guesswork.
              </p>

              {/* Key explanation box */}
              <div className="p-5 rounded-xl border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.04)] mb-8">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-[#00D4C8] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#E8EDF5] mb-1">How it works in plain terms</p>
                    <p className="text-sm text-[#E8EDF5]/65 leading-relaxed">
                      EEOS connects to your business systems, reads approved signals, and turns them into executive recommendations — without storing your data or requiring any technical setup.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_28px_rgba(0,212,200,0.45)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Start Private Beta
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                </Link>
              </div>
            </div>

            {/* GHL Signal Preview Card */}
            <AnimatedSection delay={200} className="shrink-0 w-full lg:w-80">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[rgba(0,212,200,0.1)] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#00D4C8] tracking-[0.15em] uppercase mb-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      GoHighLevel → EEOS
                    </div>
                    <div className="text-sm font-semibold text-[#E8EDF5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Live Signal Feed
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[10px] text-[#10B981]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>ACTIVE</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { label: "Pipeline Value", value: "$2.4M", delta: "+18%", up: true },
                    { label: "Lead Conversion", value: "23.7%", delta: "+4.2pts", up: true },
                    { label: "Campaign ROI", value: "340%", delta: "+12%", up: true },
                    { label: "Churn Risk", value: "Medium", delta: "2 accounts", up: false },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-center justify-between">
                      <span className="text-xs text-[#E8EDF5]/50"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {metric.label}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#E8EDF5]"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {metric.value}
                        </div>
                        <div className={`text-[10px] ${metric.up ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                          {metric.delta}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-[rgba(0,212,200,0.04)] border-t border-[rgba(0,212,200,0.1)]">
                  <div className="text-[10px] text-[#E8EDF5]/35 text-center"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Demonstration data only · Read-only connection
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── HOW TO CONNECT ── */}
      <section className="bg-[#0A1628] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-14">
            <div className="section-label mb-3">Connection Journey</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              From sign-up to intelligence
              <br />
              <span className="gradient-text">in four steps.</span>
            </h2>
          </AnimatedSection>

          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 100}>
                <div className={`glass-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-all duration-300 hover:border-[rgba(0,212,200,0.25)] ${step.highlight ? "border-[rgba(99,102,241,0.35)] bg-[rgba(99,102,241,0.04)]" : ""}`}>
                  <div
                    className="text-3xl sm:text-4xl font-bold shrink-0 w-12 sm:w-16 text-center"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: `${step.color}40` }}
                  >
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-lg font-semibold text-[#E8EDF5]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {step.title}
                      </h3>
                      {step.highlight && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[rgba(99,102,241,0.2)] text-[#6366F1] border border-[rgba(99,102,241,0.3)]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          GoHighLevel
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{step.description}</p>
                  </div>
                  {step.href.startsWith("/api/") ? (
                    <a
                      href={step.href}
                      className="shrink-0 flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 hover:gap-2.5"
                      style={{ color: step.color, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {step.action}
                    </a>
                  ) : (
                    <Link
                      href={step.href}
                      className="shrink-0 flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 hover:gap-2.5"
                      style={{ color: step.color, fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {step.action}
                    </Link>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT EEOS READS ── */}
      <section className="bg-[#050C1A] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-14">
            <div className="section-label mb-3">Signal Transparency</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Exactly what EEOS reads
              <br />
              <span className="gradient-text">from GoHighLevel.</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {WHAT_EEOS_DOES.map((section) => (
              <AnimatedSection key={section.title}>
                <div className={`glass-card rounded-2xl p-6 sm:p-8 h-full ${section.negative ? "border-[rgba(239,68,68,0.15)]" : ""}`}>
                  <div className="flex items-center gap-2 mb-5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: section.color }}
                    />
                    <h3
                      className="text-base font-semibold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: section.color }}
                    >
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        {section.negative ? (
                          <div className="w-4 h-4 rounded-full bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center mt-0.5 shrink-0">
                            <div className="w-1.5 h-0.5 bg-[#EF4444] rounded" />
                          </div>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                        )}
                        <span className="text-sm text-[#E8EDF5]/65 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* GHL Signal Types */}
          <AnimatedSection>
            <div className="section-label mb-5">GoHighLevel Data Signals</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GHL_SIGNALS.map((signal, i) => (
                <AnimatedSection key={signal.label} delay={i * 80}>
                  <div className="glass-card rounded-xl p-5 hover:border-[rgba(0,212,200,0.25)] transition-all duration-300">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] flex items-center justify-center mb-3">
                      <signal.icon className="w-4.5 h-4.5 text-[#00D4C8]" />
                    </div>
                    <div className="text-sm font-semibold text-[#E8EDF5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {signal.label}
                    </div>
                    <div className="text-xs text-[#E8EDF5]/50 leading-relaxed">{signal.description}</div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SECURITY ASSURANCE ── */}
      <section className="bg-[#0A1628] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <AnimatedSection className="flex-1">
              <div className="section-label mb-3">Security Assurance</div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-5 leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your data stays
                <br />
                <span className="gradient-text">in your control. Always.</span>
              </h2>
              <p className="text-[#E8EDF5]/60 leading-relaxed mb-8 text-sm sm:text-base">
                EEOS was designed from the ground up for enterprise security. We operate on a zero-trust, read-only connector model — meaning we read signals, not store data.
              </p>
              <Link
                href="/security"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:gap-3 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Read our full security documentation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </AnimatedSection>

            <AnimatedSection delay={200} className="flex-1 w-full">
              <div className="space-y-3">
                {SECURITY_POINTS.map((point, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-xl border border-[rgba(0,212,200,0.1)] bg-[rgba(0,212,200,0.03)] hover:border-[rgba(0,212,200,0.2)] transition-all duration-200"
                  >
                    <point.icon className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#E8EDF5]/70 leading-relaxed">{point.text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#050C1A] border-t border-[rgba(0,212,200,0.1)] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20">
              <div className="flex-1">
                <div className="section-label mb-3">Begin Activation</div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-4 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Connect your GoHighLevel.
                  <br />
                  <span className="gradient-text">Go live in 6 weeks.</span>
                </h2>
                <p className="text-[#E8EDF5]/55 max-w-lg text-sm sm:text-base leading-relaxed">
                  Private Beta is now open for qualifying businesses. No technical setup required — just your GoHighLevel credentials and 20 minutes for onboarding.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
                <Link
                  href="/onboarding"
                  className="flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_28px_rgba(0,212,200,0.45)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Start Private Beta
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                </Link>
                <Link
                  href="/security"
                  className="flex items-center justify-center gap-2 px-8 py-3 text-sm text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80 transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Review security documentation
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
