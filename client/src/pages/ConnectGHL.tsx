// EEOS — Connect GoHighLevel Page
// Sovereign Night Design System
// Sprint 11: Live GHL connection screen with OAuth flow entry point

import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Zap, Shield, CheckCircle2, Lock, Eye, Database,
  RefreshCw, Users, BarChart3, Building2, ChevronRight, Activity,
  Plug, Globe, AlertCircle
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const GHL_SIGNALS = [
  { icon: Users, label: "Contacts & Leads", description: "Pipeline stages, lead sources, conversion rates, contact history" },
  { icon: BarChart3, label: "Campaign Performance", description: "Email opens, funnel metrics, ad attribution, ROI tracking" },
  { icon: Building2, label: "Pipeline Health", description: "Deal velocity, close rates, revenue forecasts, stage distribution" },
  { icon: RefreshCw, label: "Automation Activity", description: "Workflow triggers, follow-up sequences, task completion rates" },
  { icon: Globe, label: "Location & Sub-Account Data", description: "Multi-location performance, sub-account health, regional trends" },
  { icon: Activity, label: "Reporting & Analytics", description: "Custom reports, dashboard metrics, performance benchmarks" },
];

const SECURITY_POINTS = [
  { icon: Lock, text: "Read-only OAuth — EEOS never writes to your GoHighLevel account" },
  { icon: Eye, text: "Transparent signal access — you see exactly what EEOS reads" },
  { icon: Shield, text: "SOC 2 Type II certified infrastructure — your data stays in your control" },
  { icon: Database, text: "Zero data retention — signals are processed in real time, never stored" },
];

const STEPS = [
  {
    step: "01",
    title: "Complete your business profile",
    description: "Tell EEOS about your organization — industry, departments, goals, and KPIs. Takes 5 minutes.",
    cta: "Start Profile",
    href: "/onboarding",
    done: false,
  },
  {
    step: "02",
    title: "Authorize GoHighLevel",
    description: "Click 'Connect GoHighLevel' below. You'll be redirected to GoHighLevel to grant read-only access. No passwords shared with EEOS.",
    cta: "Connect GoHighLevel",
    href: "#connect",
    done: false,
    primary: true,
  },
  {
    step: "03",
    title: "EEOS maps your business",
    description: "Within 24 hours, EEOS builds your Business DNA from your live GHL signals — pipeline health, campaign performance, and growth opportunities.",
    cta: "See what gets mapped",
    href: "/features",
    done: false,
  },
  {
    step: "04",
    title: "Executive Dashboard goes live",
    description: "Receive prioritized executive recommendations every morning — what to act on, what to watch, what to delegate.",
    cta: "Preview the dashboard",
    href: "/demo",
    done: false,
  },
];

