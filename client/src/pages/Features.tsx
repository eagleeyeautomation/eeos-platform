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
    tagline: "Fortune 500 visibility for small business owners",
    description: "A clear command view of the signals that matter most: business health, lead flow, operations, staffing, revenue, alerts, and priorities. EEOS gives owners executive-level visibility without enterprise complexity.",
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
    description: "EEOS monitors your business signals and surfaces the decisions that need attention, ranked by urgency, impact, and time sensitivity. No more wondering what to focus on first.",
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
    tagline: "A living model of your strengths, risks, and momentum",
    description: "Business DNA is EEOS's operating model for your company: a continuously updated map of what is working, where risk is forming, and where the next opportunity may be hiding.",
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
    tagline: "Your business story, told chronologically",
    description: "The EEOS Timeline organizes important activity, decisions, alerts, and outcomes into a clean sequence so owners can understand what happened, when, and why.",
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
    tagline: "Your business, mapped as a living network",
    description: "The EEOS Knowledge Graph helps connect people, systems, customers, risks, and opportunities so leaders can see relationships that are easy to miss in everyday operations.",
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
    description: "EEOS brings enterprise-grade security principles to small businesses: disciplined access, encryption, auditability, and data sovereignty.",
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
    name: "Business System Integrations",
    tagline: "Connect the systems your business already runs",
    description: "EEOS starts with GoHighLevel and expands through secure connectors that read approved business signals without storing private source data.",
    capabilities: [
      "GoHighLevel integration foundation",
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
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#0B0B0B] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">EEOS Platform Features</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#FFFFFF] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Every capability
              <br />
              <span className="gradient-text">a business leader needs</span>
            </h1>
            <p className="text-xl text-[#FFFFFF]/65 leading-relaxed">
              EEOS is Eagle Eye Automation's flagship product — the AI Operating System that gives small businesses the power of Fortune 500 companies through AI, automation, and executive intelligence.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-[#0B0B0B] pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={feature.id} delay={i * 60}>
                <div className="glass-card rounded-2xl p-8 hover:border-[rgba(201,162,39,0.25)] transition-all duration-300">
                  <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(201,162,39,0.1)] border border-[rgba(201,162,39,0.2)] flex items-center justify-center">
                          <feature.icon className="w-5 h-5 text-[#C9A227]" />
                        </div>
                        {feature.demo && (
                          <span className="tag-teal">Live Demo</span>
                        )}
                      </div>
                      <h3
                        className="text-2xl font-bold text-[#FFFFFF] mb-2"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {feature.name}
                      </h3>
                      <p className="text-sm text-[#C9A227] font-medium mb-4">{feature.tagline}</p>
                      <p className="text-sm text-[#FFFFFF]/60 leading-relaxed">{feature.description}</p>
                      {feature.demo && (
                        <Link
                          href="/demo"
                          className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#C9A227] hover:gap-2.5 transition-all duration-200"
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
                            className="flex items-start gap-2.5 p-3 rounded-lg bg-[rgba(201,162,39,0.04)] border border-[rgba(201,162,39,0.08)]"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] mt-1.5 shrink-0" />
                            <span className="text-sm text-[#FFFFFF]/70">{cap}</span>
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
      <section className="bg-[#141414] py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#FFFFFF] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Experience every feature live
            </h2>
            <p className="text-[#FFFFFF]/60 mb-8">
              Our interactive demo shows how EEOS brings enterprise-level capabilities to small businesses through AI executive intelligence, workflow automation, and secure business health monitoring.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-lg hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_24px_rgba(201,162,39,0.4)]"
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
