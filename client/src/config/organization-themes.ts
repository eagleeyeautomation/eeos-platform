export type OrganizationTheme = {
  organizationName: string;
  organizationSlug: string;
  logoUrl: string;
  sourceAssetSha256: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    neutral: string;
    supporting: string;
    onPrimary: string;
  };
};

/**
 * Persisted output of the logo-branding pipeline. Brand colors are sampled
 * from the uploaded source asset; workspace components consume semantic
 * tokens and never contain customer-specific color literals.
 */
export const ORGANIZATION_THEMES: readonly OrganizationTheme[] = [
  {
    organizationName: "PRN Staffers Inc.",
    organizationSlug: "prn-staffers",
    logoUrl: "/organization-assets/prn-staffers/logo.png",
    sourceAssetSha256: "8790ad9eb90e3e2d68f3092c9e2e11c4c07a2d81b2e5b910e78e741ff21aa8d8",
    colors: {
      primary: "#062465",
      secondary: "#98D6E3",
      background: "#FFFFFF",
      surface: "#FDFDFD",
      neutral: "#F0F0F0",
      supporting: "#6AA1BE",
      onPrimary: "#FFFFFF",
    },
  },
] as const;

