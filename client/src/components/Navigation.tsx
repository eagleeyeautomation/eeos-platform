// EEOS Navigation — Sovereign Night Design System
// Floating glass bar with backdrop-blur, transitions to opaque on scroll

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";

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
      { label: "Contact", href: "/contact" },
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "nav-glass shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
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
              <span className="text-[#00D4C8] text-[9px] tracking-[0.15em] uppercase font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Eagle Eye Automation
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setDropdownOpen(link.label)}
                  onMouseLeave={() => setDropdownOpen(null)}
                >
                  <button className="flex items-center gap-1 px-4 py-2 text-sm text-[#E8EDF5]/80 hover:text-[#00D4C8] transition-colors duration-200 font-medium"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {link.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen === link.label ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen === link.label && (
                    <div className="absolute top-full left-0 mt-1 w-48 glass-card rounded-lg overflow-hidden animate-fade-in">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-3 text-sm text-[#E8EDF5]/80 hover:text-[#00D4C8] hover:bg-[rgba(0,212,200,0.05)] transition-all duration-150"
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
                      : "text-[#E8EDF5]/80 hover:text-[#00D4C8]"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/demo"
              className="px-4 py-2 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-md hover:bg-[rgba(0,212,200,0.08)] hover:border-[rgba(0,212,200,0.6)] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Live Demo
            </Link>
            <Link
              href="/onboarding"
              className="px-4 py-2 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md hover:bg-[#00E8DB] transition-all duration-200 shadow-[0_0_16px_rgba(0,212,200,0.35)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Request Access
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-[#E8EDF5]/80 hover:text-[#00D4C8] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden nav-glass border-t border-[rgba(0,212,200,0.1)] animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label}>
                  <div className="px-3 py-2 text-sm font-semibold text-[#00D4C8] uppercase tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
                    {link.label}
                  </div>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block px-6 py-2 text-sm text-[#E8EDF5]/80 hover:text-[#00D4C8] transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-sm font-medium text-[#E8EDF5]/80 hover:text-[#00D4C8] transition-colors"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {link.label}
                </Link>
              )
            )}
            <div className="pt-4 pb-2 flex flex-col gap-2">
              <Link
                href="/demo"
                className="w-full text-center px-4 py-2.5 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-md"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Live Demo
              </Link>
              <Link
                href="/onboarding"
                className="w-full text-center px-4 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-md"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