export default function ConnectGHL() {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate OAuth redirect initiation — in production this would redirect to GHL OAuth
    setTimeout(() => {
      window.location.href = "/oauth-success?provider=gohighlevel&status=demo";
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-[#050C1A] scan-grid relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #00D4C8 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            {/* Left — headline */}
            <div className="flex-1 max-w-2xl">
              <AnimatedSection>
                <div className="flex items-center gap-3 mb-6">
                  <div className="section-label">GoHighLevel Integration</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[10px] font-semibold text-[#10B981]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIVE CONNECTION AVAILABLE</span>
                  </div>
                </div>
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#E8EDF5] tracking-tight leading-[1.05] mb-6"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Connect your
                  <br />
                  <span className="gradient-text">GoHighLevel</span>
                  <br />
                  account to EEOS.
                </h1>
                <p className="text-lg text-[#E8EDF5]/65 leading-relaxed mb-8 max-w-xl">
                  Connect your business systems. EEOS turns approved signals into executive recommendations — giving you clarity, speed, and decisive advantage.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_28px_rgba(0,212,200,0.4)] disabled:opacity-70 disabled:cursor-wait"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Initiating OAuth…
                      </>
                    ) : (
                      <>
                        <Plug className="w-5 h-5" />
                        Connect GoHighLevel
                      </>
                    )}
                  </button>
                  <Link
                    href="/integration-health"
                    className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <Activity className="w-4 h-4" />
                    View Integration Health
                  </Link>
                </div>

                <div className="flex items-center gap-2 mt-5 text-xs text-[#E8EDF5]/40"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <Lock className="w-3 h-3 text-[#00D4C8]" />
                  <span>Read-only OAuth · No passwords shared · Revoke anytime from GoHighLevel</span>
                </div>
              </AnimatedSection>
            </div>

            {/* Right — live connection status card */}
            <AnimatedSection delay={200} className="w-full lg:w-96 shrink-0">
              <div className="glass-card rounded-2xl p-6 border border-[rgba(0,212,200,0.15)]">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,200,0.1)] flex items-center justify-center">
                      <Plug className="w-4 h-4 text-[#00D4C8]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#E8EDF5]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>GoHighLevel</div>
                      <div className="text-[10px] text-[#E8EDF5]/40"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>CRM & MARKETING PLATFORM</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-[10px] font-semibold text-[#F59E0B]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>NOT CONNECTED</span>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {[
                    { label: "OAuth Status", value: "Awaiting authorization", color: "#F59E0B" },
                    { label: "Signal Access", value: "Pending connection", color: "#E8EDF5" },
                    { label: "Last Sync", value: "Never", color: "#E8EDF5" },
                    { label: "Data Retention", value: "Zero — real-time only", color: "#10B981" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-[rgba(0,212,200,0.06)]">
                      <span className="text-xs text-[#E8EDF5]/45"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.label}</span>
                      <span className="text-xs font-medium" style={{ color: row.color,
                        fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_16px_rgba(0,212,200,0.3)] disabled:opacity-70"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {connecting ? "Connecting…" : "Authorize Connection"}
                </button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How it works — 4 steps */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-12">
            <div className="section-label mb-3">Connection Process</div>
            <h2 className="text-3xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              From connection to intelligence in 4 steps.
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <AnimatedSection key={s.step} delay={i * 80}>
                <div className={`glass-card rounded-xl p-6 h-full flex flex-col ${s.primary ? "border-[rgba(0,212,200,0.35)] shadow-[0_0_24px_rgba(0,212,200,0.1)]" : ""}`}>
                  <div className="text-3xl font-bold mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: s.primary ? "#00D4C8" : "rgba(232,237,245,0.2)" }}>
                    {s.step}
                  </div>
                  <h3 className="text-base font-semibold text-[#E8EDF5] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</h3>
                  <p className="text-sm text-[#E8EDF5]/55 leading-relaxed flex-1 mb-4">{s.description}</p>
                  {s.primary ? (
                    <button
                      onClick={handleConnect}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] px-4 py-2 rounded-lg hover:bg-[#00E8DB] transition-all duration-200 w-fit"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Plug className="w-3.5 h-3.5" />
                      {s.cta}
                    </button>
                  ) : (
                    <Link href={s.href}
                      className="flex items-center gap-1 text-xs font-semibold text-[#00D4C8] hover:text-[#00E8DB] transition-colors duration-200"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Signals EEOS reads */}
      <section className="bg-[#050C1A] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-12">
            <div className="section-label mb-3">Signal Access</div>
            <h2 className="text-3xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              What EEOS reads from GoHighLevel.
            </h2>
            <p className="text-[#E8EDF5]/55 mt-3 max-w-xl">
              EEOS requests read-only access to the following signal categories. You can review and revoke access at any time from your GoHighLevel account settings.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GHL_SIGNALS.map((sig, i) => (
              <AnimatedSection key={sig.label} delay={i * 60}>
                <div className="glass-card rounded-xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] flex items-center justify-center shrink-0">
                    <sig.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#E8EDF5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{sig.label}</div>
                    <div className="text-xs text-[#E8EDF5]/50 leading-relaxed">{sig.description}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Security guarantees */}
      <section className="bg-[#0A1628] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="glass-card rounded-2xl p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-[#00D4C8]" />
                <h3 className="text-xl font-bold text-[#E8EDF5]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Your data never leaves your control.
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {SECURITY_POINTS.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,200,0.08)] flex items-center justify-center shrink-0 mt-0.5">
                      <pt.icon className="w-4 h-4 text-[#00D4C8]" />
                    </div>
                    <p className="text-sm text-[#E8EDF5]/65 leading-relaxed">{pt.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConnect}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Plug className="w-4 h-4" />
                  Connect GoHighLevel
                </button>
                <Link href="/security"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Read our Security Policy
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
