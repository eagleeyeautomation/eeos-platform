// EEOS Integration Readiness Page — Sovereign Night Design System
// Explains how EEOS securely connects to customer software

import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Shield, Lock, Eye, Zap, CheckCircle2, ChevronRight,
  Database, Cloud, Code, RefreshCw, Server
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { INTEGRATIONS } from "@/lib/demo-data";

const CONNECTION_STEPS = [
  {
    step: "01",
    title: "Discovery & Mapping",
    description: "Your EEOS activation specialist conducts a technical discovery session to map your existing systems, data sources, and organizational structure.",
    icon: Eye,
    duration: "Week 1",
  },
  {
    step: "02",
    title: "Connector Configuration",
    description: "EEOS configures read-only API connectors to each of your systems. No data is extracted — only metadata and signal patterns are analyzed.",
    icon: Code,
    duration: "Week 2–3",
  },
  {
    step: "03",
    title: "Data Validation",
    description: "Our team validates signal quality and accuracy across all connected systems. You review and approve the intelligence model before activation.",
    icon: CheckCircle2,
    duration: "Week 4",
  },
  {
    step: "04",
    title: "Intelligence Activation",
    description: "EEOS goes live. Your Executive Dashboard populates in real time. Your team receives training on all platform features.",
    icon: Zap,
    duration: "Week 5–6",
  },
];

const SECURITY_PRINCIPLES = [
  {
    icon: Eye,
    title: "Read-Only Access",
    description: "EEOS connectors are strictly read-only. We never write to, modify, or delete data in your source systems. Your operational data is never touched.",
  },
  {
    icon: Database,
    title: "No Data Replication",
    description: "We do not copy or store your underlying business data. EEOS processes signals in real time and retains only derived intelligence — not source records.",
  },
  {
    icon: Lock,
    title: "Encrypted Channels",
    description: "All connector communications use TLS 1.3 with certificate pinning. Data in transit is encrypted end-to-end with no plaintext exposure.",
  },
  {
    icon: Shield,
    title: "Least Privilege",
    description: "Each connector is granted the minimum permissions required for its function. No connector has access beyond its designated data scope.",
  },
  {
    icon: Cloud,
    title: "Data Residency",
    description: "Intelligence processing occurs in your designated region. We support US, EU, UK, and APAC data residency requirements.",
  },
  {
    icon: RefreshCw,
    title: "Revocable Access",
    description: "You can revoke any connector's access at any time through the EEOS admin console. Disconnection takes effect within 60 seconds.",
  },
];

const CONNECTOR_TYPES = [
  {
    type: "REST API",
    description: "Direct API integration with modern cloud platforms",
    protocols: ["OAuth 2.0", "API Key", "JWT"],
    latency: "Real-time",
    examples: ["Salesforce", "Workday", "ServiceNow"],
  },
  {
    type: "Database Connector",
    description: "Read-only database views for on-premise systems",
    protocols: ["TLS/SSL", "SSH Tunnel", "VPN"],
    latency: "Near real-time",
    examples: ["Oracle DB", "SQL Server", "PostgreSQL"],
  },
  {
    type: "File/Batch",
    description: "Scheduled file-based data exchange for legacy systems",
    protocols: ["SFTP", "S3", "Azure Blob"],
    latency: "Scheduled",
    examples: ["Legacy ERP", "Mainframe", "Custom systems"],
  },
  {
    type: "Webhook",
    description: "Event-driven push notifications from source systems",
    protocols: ["HTTPS", "HMAC signing"],
    latency: "Instant",
    examples: ["Jira", "GitHub", "PagerDuty"],
  },
];

