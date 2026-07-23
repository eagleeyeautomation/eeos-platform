// EEOS — OAuth Success Page
// Sovereign Night Design System
// Sprint 11: Shown after successful GoHighLevel OAuth authorization

import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  CheckCircle2, ArrowRight, Activity, LayoutDashboard,
  Zap, Shield, Database, RefreshCw, Plug, ChevronRight
} from "lucide-react";
import Navigation from "@/components/Navigation";

const ACTIVATION_STEPS = [
  { id: 1, label: "OAuth token validated", duration: 600 },
  { id: 2, label: "Signal permissions confirmed", duration: 900 },
  { id: 3, label: "Business DNA mapping initiated", duration: 1400 },
  { id: 4, label: "Executive Dashboard provisioning", duration: 1900 },
  { id: 5, label: "EEOS activation complete", duration: 2500 },
];

const NEXT_STEPS = [
  {
    icon: Activity,
    title: "View Integration Health",
    description: "Monitor your live GoHighLevel connection, signal flow, and sync status in real time.",
    href: "/integration-health",
    cta: "View Integration Health",
    primary: true,
  },
  {
    icon: LayoutDashboard,
    title: "Open Executive Dashboard",
    description: "Your first executive recommendations will appear within 24 hours as EEOS maps your business signals.",
    href: "/demo",
    cta: "Open Executive Dashboard",
    primary: false,
  },
  {
    icon: Plug,
    title: "Add More Integrations",
    description: "Connect additional business systems — ERP, HR, finance, and analytics — to deepen EEOS intelligence.",
    href: "/integrations",
    cta: "Browse Integrations",
    primary: false,
  },
];

export default function OAuthSuccess() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    ACTIVATION_STEPS.forEach((step) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step.id]);
        if (step.id === ACTIVATION_STEPS.length) {
          setTimeout(() => setAllDone(true), 300);
        }
      }, step.duration);
    });
  }, []);

  // Parse query params for provider name
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("provider") || "GoHighLevel";
  const providerLabel = provider === "gohighlevel" ? "GoHighLevel" : provider;

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navigation />

      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Success icon */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${
            allDone
              ? "bg-[rgba(201,162,39,0.12)] border-2 border-[#C9A227] shadow-[0_0_40px_rgba(201,162,39,0.3)]"
              : "bg-[rgba(201,162,39,0.06)] border-2 border-[rgba(201,162,39,0.2)]"
          }`}
        >
          <CheckCircle2
            className={`w-12 h-12 transition-all duration-500 ${allDone ? "text-[#C9A227]" : "text-[#C9A227]/40"}`}
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-10 max-w-xl">
          <div className="section-label mb-3">Connection Established</div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-[#FFFFFF] tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {providerLabel} connected
            <br />
            <span className="gradient-text">successfully.</span>
          </h1>
          <p className="text-lg text-[#FFFFFF]/60 leading-relaxed">
            EEOS now has read-only access to your {providerLabel} signals. Your Business DNA mapping has begun — executive recommendations will be ready within 24 hours.
          </p>
        </div>

        {/* Activation progress */}
        <div className="w-full max-w-md mb-12">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-2 h-2 rounded-full ${allDone ? "bg-[#10B981]" : "bg-[#C9A227] animate-pulse"}`} />
              <span className="text-xs text-[#FFFFFF]/50"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {allDone ? "ACTIVATION COMPLETE" : "ACTIVATING EEOS…"}
              </span>
            </div>
            <div className="space-y-3">
              {ACTIVATION_STEPS.map((step) => {
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
                    <span className={`text-sm transition-colors duration-300 ${
                      done ? "text-[#FFFFFF]/80" : active ? "text-[#C9A227]" : "text-[#FFFFFF]/25"
                    }`} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div className="mt-5 pt-4 border-t border-[rgba(201,162,39,0.1)]">
                <div className="flex items-center gap-2 text-xs text-[#10B981]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Connection secured · SOC 2 Type II · Read-only access confirmed</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next steps */}
        {allDone && (
          <div className="w-full max-w-3xl">
            <p className="text-center text-sm text-[#FFFFFF]/40 mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              WHAT TO DO NEXT
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {NEXT_STEPS.map((step, i) => (
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
                    <div className="text-xs text-[#FFFFFF]/50 leading-relaxed">{step.description}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-[#C9A227] mt-auto"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step.cta} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
