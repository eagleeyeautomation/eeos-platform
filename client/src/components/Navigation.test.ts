import { describe, expect, it } from "vitest";
import { AVAILABLE_NAV_ROUTES, NAV_LINKS, buildDropdownRouteInventory } from "./Navigation";

describe("Navigation dropdown route inventory", () => {
  const inventory = buildDropdownRouteInventory();

  it("includes the Dashboard dropdown and verifies its primary route exists", () => {
    expect(inventory).toContainEqual(expect.objectContaining({
      parent: "Dashboard",
      label: "Executive Dashboard",
      href: "/dashboard",
      routeExists: true,
      disabled: false,
      deadClickable: false,
    }));
  });

  it("wires Connect GoHighLevel to the real connection route", () => {
    expect(inventory).toContainEqual(expect.objectContaining({
      parent: "Connect",
      label: "Connect GoHighLevel",
      href: "/connect-ghl",
      routeExists: true,
      disabled: false,
      deadClickable: false,
    }));
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
    const dropdownChildren = NAV_LINKS.flatMap((item) => item.children ?? []);

    expect(dropdownChildren.every((child) => AVAILABLE_NAV_ROUTES.has(child.href))).toBe(true);
  });
});
