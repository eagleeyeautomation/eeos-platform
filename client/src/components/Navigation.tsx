// EEOS Navigation — Sovereign Night Design System
// Full-screen mobile drawer, scroll-aware glass bar, active route highlighting

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ArrowRight, Zap, Plug, Activity } from "lucide-react";

const NAV_LINKS = [
  { label: "Why EEOS", href: "/why-eeos" },
  { label: "Features", href: "/features" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  {
    label: "Company",
    href: "#",
    children: [
      { label: "About Eagle Eye", href: "/about" },
      { label: "Integrations", href: "/integrations" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    label: "Connect",
    href: "#",
    children: [
      { label: "Connect GoHighLevel", href: "/connect-ghl" },
      { label: "Integration Health", href: "/integration-health" },
      { label: "PRN Staffers Setup", href: "/prn-onboarding" },
    ],
  },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(null);
  }, [location]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileOpen ? "nav-glass shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-8 h-8 relative">
                <img
                  src="/manus-storage/eeos-logo-mark_707d59ff.png"
                  alt="EEOS"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="text-[#E8EDF5] font-bold text-lg tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  EEOS
                </span>
                <span
                  className="text-[#00D4C8] text-[9px] tracking-[0.15em] uppercase font-medium hidden sm:block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Eagle Eye Automation
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((link) =>
                link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(link.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                  >
                    <button
                      className="flex items-center gap-1 px-4 py-2 text-sm text-[#E8EDF5]/75 hover:text-[#00D4C8] transition-colors duration-200 font-medium"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {link.label}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          dropdownOpen === link.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {dropdownOpen === link.label && (
                      <div className="absolute top-full left-0 mt-1 w-52 glass-card rounded-lg overflow-hidden shadow-xl">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-[#E8EDF5]/75 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.06)] transition-all duration-150"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      location === link.href
                        ? "text-[#00D4C8]"
                        : "text-[#E8EDF5]/75 hover:text-[#00D4C8]"
                    }`}
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/demo"
                className="px-4 py-2 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.3)] rounded-md hover:bg-[rgba(0,212,200,0.08)] hover:border-[rgba(0,212,200,0.6)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Request Demo
              </Link>
              <Link
                href="/connect-ghl"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_16px_rgba(0,212,200,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-3.5 h-3.5" />
                Start Private Beta
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-[#E8EDF5]/80 hover:text-[#00D4C8] transition-colors rounded-md"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(5, 12, 26, 0.98)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex flex-col h-full pt-20 pb-8 px-6 overflow-y-auto">
          {/* Nav Links */}
          <nav className="flex-1 space-y-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label} className="py-2">
                  <div
                    className="text-[10px] font-semibold text-[#00D4C8] uppercase tracking-[0.2em] mb-2 px-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {link.label}
                  </div>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center gap-2 px-3 py-3 text-base text-[#E8EDF5]/75 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.05)] rounded-lg transition-all"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-3.5 text-base font-medium rounded-lg transition-all ${
                    location === link.href
                      ? "text-[#00D4C8] bg-[rgba(0,212,200,0.08)]"
                      : "text-[#E8EDF5]/80 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.05)]"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {link.label}
                  <ArrowRight className="w-4 h-4 opacity-40" />
                </Link>
              )
            )}
          </nav>

          {/* Mobile CTAs */}
          <div className="mt-8 space-y-3 border-t border-[rgba(0,212,200,0.1)] pt-6">
            <Link
              href="/connect-ghl"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-xl hover:bg-[#00E8DB] transition-all shadow-[0_0_20px_rgba(0,212,200,0.4)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plug className="w-4 h-4" />
              Connect GoHighLevel
            </Link>
            <Link
              href="/integration-health"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-xl hover:bg-[rgba(0,212,200,0.08)] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Activity className="w-4 h-4" />
              View Integration Health
            </Link>
            <Link
              href="/demo"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#E8EDF5]/70 hover:text-[#E8EDF5] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Open Executive Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {["SOC 2 Type II", "ISO 27001", "FedRAMP Ready"].map((badge) => (
              <span
                key={badge}
                className="text-[10px] text-[#E8EDF5]/30 tracking-wide"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                • {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
