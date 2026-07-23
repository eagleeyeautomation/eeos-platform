// EEOS Navigation — Sovereign Night Design System
// Full-screen mobile drawer, scroll-aware glass bar, active route highlighting

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ArrowRight, Zap, Plug, Activity } from "lucide-react";

export const AVAILABLE_NAV_ROUTES = new Set([
  "/",
  "/why-eeos",
  "/features",
  "/industries",
  "/pricing",
  "/security",
  "/demo",
  "/about",
  "/contact",
  "/onboarding",
  "/integrations",
  "/integrations/gohighlevel",
  "/connect-ghl",
  "/dashboard",
  "/oauth-success",
  "/oauth-failure",
  "/integration-health",
  "/tenant-confirmation",
  "/prn-onboarding",
  "/executive-home",
  "/live-status",
  "/connected-apps",
  "/system-health",
  "/notifications",
  "/business-health",
  "/ai-recommendations",
  "/live-signals",
  "/integration-status",
  "/executive-timeline",
  "/knowledge-graph",
  "/executive-dashboard",
  "/admin-bootstrap",
  "/404",
]);

type NavItem = {
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
};

export const NAV_LINKS: NavItem[] = [
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
      { label: "Live Signal Status", href: "/live-status" },
      { label: "Connected Apps", href: "/connected-apps" },
      { label: "PRN Staffers Setup", href: "/prn-onboarding" },
    ],
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    children: [
      { label: "Executive Dashboard", href: "/dashboard" },
      { label: "Executive Home", href: "/executive-home" },
      { label: "Business Health", href: "/business-health" },
      { label: "AI Recommendations", href: "/ai-recommendations" },
      { label: "Live Signals", href: "/live-signals" },
      { label: "Integration Status", href: "/integration-status" },
      { label: "Executive Timeline", href: "/executive-timeline" },
      { label: "Knowledge Graph", href: "/knowledge-graph" },
      { label: "System Health", href: "/system-health" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
];

export function buildDropdownRouteInventory(
  links: NavItem[] = NAV_LINKS,
  routes: Set<string> = AVAILABLE_NAV_ROUTES,
) {
  return links.flatMap((link) =>
    (link.children ?? []).map((child) => ({
      parent: link.label,
      label: child.label,
      href: child.href,
      routeExists: routes.has(child.href),
      disabled: !routes.has(child.href),
      deadClickable: false,
    })),
  );
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [location] = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const dropdownInventory = useMemo(() => buildDropdownRouteInventory(), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(null);
  }, [location]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!dropdownOpen) return;
      if (headerRef.current?.contains(event.target as Node)) return;
      setDropdownOpen(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [dropdownOpen]);

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
        ref={headerRef}
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
                  className="text-[#FFFFFF] font-bold text-base tracking-tight leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Eagle Eye Automation
                </span>
                <span
                  className="text-[#C9A227] text-[9px] tracking-[0.15em] uppercase font-medium hidden sm:block mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  EEOS · Don't Build More. Build Accurate.
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
                  >
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={dropdownOpen === link.label}
                      onClick={() => setDropdownOpen((open) => open === link.label ? null : link.label)}
                      className={`flex items-center gap-1 px-4 py-2 text-sm transition-colors duration-200 font-medium focus:outline-none ${
                        link.href !== "#" && location === link.href
                          ? "text-[#C9A227]"
                          : "text-[#FFFFFF]/75 hover:text-[#C9A227] focus:text-[#C9A227]"
                      }`}
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
                      <div
                        className="absolute top-full left-0 z-[60] pt-2"
                        onMouseEnter={() => setDropdownOpen(link.label)}
                      >
                        <div className="w-56 glass-card rounded-lg overflow-hidden shadow-xl" role="menu" aria-label={`${link.label} menu`}>
                          {link.children.map((child) => {
                            const routeExists = AVAILABLE_NAV_ROUTES.has(child.href);
                            return routeExists ? (
                              <Link
                                key={child.href}
                                href={child.href}
                                role="menuitem"
                                onClick={() => setDropdownOpen(null)}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-[#FFFFFF]/75 hover:text-[#C9A227] hover:bg-[rgba(201,162,39,0.06)] focus:text-[#C9A227] focus:bg-[rgba(201,162,39,0.06)] focus:outline-none transition-all duration-150"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                              >
                                {child.label}
                              </Link>
                            ) : (
                              <span
                                key={child.href}
                                role="menuitem"
                                aria-disabled="true"
                                className="flex cursor-not-allowed items-center justify-between gap-2 px-4 py-3 text-sm text-[#FFFFFF]/35"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                              >
                                {child.label}
                                <span className="text-[10px] uppercase tracking-[0.14em] text-[#FFFFFF]/25">Coming soon</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      location === link.href
                        ? "text-[#C9A227]"
                        : "text-[#FFFFFF]/75 hover:text-[#C9A227]"
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
                className="px-4 py-2 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-md hover:bg-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.6)] transition-all duration-200"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Request Demo
              </Link>
              <Link
                href="/connect-ghl"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-md hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_16px_rgba(201,162,39,0.35)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Zap className="w-3.5 h-3.5" />
                Start Private Beta
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-[#FFFFFF]/80 hover:text-[#C9A227] transition-colors rounded-md"
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
        style={{ background: "rgba(11, 11, 11, 0.98)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex flex-col h-full pt-20 pb-8 px-6 overflow-y-auto">
          {/* Nav Links */}
          <nav className="flex-1 space-y-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label} className="py-2">
                  {link.href !== "#" ? (
                    <Link
                      href={link.href}
                      className="mb-2 flex items-center justify-between rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A227] hover:bg-[rgba(201,162,39,0.05)]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {link.label}
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </Link>
                  ) : (
                    <div
                      className="text-[10px] font-semibold text-[#C9A227] uppercase tracking-[0.2em] mb-2 px-2"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {link.label}
                    </div>
                  )}
                  {link.children.map((child) => {
                    const routeExists = dropdownInventory.some((item) => item.href === child.href && item.routeExists);
                    return routeExists ? (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center gap-2 px-3 py-3 text-base text-[#FFFFFF]/75 hover:text-[#C9A227] hover:bg-[rgba(201,162,39,0.05)] rounded-lg transition-all"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40" />
                        {child.label}
                      </Link>
                    ) : (
                      <span
                        key={child.href}
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center justify-between gap-2 px-3 py-3 text-base text-[#FFFFFF]/35 rounded-lg"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <span className="flex items-center gap-2">
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-25" />
                          {child.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#FFFFFF]/25">Coming soon</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-3.5 text-base font-medium rounded-lg transition-all ${
                    location === link.href
                      ? "text-[#C9A227] bg-[rgba(201,162,39,0.08)]"
                      : "text-[#FFFFFF]/80 hover:text-[#C9A227] hover:bg-[rgba(201,162,39,0.05)]"
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
          <div className="mt-8 space-y-3 border-t border-[rgba(201,162,39,0.1)] pt-6">
            <Link
              href="/connect-ghl"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-xl hover:bg-[#D8B84A] transition-all shadow-[0_0_20px_rgba(201,162,39,0.4)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Plug className="w-4 h-4" />
              Connect GoHighLevel
            </Link>
            <Link
              href="/integration-health"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.35)] rounded-xl hover:bg-[rgba(201,162,39,0.08)] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Activity className="w-4 h-4" />
              View Integration Health
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#FFFFFF]/70 hover:text-[#FFFFFF] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              aria-label="Open Executive Dashboard"
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
                className="text-[10px] text-[#FFFFFF]/30 tracking-wide"
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
