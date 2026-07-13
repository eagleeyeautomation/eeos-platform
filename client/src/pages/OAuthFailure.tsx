// EEOS — OAuth Failure Page
// Sovereign Night Design System
// Sprint 11: Shown when GoHighLevel OAuth authorization fails or is denied

import { Link } from "wouter";
import {
  AlertCircle, ArrowRight, RefreshCw, Shield, HelpCircle,
  Plug, ChevronRight, Mail, MessageSquare
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const FAILURE_REASONS = [
  {
    code: "ACCESS_DENIED",
    label: "Authorization denied",
    description: "You declined the permission request in GoHighLevel. This is completely fine — you can retry when ready.",
    resolution: "Click 'Try Again' below and accept the read-only permissions when prompted.",
  },
  {
    code: "INVALID_SCOPE",
    label: "Insufficient permissions",
    description: "EEOS requires specific read-only scopes to function. Some required permissions were not granted.",
    resolution: "Ensure you grant all requested permissions during the authorization flow.",
  },
  {
    code: "TOKEN_EXPIRED",
    label: "Session expired",
    description: "The authorization session timed out before completion.",
    resolution: "Start a fresh authorization attempt — the session is valid for 10 minutes.",
  },
  {
    code: "ACCOUNT_SUSPENDED",
    label: "Account access restricted",
    description: "Your GoHighLevel account may have restrictions that prevent third-party OAuth connections.",
    resolution: "Contact your GoHighLevel account administrator or our support team.",
  },
];

export default function OAuthFailure() {
  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get("error") || "UNKNOWN";
  const provider = params.get("provider") || "gohighlevel";
  const providerLabel = provider === "gohighlevel" ? "GoHighLevel" : provider;

  const matchedReason = FAILURE_REASONS.find((r) => r.code === errorCode) || {
    code: errorCode,
    label: "Connection failed",
    description: "An unexpected error occurred during the authorization process.",
    resolution: "Please try again. If the issue persists, contact our support team.",
  };

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Error icon */}
        <div className="w-24 h-24 rounded-full bg-[rgba(239,68,68,0.08)] border-2 border-[rgba(239,68,68,0.3)] flex items-center justify-center mb-8">
          <AlertCircle className="w-12 h-12 text-[#EF4444]" />
        </div>

        {/* Headline */}
        <div className="text-center mb-10 max-w-xl">
          <div className="section-label mb-3" style={{ color: "#EF4444" }}>Connection Failed</div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-[#E8EDF5] tracking-tight mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {providerLabel} authorization
            <br />
            <span style={{ color: "#EF4444" }}>was not completed.</span>
          </h1>
          <p className="text-lg text-[#E8EDF5]/60 leading-relaxed">
            Don't worry — your account is secure and no changes were made. Here's what happened and how to resolve it.
          </p>
        </div>

        {/* Error detail card */}
        <div className="w-full max-w-lg mb-10">
          <div className="glass-card rounded-xl p-6 border border-[rgba(239,68,68,0.2)]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#E8EDF5] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {matchedReason.label}
                </div>
                <div className="text-xs text-[#E8EDF5]/50 leading-relaxed mb-3">
                  {matchedReason.description}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(0,212,200,0.05)] border border-[rgba(0,212,200,0.15)]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#00D4C8] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#E8EDF5]/65 leading-relaxed">
                    <strong className="text-[#00D4C8]">Resolution:</strong> {matchedReason.resolution}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[rgba(0,212,200,0.08)]">
              <div className="flex items-center gap-2 text-xs text-[#E8EDF5]/35"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <Shield className="w-3 h-3 text-[#00D4C8]" />
                <span>Error code: {errorCode} · No data was accessed or stored</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link
            href="/connect-ghl"
            className="flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
          </Link>
        </div>

        {/* Common issues */}
        <div className="w-full max-w-2xl">
          <p className="text-center text-xs text-[#E8EDF5]/35 mb-5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            COMMON ISSUES & RESOLUTIONS
          </p>
          <div className="space-y-3">
            {FAILURE_REASONS.map((reason) => (
              <div key={reason.code} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] mt-2 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-[#E8EDF5] mb-0.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{reason.label}</div>
                  <div className="text-xs text-[#E8EDF5]/50 leading-relaxed">{reason.resolution}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-[#E8EDF5]/45 mb-3">Still having trouble?</p>
            <a
              href="mailto:intelligence@eagleeyeautomation.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D4C8] hover:text-[#00E8DB] transition-colors duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Mail className="w-4 h-4" />
              intelligence@eagleeyeautomation.com
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
