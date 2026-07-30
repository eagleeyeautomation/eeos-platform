import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useProductSession } from "@/contexts/ProductSessionContext";
import {
  isOrganizationWorkspacePath,
  organizationThemeStyle,
  resolveOrganizationTheme,
} from "@/lib/organization-theme";
import type { OrganizationTheme } from "@/config/organization-themes";

const OrganizationThemeContext = createContext<OrganizationTheme | null>(null);

export function OrganizationThemeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const session = useProductSession();
  const theme = session.authenticated && isOrganizationWorkspacePath(location)
    ? resolveOrganizationTheme(session.organization)
    : null;

  return (
    <OrganizationThemeContext.Provider value={theme}>
      {theme ? (
        <div
          className="organization-workspace min-h-screen"
          data-organization-workspace="true"
          data-organization-slug={theme.organizationSlug}
          style={organizationThemeStyle(theme)}
        >
          {children}
        </div>
      ) : children}
    </OrganizationThemeContext.Provider>
  );
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}

