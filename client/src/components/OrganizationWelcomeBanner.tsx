import { useOrganizationTheme } from "@/contexts/OrganizationThemeContext";

export default function OrganizationWelcomeBanner() {
  const theme = useOrganizationTheme();
  if (!theme) return null;

  return (
    <section className="organization-welcome-banner mb-8 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center">
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
  );
}

