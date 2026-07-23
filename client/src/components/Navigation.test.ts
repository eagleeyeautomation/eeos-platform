import { describe, expect, it } from "vitest";
import { ADMIN_NAV_LINKS, AVAILABLE_NAV_ROUTES, NAV_LINKS, OWNER_NAV_LINKS, buildDropdownRouteInventory } from "./Navigation";

describe("Navigation dropdown route inventory", () => {
  const inventory = buildDropdownRouteInventory();

  it("keeps public navigation focused on sales pages", () => {
    expect(NAV_LINKS.map((item) => item.label)).toEqual([
      "Why EEOS",
      "Features",
      "Industries",
      "Pricing",
      "Security",
      "Company",
    ]);
    expect(NAV_LINKS.some((item) => item.href.startsWith("/admin"))).toBe(false);
  });

  it("keeps owner navigation out of public sales routes", () => {
    expect(OWNER_NAV_LINKS.some((item) => item.href === "/pricing")).toBe(false);
    expect(OWNER_NAV_LINKS.map((item) => item.href)).toContain("/executive-home");
    expect(buildDropdownRouteInventory(OWNER_NAV_LINKS)).toContainEqual(expect.objectContaining({
      parent: "System",
      label: "Integration Status",
      href: "/integration-status",
      routeExists: true,
    }));
  });

  it("keeps admin navigation under the admin route prefix", () => {
    const adminRoutes = ADMIN_NAV_LINKS.flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);

    expect(adminRoutes.every((href) => href === "#" || href.startsWith("/admin"))).toBe(true);
    expect(adminRoutes).toContain("/admin/organizations");
  });

  it("wires GoHighLevel integration when the route exists", () => {
    expect(AVAILABLE_NAV_ROUTES.has("/integrations/gohighlevel")).toBe(true);
  });

  it("has no dead clickable dropdown items", () => {
    expect(inventory.filter((item) => item.deadClickable)).toEqual([]);
  });

  it("marks unbuilt dropdown destinations disabled instead of dead-clickable", () => {
    const [item] = buildDropdownRouteInventory([
      {
        label: "Test",
        href: "#",
        children: [{ label: "Future Page", href: "/future-page" }],
      },
    ]);

    expect(item).toMatchObject({
      routeExists: false,
      disabled: true,
      deadClickable: false,
    });
  });

  it("keeps every current dropdown child pointed at an existing route", () => {
    const dropdownChildren = [...NAV_LINKS, ...OWNER_NAV_LINKS, ...ADMIN_NAV_LINKS].flatMap((item) => item.children ?? []);

    expect(dropdownChildren.every((child) => AVAILABLE_NAV_ROUTES.has(child.href))).toBe(true);
  });
});
