import { useOrganizationTheme } from "@/contexts/OrganizationThemeContext";
import { useProductSession } from "@/contexts/ProductSessionContext";

export default function OrganizationWelcomeBanner() {
  const theme = useOrganizationTheme();
  const session = useProductSession();
  const isLicensingLab = session.organization?.name?.toLowerCase().includes("eeos commercial licensing lab") ?? false;
  if (!theme) return null;

  return (
    <div className="mb-8 space-y-4">
      {isLicensingLab ? (
        <section className="rounded-2xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F6E6A7]">SYNTHETIC COMMERCIAL LICENSING LAB</p>
          <p className="mt-2 text-sm text-white/70">Internal certification only. Do not bill. No customer data. No external execution.</p>
        </section>
      ) : null}
      <section className="organization-welcome-banner flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center">
        <div className="organization-logo-surface flex h-20 w-28 shrink-0 items-center justify-center rounded-xl p-2">
          <img
            src={theme.logoUrl}
            alt={`${theme.organizationName} logo`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div>
          <p className="organization-powered-by text-xs font-semibold uppercase tracking-[0.18em]">
            Powered by EEOS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {theme.organizationName.replace(/\s+Inc\.?$/i, "")} Command Center
          </h1>
          <p className="mt-1 text-sm opacity-75">
            Your organization’s live business health, signals, and recommendations.
          </p>
        </div>
      </section>
    </div>
  );
}
