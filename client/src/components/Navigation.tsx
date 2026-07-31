// EEOS Navigation — Sovereign Night Design System
// Full-screen mobile drawer, scroll-aware glass bar, active route highlighting

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ArrowRight, Zap } from "lucide-react";
import { startLogin } from "@/const";
import { isCustomerRole, useProductSession } from "@/contexts/ProductSessionContext";
import { useOrganizationTheme } from "@/contexts/OrganizationThemeContext";

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
  "/login",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/invitations/accept",
  "/onboarding",
  "/integrations",
  "/integrations/gohighlevel",
  "/connect-ghl",
  "/dashboard",
  "/location-management",
  "/oauth-success",
  "/oauth-failure",
  "/integration-health",
  "/tenant-confirmation",
  "/prn-onboarding",
  "/executive-home",
  "/executive-automation",
  "/industry-intelligence",
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
  "/c2b-intelligence",
  "/c2c-intelligence",
  "/b2b-intelligence",
  "/operations",
  "/marketing",
  "/financial",
  "/reports",
  "/settings",
  "/intelligence-evolution",
  "/admin",
  "/admin/organizations",
  "/admin/onboarding",
  "/admin/integrations",
  "/admin/platform-health",
  "/admin/audit",
  "/admin/support",
  "/admin/ai-operations",
  "/admin/global-c2c",
  "/admin/global-c2b",
  "/admin/global-b2b",
  "/admin/platform-analytics",
  "/admin/connector-administration",
  "/admin/executive-intelligence",
  "/admin/ai-recommendations",
  "/admin/marketplace",
  "/admin/intelligence-governance",
  "/access-denied",
  "/404",
]);

export const AUTHENTICATED_HEADER_LOGO_SRC = "/eeos-assets/approved/eeos-authenticated-header-brand.png";

type NavItem = {
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
    disabled?: boolean;
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
];

