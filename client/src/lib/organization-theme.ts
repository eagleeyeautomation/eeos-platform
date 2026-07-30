import type { CSSProperties } from "react";
import {
  ORGANIZATION_THEMES,
  type OrganizationTheme,
} from "@/config/organization-themes";

export type OrganizationIdentity = {
  id?: string;
  name: string;
  slug?: string;
  logoUrl?: string;
};

const WORKSPACE_PATHS = [
  "/executive",
  "/business-health",
  "/ai-recommendations",
  "/live-signals",
  "/live-status",
  "/connected-apps",
  "/integration-status",
  "/knowledge-graph",
  "/notifications",
  "/system-health",
  "/location-management",
  "/connect-ghl",
  "/dashboard",
] as const;

function normalize(value: string | undefined) {
  return value?.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function isOrganizationWorkspacePath(pathname: string) {
  return !pathname.startsWith("/admin")
    && WORKSPACE_PATHS.some((prefix) =>
      pathname === prefix
      || pathname.startsWith(`${prefix}/`)
      || (prefix === "/executive" && pathname.startsWith("/executive-")),
    );
}

export function resolveOrganizationTheme(
  organization: OrganizationIdentity | null,
  themes: readonly OrganizationTheme[] = ORGANIZATION_THEMES,
) {
  if (!organization) return null;
  const slug = normalize(organization.slug);
  const name = normalize(organization.name);
  return themes.find((theme) =>
    (slug && normalize(theme.organizationSlug) === slug)
    || normalize(theme.organizationName) === name,
  ) ?? null;
}

export type OrganizationThemeStyle = CSSProperties & Record<`--organization-${string}`, string>;

export function organizationThemeStyle(theme: OrganizationTheme): OrganizationThemeStyle {
  return {
    "--organization-primary": theme.colors.primary,
    "--organization-secondary": theme.colors.secondary,
    "--organization-background": theme.colors.background,
    "--organization-surface": theme.colors.surface,
    "--organization-neutral": theme.colors.neutral,
    "--organization-supporting": theme.colors.supporting,
    "--organization-on-primary": theme.colors.onPrimary,
  };
}
