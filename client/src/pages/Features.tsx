// EEOS Features Page — Sovereign Night Design System

import { Link } from "wouter";
import { ArrowRight, LayoutDashboard, ListChecks, Dna, Lightbulb, GitBranch, Network, Bell, Lock, Plug } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const FEATURES = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    name: "Executive Dashboard",
    tagline: "Command-level visibility across your entire organization",
    description: "A real-time synthesis of every critical metric, signal, and trend across your organization. The EEOS Executive Dashboard replaces the morning briefing, the status meeting, and the quarterly review — with a living, breathing command view that updates continuously.",
    capabilities: [
      "Real-time KPI synthesis from all integrated systems",
      "Configurable executive view by role and priority",
      "Cross-departmental health scoring",
      "Financial, operational, and talent metrics unified",
      "Mobile-optimized for on-the-go executives",
    ],
    demo: true,
  },
  {
    id: "priorities",
    icon: ListChecks,
    name: "Executive Priorities",
    tagline: "Your most important decisions, surfaced and sequenced",
    description: "EEOS continuously monitors your organization and surfaces the decisions that require executive attention — ranked by urgency, impact, and time sensitivity. No more wondering what to focus on. EEOS tells you.",
    capabilities: [
      "AI-ranked priority queue updated in real time",
      "Impact and urgency scoring for every item",
      "Recommended actions with supporting evidence",
      "Deadline and time-sensitivity tracking",
      "Delegation and escalation workflows",
    ],
    demo: true,
  },
  {
    id: "dna",
    icon: Dna,
    name: "Business DNA",
    tagline: "A living model of your organization's strengths and vulnerabilities",
    description: "Business DNA is EEOS's proprietary organizational model — a continuously updated map of your company's core capabilities, strategic alignment, risk exposure, and cultural health. It's the foundation for every recommendation EEOS makes.",
    capabilities: [
      "Organizational strength and capability scoring",
      "Strategic theme alignment measurement",
      "Department health and performance mapping",
      "Risk factor identification and tracking",
      "Competitive positioning analysis",
    ],
    demo: true,
  },
  {
    id: "recommendations",
    icon: Lightbulb,
    name: "Recommendation Cards",
    tagline: "Decisive intelligence, delivered in seconds",
    description: "EEOS Recommendation Cards are concise, evidence-backed briefings that tell you exactly what to do, why it matters, and what happens if you wait. Each card includes confidence scoring, supporting data, and suggested next actions.",
    capabilities: [
      "Action, risk, opportunity, and insight card types",
      "Confidence scoring with source transparency",
      "Time-to-act windows with value-at-stake",
      "One-click action initiation",
      "Card history and outcome tracking",
    ],
    demo: true,
  },
  {
    id: "timeline",
    icon: GitBranch,
    name: "Intelligence Timeline",
    tagline: "The organizational story, told chronologically",
    description: "The EEOS Timeline provides a complete chronological record of every significant event, decision, alert, and outcome across your organization. Understand what happened, when, and why — with full context and causal relationships.",
    capabilities: [
      "Complete organizational event history",
      "Automated event detection and logging",
      "Causal relationship mapping between events",
      "Filterable by department, category, and severity",
      "Audit trail for governance and compliance",
    ],
    demo: true,
  },
  {
    id: "knowledge-graph",
    icon: Network,
    name: "Knowledge Graph",
    tagline: "Your organization, mapped as a living network",
    description: "The EEOS Knowledge Graph is a dynamic, interactive visualization of every relationship in your organization — between people, departments, systems, risks, and external entities. See the hidden connections that drive your business.",
    capabilities: [
      "Interactive organizational network visualization",
      "People, department, and system relationship mapping",
      "Risk and opportunity node identification",
      "External entity tracking (customers, regulators, suppliers)",
      "Real-time graph updates as relationships change",
    ],
    demo: true,
  },
  {
    id: "alerts",
    icon: Bell,
    name: "Intelligent Alerts",
    tagline: "Signal over noise — always",
    description: "EEOS's alert system is designed for executives, not analysts. Every alert is pre-filtered, contextualized, and prioritized before it reaches you. No false positives. No noise. Only what genuinely requires your attention.",
    capabilities: [
      "Multi-source signal aggregation and deduplication",
      "Severity classification and urgency scoring",
      "Configurable alert thresholds by executive",
      "Mobile push notifications for critical alerts",
      "Alert routing and delegation",
    ],
    demo: false,
  },
  {
    id: "security",
    icon: Lock,
    name: "Zero-Trust Security",
    tagline: "Enterprise-grade security by design",
    description: "EEOS was architected from the ground up for the security requirements of Fortune 500 enterprises. Zero-trust architecture, end-to-end encryption, and complete data sovereignty — your data never leaves your control.",
    capabilities: [
      "Zero-trust network architecture",
      "End-to-end AES-256 encryption",
      "SOC 2 Type II and ISO 27001 certified",
      "FedRAMP Ready for government clients",
      "Complete audit logging and access controls",
    ],
    demo: false,
  },
  {
    id: "integrations",
    icon: Plug,
    name: "Universal Integrations",
    tagline: "Connect every system your organization runs",
    description: "EEOS integrates with every major enterprise platform — ERP, CRM, HR, finance, operations, and more. Our secure connector framework reads data without storing it, maintaining complete data sovereignty while delivering unified intelligence.",
    capabilities: [
      "Pre-built connectors for 50+ enterprise platforms",
      "Custom API connector framework",
      "Real-time and batch data synchronization",
      "Read-only access model — EEOS never writes to source systems",
      "Data residency controls and regional compliance",
    ],
    demo: false,
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">EEOS Platform Features</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Every capability
              <br />
              <span className="gradient-text">a business leader needs</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              EEOS is Eagle Eye Automation's flagship product — a complete business intelligence platform, not a collection of dashboards. Every feature is designed around how service business owners actually lead.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-[#050C1A] pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={feature.id} delay={i * 60}>
                <div className="glass-card rounded-2xl p-8 hover:border-[rgba(0,212,200,0.25)] transition-all duration-300">
                  <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center">
                          <feature.icon className="w-5 h-5 text-[#00D4C8]" />
                        </div>
                        {feature.demo && (
                          <span className="tag-teal">Live Demo</span>
                        )}
                      </div>
                      <h3
                        className="text-2xl font-bold text-[#E8EDF5] mb-2"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {feature.name}
                      </h3>
                      <p className="text-sm text-[#00D4C8] font-medium mb-4">{feature.tagline}</p>
                      <p className="text-sm text-[#E8EDF5]/60 leading-relaxed">{feature.description}</p>
                      {feature.demo && (
                        <Link
                          href="/demo"
                          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#00D4C8] hover:gap-2.5 transition-all duration-200"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          Try in demo
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="lg:col-span-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {feature.capabilities.map((cap) => (
                          <div
                            key={cap}
                            className="flex items-start gap-2.5 p-3 rounded-lg bg-[rgba(0,212,200,0.04)] border border-[rgba(0,212,200,0.08)]"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] mt-1.5 shrink-0" />
                            <span className="text-sm text-[#E8EDF5]/70">{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Experience every feature live
            </h2>
            <p className="text-[#E8EDF5]/60 mb-8">
              Our interactive demo uses real demonstration data to show you exactly how EEOS operates in a Fortune 500 environment.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Launch Interactive Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