export const OWNER_NAV_LINKS: NavItem[] = [
  { label: "Executive Home", href: "/executive-home" },
  { label: "Executive Automation", href: "/executive-automation" },
  { label: "Industry Intelligence", href: "/industry-intelligence" },
  {
    label: "Command Center",
    href: "#",
    children: [
      { label: "Dashboard", href: "/executive-home" },
      { label: "Executive Intelligence", href: "/ai-recommendations" },
      { label: "Operations", href: "/operations" },
      { label: "Marketing", href: "/marketing" },
      { label: "Financial", href: "/financial" },
      { label: "Reports", href: "/reports" },
      { label: "Integrations", href: "/integration-status" },
      { label: "Settings", href: "/settings" },
      { label: "Intelligence Evolution", href: "/intelligence-evolution" },
    ],
  },
  { label: "C2C Intelligence", href: "/c2c-intelligence" },
  { label: "C2B Intelligence", href: "/c2b-intelligence" },
  { label: "B2B Intelligence", href: "/b2b-intelligence" },
  { label: "Business Health", href: "/business-health" },
  { label: "AI Recommendations", href: "/ai-recommendations" },
  { label: "Live Signals", href: "/live-signals" },
  {
    label: "Intelligence",
    href: "#",
    children: [
      { label: "Executive Timeline", href: "/executive-timeline" },
      { label: "Knowledge Graph", href: "/knowledge-graph" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
  {
    label: "System",
    href: "#",
    children: [
      { label: "Integration Status", href: "/integration-status" },
      { label: "Location Management", href: "/location-management" },
      { label: "System Health", href: "/system-health" },
      { label: "Account", href: "/connect-ghl" },
    ],
  },
];

export const ADMIN_NAV_LINKS: NavItem[] = [
  { label: "Platform Overview", href: "/admin" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Customer Onboarding", href: "/admin/onboarding" },
  { label: "Global Integrations", href: "/admin/integrations" },
  { label: "Platform Health", href: "/admin/platform-health" },
  { label: "Platform Analytics", href: "/admin/platform-analytics" },
  { label: "Connector Administration", href: "/admin/connector-administration" },
  { label: "Executive Intelligence", href: "/admin/executive-intelligence" },
  { label: "AI Recommendations", href: "/admin/ai-recommendations" },
  { label: "Marketplace", href: "/admin/marketplace" },
  { label: "Intelligence Governance", href: "/admin/intelligence-governance" },
  {
    label: "Global Intelligence",
    href: "#",
    children: [
      { label: "Global C2C", href: "/admin/global-c2c" },
      { label: "Global C2B", href: "/admin/global-c2b" },
      { label: "Global B2B", href: "/admin/global-b2b" },
    ],
  },
  {
    label: "Operations",
    href: "#",
    children: [
      { label: "Audit Activity", href: "/admin/audit" },
      { label: "Support", href: "/admin/support" },
      { label: "AI Operations", href: "/admin/ai-operations" },
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
      routeExists: routes.has(child.href) && !child.disabled,
      disabled: child.disabled || !routes.has(child.href),
      deadClickable: false,
    })),
  );
}

function isActiveRoute(currentPath: string, href: string) {
  return href !== "#" && (currentPath === href || currentPath.startsWith(`${href}/`));
}

function isActiveNavItem(currentPath: string, link: NavItem) {
  return isActiveRoute(currentPath, link.href)
    || Boolean(link.children?.some((child) => isActiveRoute(currentPath, child.href)));
}

export default function Navigation() {
  const session = useProductSession();
  const organizationTheme = useOrganizationTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [location] = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const isAdminExperience = location.startsWith("/admin");
  const isOwnerExperience = !isAdminExperience && (location.startsWith("/executive")
    || location.startsWith("/business-health")
    || location.startsWith("/ai-recommendations")
    || location.startsWith("/live-signals")
    || location.startsWith("/integration-status")
    || location.startsWith("/knowledge-graph")
    || location.startsWith("/notifications")
    || location.startsWith("/system-health")
    || location.startsWith("/location-management")
    || location.startsWith("/connect-ghl")
    || location.startsWith("/dashboard")
    || location.startsWith("/c2b-intelligence")
    || location.startsWith("/c2c-intelligence")
    || location.startsWith("/b2b-intelligence")
    || location.startsWith("/operations")
    || location.startsWith("/marketing")
    || location.startsWith("/financial")
    || location.startsWith("/reports")
    || location.startsWith("/settings")
    || location.startsWith("/intelligence-evolution")
    || isCustomerRole(session.role));
  const activeLinks = isAdminExperience ? ADMIN_NAV_LINKS : isOwnerExperience ? OWNER_NAV_LINKS : NAV_LINKS;
  const dropdownInventory = useMemo(() => buildDropdownRouteInventory(activeLinks), [activeLinks]);

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
            <Link href={isOwnerExperience ? "/executive-home" : "/"} className="flex items-center gap-3 group shrink-0">
              {isOwnerExperience && organizationTheme ? (
                <>
                  <span className="organization-logo-surface flex h-12 w-16 items-center justify-center rounded-lg p-1.5">
                    <img
                      src={organizationTheme.logoUrl}
                      alt={`${organizationTheme.organizationName} logo`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>
                  <span className="hidden xl:block leading-tight">
                    <span className="block text-sm font-bold text-white">
                      {organizationTheme.organizationName.replace(/\s+Inc\.?$/i, "")} Command Center
                    </span>
                    <span className="organization-powered-by block text-[10px] font-semibold uppercase tracking-[0.16em]">
                      Powered by EEOS
                    </span>
                  </span>
                </>
              ) : isOwnerExperience || isAdminExperience ? (
                <img
                  src={AUTHENTICATED_HEADER_LOGO_SRC}
                  alt="EEOS Eagle Eye Operating System"
                  className="h-14 w-auto max-w-[112px] object-contain"
                />
              ) : (
                <img
                  src="/eeos-assets/eeos-logo-official.png"
                  alt="EEOS Eagle Eye Operating System"
                  className="h-11 w-auto max-w-[220px] object-contain sm:max-w-[280px]"
                />
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {activeLinks.map((link) =>
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
                        isActiveNavItem(location, link)
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
                            const routeExists = dropdownInventory.some(
                              (item) => item.label === child.label && item.href === child.href && item.routeExists,
                            );
                            return routeExists ? (
                              <Link
                                key={child.href}
                                href={child.href}
                                role="menuitem"
                                onClick={() => setDropdownOpen(null)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm hover:text-[#C9A227] hover:bg-[rgba(201,162,39,0.06)] focus:text-[#C9A227] focus:bg-[rgba(201,162,39,0.06)] focus:outline-none transition-all duration-150 ${
                                  isActiveRoute(location, child.href)
                                    ? "text-[#C9A227] bg-[rgba(201,162,39,0.08)]"
                                    : "text-[#FFFFFF]/75"
                                }`}
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
                      isActiveRoute(location, link.href)
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
              {isOwnerExperience && session.role === "PLATFORM_ADMIN" ? (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white transition-colors"
                >
                  Back to Admin
                </Link>
              ) : null}
              {isOwnerExperience || isAdminExperience ? (
                <Link
                  href={isAdminExperience ? "/admin" : "/executive-home"}
                  className="px-4 py-2 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-md hover:bg-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.6)] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isAdminExperience ? "Admin Console" : session.organization?.name ?? "Command Center"}
                </Link>
              ) : (
                <>
                  <Link
                    href="/demo"
                    className="px-4 py-2 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.3)] rounded-md hover:bg-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.6)] transition-all duration-200"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Request Demo
                  </Link>
                  <button
                    type="button"
                    onClick={() => startLogin()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-md hover:bg-[#D8B84A] transition-all duration-200 shadow-[0_0_16px_rgba(201,162,39,0.35)]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                </>
              )}
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
            {activeLinks.map((link) =>
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
                        className={`flex items-center gap-2 px-3 py-3 text-base hover:text-[#C9A227] hover:bg-[rgba(201,162,39,0.05)] rounded-lg transition-all ${
                          isActiveRoute(location, child.href)
                            ? "text-[#C9A227] bg-[rgba(201,162,39,0.08)]"
                            : "text-[#FFFFFF]/75"
                        }`}
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
                    isActiveRoute(location, link.href)
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
            {isOwnerExperience && session.role === "PLATFORM_ADMIN" ? (
              <Link
                href="/admin"
                className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white/70"
              >
                Back to Admin
              </Link>
            ) : null}
            {isOwnerExperience || isAdminExperience ? (
              <Link
                href={isAdminExperience ? "/admin" : "/executive-home"}
                className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-xl hover:bg-[#D8B84A] transition-all shadow-[0_0_20px_rgba(201,162,39,0.4)]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {isAdminExperience ? "Open Admin Console" : "Open Owner Command Center"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/demo"
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#0B0B0B] bg-[#C9A227] rounded-xl hover:bg-[#D8B84A] transition-all shadow-[0_0_20px_rgba(201,162,39,0.4)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Request Demo
                </Link>
                <button
                  type="button"
                  onClick={() => startLogin()}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[#C9A227] border border-[rgba(201,162,39,0.35)] rounded-xl hover:bg-[rgba(201,162,39,0.08)] transition-all"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Zap className="w-4 h-4" />
                  Sign In
                </button>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {["Secure owner access", "Tenant isolation", "GoHighLevel-first"].map((badge) => (
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
