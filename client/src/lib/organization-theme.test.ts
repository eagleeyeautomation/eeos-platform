import { describe, expect, it } from "vitest";
import { ORGANIZATION_THEMES } from "@/config/organization-themes";
import {
  isOrganizationWorkspacePath,
  organizationThemeStyle,
  resolveOrganizationTheme,
} from "@/lib/organization-theme";

describe("organization theme engine", () => {
  it("resolves exact stored logo-derived colors for PRN Staffers", () => {
    const theme = resolveOrganizationTheme({ name: "PRN Staffers Inc." });
    expect(theme?.colors).toEqual({
      primary: "#062465",
      secondary: "#98D6E3",
      background: "#FFFFFF",
      surface: "#FDFDFD",
      neutral: "#F0F0F0",
      supporting: "#6AA1BE",
      onPrimary: "#FFFFFF",
    });
    expect(organizationThemeStyle(theme!)).toMatchObject({
      "--organization-primary": "#062465",
      "--organization-secondary": "#98D6E3",
    });
  });

  it("supports future organizations through data rather than component changes", () => {
    const themes = [
      ...ORGANIZATION_THEMES,
      {
        ...ORGANIZATION_THEMES[0],
        organizationName: "Future Health",
        organizationSlug: "future-health",
        colors: { ...ORGANIZATION_THEMES[0].colors, primary: "#123456" },
      },
    ];
    expect(resolveOrganizationTheme({ name: "Future Health" }, themes)?.colors.primary).toBe("#123456");
  });

  it("does not leak an organization theme into EEOS or admin routes", () => {
    expect(isOrganizationWorkspacePath("/executive-home")).toBe(true);
    expect(isOrganizationWorkspacePath("/location-management")).toBe(true);
    expect(isOrganizationWorkspacePath("/admin/organizations")).toBe(false);
    expect(isOrganizationWorkspacePath("/login")).toBe(false);
    expect(isOrganizationWorkspacePath("/")).toBe(false);
  });
});
