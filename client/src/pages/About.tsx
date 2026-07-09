// EEOS About Page — Sovereign Night Design System

import { Link } from "wouter";
import { ArrowRight, Target, Lightbulb, Users, Globe } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const VALUES = [
  {
    icon: Target,
    title: "Precision over volume",
    description: "We believe executives are drowning in data and starving for intelligence. Every EEOS feature is designed to reduce noise and amplify signal.",
  },
  {
    icon: Lightbulb,
    title: "Intelligence, not automation",
    description: "EEOS augments executive judgment — it doesn't replace it. We surface what matters and provide context, but the decision always belongs to the leader.",
  },
  {
    icon: Users,
    title: "Built by operators, for operators",
    description: "Our team includes former Fortune 500 executives, intelligence analysts, and enterprise software architects who have lived the problem EEOS solves.",
  },
  {
    icon: Globe,
    title: "Sovereign by design",
    description: "We believe organizations have a right to their own intelligence. EEOS is built on the principle that your data, your insights, and your decisions belong to you.",
  },
];

const LEADERSHIP = [
  {
    name: "James Whitfield",
    title: "Chief Executive Officer",
    background: "Former COO, Apex Defense Systems · 20 years enterprise operations",
    initials: "JW",
  },
  {
    name: "Dr. Sarah Chen",
    title: "Chief Technology Officer",
    background: "Former VP Engineering, Oracle · PhD Computer Science, MIT",
    initials: "SC",
  },
  {
    name: "Marcus Rivera",
    title: "Chief Revenue Officer",
    background: "Former SVP Sales, Palantir · 15 years enterprise software",
    initials: "MR",
  },
  {
    name: "Elena Vasquez",
    title: "Chief Security Officer",
    background: "Former NSA Technical Director · 18 years intelligence community",
    initials: "EV",
  },
  {
    name: "David Park",
    title: "Chief Product Officer",
    background: "Former Director, Microsoft Azure · Built 3 enterprise SaaS products",
    initials: "DP",
  },
  {
    name: "Amara Osei",
    title: "Chief Customer Officer",
    background: "Former VP Customer Success, ServiceNow · 200+ enterprise deployments",
    initials: "AO",
  },
];

const MILESTONES = [
  { year: "2019", event: "Eagle Eye Automation founded in Washington D.C." },
  { year: "2020", event: "First EEOS prototype deployed with defense contractor pilot" },
  { year: "2021", event: "Series A — $28M raised. SOC 2 Type II certification achieved" },
  { year: "2022", event: "EEOS 2.0 launched. Knowledge Graph and Business DNA introduced" },
  { year: "2023", event: "Series B — $95M raised. FedRAMP Ready designation achieved" },
  { year: "2024", event: "42 enterprise clients across 6 industries. ISO 27001 certified" },
  { year: "2025", event: "EEOS 3.0 — Full Executive Intelligence Suite. Global expansion" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-[#050C1A] scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="max-w-3xl">
            <div className="section-label mb-4">About Eagle Eye Automation</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              We built the operating
              <br />
              system executives
              <br />
              <span className="gradient-text">always needed.</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              Eagle Eye Automation was founded on a single conviction: the most consequential decisions in the world are made by executives operating with incomplete information. We built EEOS to change that.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="section-label mb-4">Our Mission</div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-6"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Give every executive
                <br />
                the clarity to lead
                <br />
                <span className="gradient-text">with certainty.</span>
              </h2>
              <p className="text-[#E8EDF5]/65 leading-relaxed mb-6">
                We believe that when leaders have complete, timely, and accurate intelligence, they make better decisions — for their organizations, their people, and the world. EEOS is our contribution to that vision.
              </p>
              <p className="text-[#E8EDF5]/65 leading-relaxed">
                Founded in Washington D.C. in 2019, Eagle Eye Automation has grown to serve 42 enterprise clients across aerospace, financial services, healthcare, manufacturing, energy, and technology — with a team of 180 people across four global offices.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "2019", label: "Founded" },
                  { value: "180+", label: "Team Members" },
                  { value: "42+", label: "Enterprise Clients" },
                  { value: "4", label: "Global Offices" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-card rounded-xl p-6 text-center"
                  >
                    <div
                      className="text-3xl font-bold text-[#00D4C8] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-sm text-[#E8EDF5]/55">{stat.label}</div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#050C1A] py-24 scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              What we believe
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((value, i) => (
              <AnimatedSection key={value.title} delay={i * 100}>
                <div className="glass-card rounded-xl p-8 h-full">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center mb-4">
                    <value.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <h3
                    className="text-xl font-semibold text-[#E8EDF5] mb-3"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-[#E8EDF5]/60 leading-relaxed">{value.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Leadership</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              The team behind EEOS
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LEADERSHIP.map((person, i) => (
              <AnimatedSection key={person.name} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-[#050C1A] shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #00D4C8, #60efea)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {person.initials}
                  </div>
                  <div>
                    <h3
                      className="text-base font-semibold text-[#E8EDF5] mb-0.5"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {person.name}
                    </h3>
                    <div className="text-xs text-[#00D4C8] mb-2">{person.title}</div>
                    <p className="text-xs text-[#E8EDF5]/50 leading-relaxed">{person.background}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-[#050C1A] py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Company History</div>
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              From idea to industry standard
            </h2>
          </AnimatedSection>

          <div className="relative">
            <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-[rgba(0,212,200,0.5)] via-[rgba(0,212,200,0.2)] to-transparent" />
            <div className="space-y-8">
              {MILESTONES.map((milestone, i) => (
                <AnimatedSection key={milestone.year} delay={i * 80}>
                  <div className="flex items-start gap-6">
                    <div
                      className="w-14 text-right text-sm font-bold text-[#00D4C8] shrink-0 pt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {milestone.year}
                    </div>
                    <div className="relative flex items-start gap-4">
                      <div className="w-3 h-3 rounded-full bg-[#00D4C8] border-2 border-[#050C1A] mt-1 shrink-0 shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
                      <p className="text-[#E8EDF5]/70 leading-relaxed">{milestone.event}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#050C1A] border-t border-[rgba(0,212,200,0.1)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20">
              <div className="flex-1">
                <div className="section-label mb-3">Engage Eagle Eye</div>
                <h2
                  className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-4 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enterprise leaders. Investors.
                  <br />
                  <span className="gradient-text">The people who build what's next.</span>
                </h2>
                <p className="text-[#E8EDF5]/55 max-w-lg">
                  Whether you're evaluating EEOS for your organization, exploring a strategic partnership, or joining our team — we operate at the intersection of intelligence and action.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_24px_rgba(0,212,200,0.4)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Open a Channel
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Enter the Demo
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