const CATEGORIES = ["All", "ERP", "CRM", "HR", "Finance", "Analytics", "Productivity"];

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoveredIntegration, setHoveredIntegration] = useState<string | null>(null);

  const filtered = activeCategory === "All"
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">Integration Readiness</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Connect everything.
              <br />
              <span className="gradient-text">Control everything.</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              EEOS securely connects to every system your organization runs — reading signals without storing data, maintaining complete sovereignty over your information.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Connection Architecture</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              How EEOS connects to your systems
            </h2>
          </AnimatedSection>

          {/* Architecture Diagram */}
          <AnimatedSection delay={200} className="mb-16">
            <div className="glass-card rounded-2xl p-8 overflow-x-auto">
              <div className="flex items-center justify-center gap-4 min-w-[600px]">
                {/* Your Systems */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-[#E8EDF5]/40 text-center mb-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    YOUR SYSTEMS
                  </div>
                  {["ERP", "CRM", "HR", "Finance", "Analytics"].map((sys) => (
                    <div
                      key={sys}
                      className="px-4 py-2 rounded-lg bg-[rgba(0,212,200,0.06)] border border-[rgba(0,212,200,0.15)] text-xs text-[#E8EDF5]/70 text-center"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {sys}
                    </div>
                  ))}
                </div>

                {/* Arrow + Connector Layer */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-[#E8EDF5]/40 mb-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    READ-ONLY
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-px bg-gradient-to-r from-[rgba(0,212,200,0.3)] to-[#00D4C8]" />
                    <ArrowRight className="w-4 h-4 text-[#00D4C8]" />
                  </div>
                  <div className="text-[10px] text-[#00D4C8]/60 mt-1"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    TLS 1.3 · Encrypted
                  </div>
                </div>

                {/* EEOS Connector Layer */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-[#E8EDF5]/40 mb-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    EEOS CONNECTOR LAYER
                  </div>
                  <div className="px-6 py-8 rounded-xl bg-[rgba(0,212,200,0.08)] border-2 border-[rgba(0,212,200,0.3)] text-center shadow-[0_0_24px_rgba(0,212,200,0.1)]">
                    <Server className="w-8 h-8 text-[#00D4C8] mx-auto mb-2" />
                    <div className="text-sm font-semibold text-[#00D4C8]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Signal Processor
                    </div>
                    <div className="text-xs text-[#E8EDF5]/50 mt-1">No data stored</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-[#E8EDF5]/40 mb-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    INTELLIGENCE
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-px bg-gradient-to-r from-[#00D4C8] to-[rgba(0,212,200,0.3)]" />
                    <ArrowRight className="w-4 h-4 text-[#00D4C8]" />
                  </div>
                </div>

                {/* EEOS Platform */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-[#E8EDF5]/40 mb-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    EEOS PLATFORM
                  </div>
                  <div className="px-6 py-8 rounded-xl bg-[rgba(0,212,200,0.12)] border-2 border-[#00D4C8] text-center shadow-[0_0_32px_rgba(0,212,200,0.2)]">
                    <img
                      src="/manus-storage/eeos-logo-mark_707d59ff.png"
                      alt="EEOS"
                      className="w-8 h-8 mx-auto mb-2 object-contain"
                    />
                    <div className="text-sm font-bold text-[#00D4C8]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      EEOS
                    </div>
                    <div className="text-xs text-[#E8EDF5]/50 mt-1">Executive Intelligence</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {[
                  "✓ Zero data replication",
                  "✓ Read-only connectors",
                  "✓ Your data stays in your systems",
                  "✓ Revocable at any time",
                ].map((item) => (
                  <span key={item} className="text-xs text-[#10B981]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Connection Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CONNECTION_STEPS.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 100}>
                <div className="glass-card rounded-xl p-6 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="text-3xl font-bold text-[rgba(0,212,200,0.2)]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {step.step}
                    </div>
                    <span className="tag-teal">{step.duration}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center mb-3">
                    <step.icon className="w-4 h-4 text-[#00D4C8]" />
                  </div>
                  <h3
                    className="text-base font-semibold text-[#E8EDF5] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="bg-[#050C1A] py-24 scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Security by Design</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Six principles of secure connection
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECURITY_PRINCIPLES.map((principle, i) => (
              <AnimatedSection key={principle.title} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 h-full group hover:border-[rgba(0,212,200,0.3)] transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center mb-4 group-hover:bg-[rgba(0,212,200,0.15)] transition-colors">
                    <principle.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <h3
                    className="text-base font-semibold text-[#E8EDF5] mb-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {principle.title}
                  </h3>
                  <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{principle.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Connector Types */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Connector types
            </h2>
            <p className="text-[#E8EDF5]/55 mt-2">
              EEOS supports four integration patterns to connect any enterprise system.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CONNECTOR_TYPES.map((ct, i) => (
              <AnimatedSection key={ct.type} delay={i * 100}>
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="text-lg font-bold text-[#E8EDF5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {ct.type}
                    </h3>
                    <span className="tag-teal">{ct.latency}</span>
                  </div>
                  <p className="text-sm text-[#E8EDF5]/60 mb-4">{ct.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ct.protocols.map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-1 rounded bg-[rgba(0,212,200,0.06)] border border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/60"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-[#E8EDF5]/40"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Examples: {ct.examples.join(" · ")}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Catalog */}
      <section className="bg-[#050C1A] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <div className="section-label mb-4">Integration Catalog</div>
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              50+ pre-built connectors
            </h2>
            <p className="text-[#E8EDF5]/55">
              Ready to connect on day one. Custom connectors available for any system.
            </p>
          </AnimatedSection>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-[rgba(0,212,200,0.15)] border border-[rgba(0,212,200,0.4)] text-[#00D4C8]"
                    : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/60 hover:border-[rgba(0,212,200,0.2)]"
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((integration, i) => (
              <AnimatedSection key={integration.name} delay={i * 40}>
                <div
                  className={`glass-card rounded-xl p-5 text-center transition-all duration-300 cursor-pointer ${
                    hoveredIntegration === integration.name
                      ? "border-[rgba(0,212,200,0.35)] shadow-[0_0_20px_rgba(0,212,200,0.1)]"
                      : "hover:border-[rgba(0,212,200,0.2)]"
                  }`}
                  onMouseEnter={() => setHoveredIntegration(integration.name)}
                  onMouseLeave={() => setHoveredIntegration(null)}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-sm font-bold"
                    style={{
                      background: `${integration.color}15`,
                      border: `1px solid ${integration.color}30`,
                      color: integration.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {integration.logo}
                  </div>
                  <div
                    className="text-sm font-semibold text-[#E8EDF5] mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {integration.name}
                  </div>
                  <div className="text-xs text-[#E8EDF5]/40">{integration.category}</div>
                  {hoveredIntegration === integration.name && (
                    <div className="mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mx-auto" />
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}

            {/* Custom connector card */}
            <AnimatedSection delay={filtered.length * 40}>
              <div className="glass-card rounded-xl p-5 text-center border-dashed border-[rgba(0,212,200,0.2)] hover:border-[rgba(0,212,200,0.4)] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,200,0.05)] border border-dashed border-[rgba(0,212,200,0.3)] flex items-center justify-center mx-auto mb-3">
                  <Code className="w-5 h-5 text-[#00D4C8]/60" />
                </div>
                <div className="text-sm font-semibold text-[#E8EDF5]/60 mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Custom
                </div>
                <div className="text-xs text-[#E8EDF5]/35">Any system</div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <div className="section-label mb-4">Integration Briefing</div>
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Map your systems.
              <br />
              <span className="gradient-text">Activate your intelligence layer.</span>
            </h2>
            <p className="text-[#E8EDF5]/60 mb-8">
              Request an integration assessment. Our technical team will map your existing systems, design a zero-replication connector architecture, and brief your security team before a single credential is shared.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Begin Integration Assessment
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Review Security Architecture
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
