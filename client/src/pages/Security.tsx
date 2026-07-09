// EEOS Security Page — Sovereign Night Design System

import { Link } from "wouter";
import { ArrowRight, Shield, Lock, Eye, Server, Key, FileCheck, Globe, AlertTriangle, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";

const CERTIFICATIONS = [
  { name: "SOC 2 Type II", description: "Annual third-party audit of security, availability, and confidentiality controls", icon: FileCheck },
  { name: "ISO 27001", description: "International standard for information security management systems", icon: Shield },
  { name: "FedRAMP Ready", description: "Meets federal government cloud security requirements for sensitive data", icon: Server },
  { name: "GDPR Compliant", description: "Full compliance with EU General Data Protection Regulation", icon: Globe },
  { name: "HIPAA Capable", description: "Healthcare data handling protocols available for health system clients", icon: Lock },
  { name: "ITAR Aware", description: "International Traffic in Arms Regulations compliance for defense clients", icon: AlertTriangle },
];

const SECURITY_PILLARS = [
  {
    icon: Eye,
    title: "Zero-Trust Architecture",
    description: "Every access request is verified, regardless of source. No implicit trust — every user, device, and connection is authenticated and authorized at every step.",
    details: [
      "Multi-factor authentication enforced for all users",
      "Role-based access control with least-privilege defaults",
      "Continuous session validation and anomaly detection",
      "Network micro-segmentation for all services",
    ],
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit and at rest using AES-256 and TLS 1.3. Encryption keys are customer-managed and never held by Eagle Eye Automation.",
    details: [
      "AES-256 encryption for all stored data",
      "TLS 1.3 for all data in transit",
      "Customer-managed encryption keys (BYOK)",
      "Hardware Security Module (HSM) key storage",
    ],
  },
  {
    icon: Server,
    title: "Data Sovereignty",
    description: "EEOS operates on a read-only connector model. We never store, copy, or replicate your source data. Your data stays in your systems — always.",
    details: [
      "Read-only access to source systems",
      "No data replication or storage of source records",
      "Regional data residency options",
      "Complete data lineage and audit trail",
    ],
  },
  {
    icon: Key,
    title: "Identity & Access Management",
    description: "Enterprise-grade IAM with SSO integration, granular permissions, and complete audit logging of every access event.",
    details: [
      "SAML 2.0 and OAuth 2.0 SSO integration",
      "Active Directory and LDAP support",
      "Granular permission model by role and data type",
      "Complete access audit log with retention",
    ],
  },
];

const COMPLIANCE_FRAMEWORKS = [
  "NIST Cybersecurity Framework",
  "CIS Controls v8",
  "OWASP Top 10",
  "PCI DSS (where applicable)",
  "CCPA (California)",
  "PIPEDA (Canada)",
  "DORA (EU Financial)",
  "NIS2 Directive (EU)",
];

export default function Security() {
  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/manus-storage/eeos-security-bg_46b86bea.png"
            alt=""
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050C1A]/80 via-[#050C1A]/70 to-[#050C1A]" />
          <div className="absolute inset-0 scan-grid opacity-30" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto">
            <div className="section-label mb-4">Security & Compliance</div>
            <h1
              className="text-5xl sm:text-6xl font-bold text-[#E8EDF5] tracking-tight mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Security built for
              <br />
              <span className="gradient-text">sovereign intelligence</span>
            </h1>
            <p className="text-xl text-[#E8EDF5]/65 leading-relaxed">
              Eagle Eye Automation built EEOS for service businesses that cannot afford data exposure. Enterprise-grade security architecture — your data never leaves your control.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Certifications */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Certifications & Compliance
            </h2>
            <p className="text-[#E8EDF5]/55">
              Independently audited and certified to the highest enterprise security standards.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CERTIFICATIONS.map((cert, i) => (
              <AnimatedSection key={cert.name} delay={i * 80}>
                <div className="glass-card rounded-xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center shrink-0">
                    <cert.icon className="w-5 h-5 text-[#00D4C8]" />
                  </div>
                  <div>
                    <h3
                      className="text-base font-semibold text-[#E8EDF5] mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {cert.name}
                    </h3>
                    <p className="text-sm text-[#E8EDF5]/55 leading-relaxed">{cert.description}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Security Pillars */}
      <section className="bg-[#050C1A] py-24 scan-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="section-label mb-4">Security Architecture</div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Four pillars of enterprise security
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SECURITY_PILLARS.map((pillar, i) => (
              <AnimatedSection key={pillar.title} delay={i * 100}>
                <div className="glass-card rounded-2xl p-8 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,200,0.1)] border border-[rgba(0,212,200,0.2)] flex items-center justify-center">
                      <pillar.icon className="w-6 h-6 text-[#00D4C8]" />
                    </div>
                    <h3
                      className="text-xl font-bold text-[#E8EDF5]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {pillar.title}
                    </h3>
                  </div>
                  <p className="text-[#E8EDF5]/60 leading-relaxed mb-6">{pillar.description}</p>
                  <ul className="space-y-2">
                    {pillar.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] mt-1.5 shrink-0" />
                        <span className="text-sm text-[#E8EDF5]/65">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Frameworks */}
      <section className="bg-[#0A1628] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Regulatory frameworks supported
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <div className="flex flex-wrap gap-3 justify-center">
              {COMPLIANCE_FRAMEWORKS.map((framework) => (
                <span key={framework} className="tag-teal px-4 py-2 text-xs">
                  {framework}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Data Model */}
      <section className="bg-[#050C1A] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="glass-card rounded-2xl p-10">
              <div className="section-label mb-4">The EEOS Data Model</div>
              <h2
                className="text-3xl font-bold text-[#E8EDF5] tracking-tight mb-6"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                We read. We never store.
              </h2>
              <p className="text-[#E8EDF5]/65 leading-relaxed mb-8">
                EEOS's core security principle is data sovereignty. Our connectors read signals from your systems in real time — extracting only the metadata and metrics needed for intelligence synthesis. We never copy, replicate, or store your underlying business data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Data stored by EEOS", value: "0 records", color: "#10B981" },
                  { label: "Access model", value: "Read-only", color: "#00D4C8" },
                  { label: "Data residency", value: "Your region", color: "#00D4C8" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="text-center p-4 rounded-xl bg-[rgba(0,212,200,0.04)] border border-[rgba(0,212,200,0.1)]"
                  >
                    <div
                      className="text-xl font-bold mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: item.color }}
                    >
                      {item.value}
                    </div>
                    <div className="text-xs text-[#E8EDF5]/50">{item.label}</div>
                  </div>
                ))}
              </div>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:gap-3 transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Learn how EEOS connects to your systems
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] border-t border-[rgba(0,212,200,0.1)] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20">
              <div className="flex-1">
                <div className="section-label mb-3">Trusted Security</div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-4 leading-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Security questions?
                  <br />
                  <span className="gradient-text">Talk to our team.</span>
                </h2>
                <p className="text-[#E8EDF5]/58 max-w-lg text-sm sm:text-base leading-relaxed">
                  EEOS connects to your business systems, reads approved signals, and turns them into executive recommendations — without storing your data. Our security team is available for detailed technical briefings, penetration test results, and custom compliance reviews.
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
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-[#E8EDF5]/55 hover:text-[#E8EDF5]/80 transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Security Briefing
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
