// EEOS — Tenant Setup Confirmation Page
// Sovereign Night Design System
// Sprint 11: Shown after onboarding wizard completion and tenant provisioning

import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2, ArrowRight, Shield, Activity, LayoutDashboard,
  Plug, Building2, Users, Target, BarChart3, RefreshCw, ChevronRight,
  Zap, Globe, Lock
} from "lucide-react";
import Navigation from "@/components/Navigation";

const PROVISIONING_STEPS = [
  { id: 1, label: "Tenant workspace created", duration: 500 },
  { id: 2, label: "Business profile indexed", duration: 900 },
  { id: 3, label: "Security perimeter established", duration: 1300 },
  { id: 4, label: "Executive Dashboard provisioned", duration: 1800 },
  { id: 5, label: "Integration connectors configured", duration: 2300 },
  { id: 6, label: "EEOS activation complete", duration: 3000 },
];

const ACTIVATION_ROADMAP = [
  { week: "Day 1", label: "Technical discovery call with your EEOS specialist" },
  { week: "Week 1", label: "Integration configuration & signal mapping" },
  { week: "Week 2–3", label: "Business DNA build & executive dashboard calibration" },
  { week: "Week 4–5", label: "Recommendation engine tuning & executive training" },
  { week: "Week 6", label: "Go-live — EEOS fully operational" },
];

export default function TenantConfirmation() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    PROVISIONING_STEPS.forEach((step) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step.id]);
        if (step.id === PROVISIONING_STEPS.length) {
          setTimeout(() => setAllDone(true), 400);
        }
      }, step.duration);
    });
  }, []);

  const params = new URLSearchParams(window.location.search);
  const companyName = params.get("company") || "Your Organization";
  const tenantId = params.get("tenant") || `EEOS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Success icon */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${
            allDone
              ? "bg-[rgba(201,162,39,0.12)] border-2 border-[#C9A227] shadow-[0_0_40px_rgba(201,162,39,0.3)] animate-pulse-teal"
              : "bg-[rgba(201,162,39,0.06)] border-2 border-[rgba(201,162,39,0.2)]"
          }`}
        >
          <CheckCircle2
            className={`w-12 h-12 transition-all duration-500 ${allDone ? "text-[#C9A227]" : "text-[#C9A227]/40"}`}
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-10 max-w-2xl">
          <div className="section-label mb-3">Tenant Provisioned</div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-[#FFFFFF] tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {companyName} is
            <br />
            <span className="gradient-text">ready for EEOS.</span>
          </h1>
          <p className="text-lg text-[#FFFFFF]/60 leading-relaxed">
            Your secure EEOS tenant has been provisioned. Your dedicated activation specialist will contact you within 24 hours to begin the connection process.
          </p>
        </div>

        {/* Tenant ID card */}
        <div className="w-full max-w-md mb-8">
          <div className="glass-card rounded-xl p-5 border border-[rgba(201,162,39,0.2)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#FFFFFF]/45"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>TENANT IDENTIFIER</span>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#C9A227]" />
                <span className="text-[10px] text-[#C9A227]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>SECURED</span>
              </div>
            </div>
            <div className="text-xl font-bold text-[#C9A227] mb-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {tenantId}
            </div>
            <p className="text-xs text-[#FFFFFF]/40">
              Save this identifier. Your EEOS specialist will reference it during onboarding.
            </p>
          </div>
        </div>

        {/* Provisioning progress */}
        <div className="w-full max-w-md mb-10">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-2 h-2 rounded-full ${allDone ? "bg-[#10B981]" : "bg-[#C9A227] animate-pulse"}`} />
              <span className="text-xs text-[#FFFFFF]/50"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {allDone ? "PROVISIONING COMPLETE" : "PROVISIONING TENANT…"}
              </span>
            </div>
            <div className="space-y-3">
              {PROVISIONING_STEPS.map((step) => {
                const done = completedSteps.includes(step.id);
                const active = !done && completedSteps.length === step.id - 1;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      done
                        ? "bg-[rgba(201,162,39,0.2)] border border-[rgba(201,162,39,0.5)]"
                        : active
                        ? "border border-[rgba(201,162,39,0.3)] animate-pulse"
                        : "border border-[rgba(232,237,245,0.1)]"
                    }`}>
                      {done && <CheckCircle2 className="w-3 h-3 text-[#C9A227]" />}
                      {active && <RefreshCw className="w-3 h-3 text-[#C9A227] animate-spin" />}
                    </div>
                    <span className={`text-xs transition-colors duration-300 ${
                      done ? "text-[#FFFFFF]/80" : active ? "text-[#C9A227]" : "text-[#FFFFFF]/25"
                    }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activation roadmap + next steps — shown after provisioning */}
        {allDone && (
          <div className="w-full max-w-3xl space-y-6">
            {/* Roadmap */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-base font-semibold text-[#FFFFFF] mb-5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Your activation roadmap
              </h3>
              <div className="space-y-3">
                {ACTIVATION_ROADMAP.map((item) => (
                  <div key={item.week} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-semibold text-[#C9A227] shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.week}</div>
                    <div className="h-px flex-1 bg-[rgba(201,162,39,0.12)]" />
                    <div className="text-sm text-[#FFFFFF]/65 flex-1 text-right sm:text-left">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Plug,
                  title: "Connect GoHighLevel",
                  desc: "Authorize EEOS to read your GHL signals and begin intelligence mapping.",
                  href: "/connect-ghl",
                  cta: "Connect GoHighLevel",
                  primary: true,
                },
                {
                  icon: Activity,
                  title: "View Integration Health",
                  desc: "Monitor your connection status and live signal flow in real time.",
                  href: "/integration-health",
                  cta: "View Integration Health",
                  primary: false,
                },
                {
                  icon: LayoutDashboard,
                  title: "Explore the Demo",
                  desc: "Preview the Executive Dashboard and see EEOS intelligence in action.",
                  href: "/demo",
                  cta: "Open Executive Dashboard",
                  primary: false,
                },
              ].map((step) => (
                <Link
                  key={step.title}
                  href={step.href}
                  className={`glass-card rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:border-[rgba(201,162,39,0.3)] hover:shadow-[0_0_20px_rgba(201,162,39,0.08)] group ${
                    step.primary ? "border-[rgba(201,162,39,0.25)] shadow-[0_0_16px_rgba(201,162,39,0.08)]" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    step.primary ? "bg-[rgba(201,162,39,0.15)] border border-[rgba(201,162,39,0.3)]" : "bg-[rgba(201,162,39,0.06)] border border-[rgba(201,162,39,0.1)]"
                  }`}>
                    <step.icon className="w-5 h-5 text-[#C9A227]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#FFFFFF] mb-1 group-hover:text-[#C9A227] transition-colors duration-200"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.title}</div>
                    <div className="text-xs text-[#FFFFFF]/50 leading-relaxed">{step.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-[#C9A227] mt-auto"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step.cta} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 text-xs text-[#FFFFFF]/30"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <Shield className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>SOC 2 Type II · ISO 27001 · Zero data retention · Read-only access</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
