// EEOS Footer — Sovereign Night Design System
// Updated with new CTAs, GoHighLevel journey link, mobile-first layout

import { Link } from "wouter";
import { Shield, Mail, Phone, MapPin, Zap, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#050C1A] border-t border-[rgba(0,212,200,0.1)]">
      {/* Mini CTA Bar */}
      <div className="border-b border-[rgba(0,212,200,0.08)] bg-[#0A1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-[#E8EDF5]/60">
              <span className="text-[#E8EDF5] font-semibold">EEOS Private Beta is open.</span>{" "}
              Connect your business systems and go live in 6 weeks.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/connect-ghl"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_14px_rgba(0,212,200,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-3 h-3" />
                Start Private Beta
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/manus-storage/eeos-logo-mark_707d59ff.png"
                alt="Eagle Eye Automation"
                className="w-8 h-8 object-contain"
              />
              <div>
                <div
                  className="text-[#E8EDF5] font-bold text-base tracking-tight leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Eagle Eye Automation
                </div>
                <div
                  className="text-[#00D4C8] text-[9px] tracking-[0.15em] uppercase mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  EEOS · Don't Build More. Build Accurate.
                </div>
              </div>
            </div>
            <p className="text-[#E8EDF5]/55 text-sm leading-relaxed max-w-xs mb-3">
              Eagle Eye Automation builds AI software that helps service businesses grow. EEOS connects to your business systems, reads approved signals, and turns them into executive recommendations.
            </p>
            <p className="text-[#00D4C8]/70 text-xs italic mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              “Transcend Your Business. Stop Managing. Start Leading.”
            </p>
            <div
              className="flex items-center gap-2 text-xs text-[#E8EDF5]/35"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Shield className="w-3.5 h-3.5 text-[#00D4C8]" />
              <span>SOC 2 Type II · ISO 27001 · FedRAMP Ready</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4
              className="text-[#E8EDF5] font-semibold text-xs mb-4 tracking-[0.1em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Platform
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Why EEOS", href: "/why-eeos" },
                { label: "Features", href: "/features" },
                { label: "Industries", href: "/industries" },
                { label: "Pricing", href: "/pricing" },
                { label: "Security", href: "/security" },
                { label: "Integrations", href: "/integrations" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#E8EDF5]/50 hover:text-[#00D4C8] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className="text-[#E8EDF5] font-semibold text-xs mb-4 tracking-[0.1em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Company
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "About Eagle Eye", href: "/about" },
                { label: "Contact Us", href: "/contact" },
                { label: "Request Demo", href: "/demo" },
                { label: "Connect GoHighLevel", href: "/connect-ghl" },
                { label: "Connect Your Business", href: "/onboarding" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#E8EDF5]/50 hover:text-[#00D4C8] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h4
              className="text-[#E8EDF5] font-semibold text-xs mb-4 tracking-[0.1em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/50 break-all">intelligence@eagleeyeautomation.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/50">+1 (888) EEOS-NOW</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/50">Washington D.C. · New York · London · Singapore</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="teal-line my-8 sm:my-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p
            className="text-xs text-[#E8EDF5]/30"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            © 2026 Eagle Eye Automation, Inc. All rights reserved. · AI Software for Service Businesses
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {["Privacy Policy", "Terms of Service", "Security Policy", "Cookie Settings"].map((item) => (
              <button
                key={item}
                className="text-xs text-[#E8EDF5]/30 hover:text-[#00D4C8] transition-colors duration-200"
                onClick={() => {}}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
