// EEOS Footer — Sovereign Night Design System

import { Link } from "wouter";
import { Shield, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#050C1A] border-t border-[rgba(0,212,200,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/manus-storage/eeos-logo-mark_707d59ff.png"
                alt="EEOS"
                className="w-8 h-8 object-contain"
              />
              <div>
                <div className="text-[#E8EDF5] font-bold text-lg tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  EEOS
                </div>
                <div className="text-[#00D4C8] text-[9px] tracking-[0.15em] uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Eagle Eye Automation
                </div>
              </div>
            </div>
            <p className="text-[#E8EDF5]/60 text-sm leading-relaxed max-w-xs mb-6">
              The executive intelligence operating system for organizations that demand clarity, speed, and decisive advantage.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#E8EDF5]/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <Shield className="w-3.5 h-3.5 text-[#00D4C8]" />
              <span>SOC 2 Type II · ISO 27001 · FedRAMP Ready</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[#E8EDF5] font-semibold text-sm mb-4 tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
                    className="text-sm text-[#E8EDF5]/55 hover:text-[#00D4C8] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[#E8EDF5] font-semibold text-sm mb-4 tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Company
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "About Eagle Eye", href: "/about" },
                { label: "Contact Us", href: "/contact" },
                { label: "Live Demo", href: "/demo" },
                { label: "Activate EEOS", href: "/onboarding" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#E8EDF5]/55 hover:text-[#00D4C8] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#E8EDF5] font-semibold text-sm mb-4 tracking-wide"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/55">intelligence@eagleeyeautomation.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/55">+1 (888) EEOS-NOW</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#00D4C8] mt-0.5 shrink-0" />
                <span className="text-sm text-[#E8EDF5]/55">Washington D.C. · New York · London · Singapore</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="teal-line my-10" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#E8EDF5]/35"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            © 2025 Eagle Eye Automation, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy Policy", "Terms of Service", "Security Policy", "Cookie Settings"].map((item) => (
              <button
                key={item}
                className="text-xs text-[#E8EDF5]/35 hover:text-[#00D4C8] transition-colors duration-200"
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
