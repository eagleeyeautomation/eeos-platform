import { describe, expect, it } from "vitest";
import { canAccessOwnerRoute } from "./RouteGuards";

describe("OwnerRoute organization-scoped role selection", () => {
  it("allows a dual-role platform admin only with an organization-owner context", () => {
    expect(canAccessOwnerRoute("PLATFORM_ADMIN", "ORGANIZATION_OWNER")).toBe(true);
    expect(canAccessOwnerRoute("PLATFORM_ADMIN", null)).toBe(false);
    expect(canAccessOwnerRoute("PLATFORM_ADMIN", "LOCATION_MANAGER")).toBe(false);
    expect(canAccessOwnerRoute("PLATFORM_ADMIN", "STAFF")).toBe(false);
    expect(canAccessOwnerRoute("PLATFORM_ADMIN", "READ_ONLY")).toBe(false);
  });

  it("preserves existing customer-role access for non-platform users", () => {
    expect(canAccessOwnerRoute("ORGANIZATION_OWNER", "ORGANIZATION_OWNER")).toBe(true);
    expect(canAccessOwnerRoute("LOCATION_MANAGER", "LOCATION_MANAGER")).toBe(true);
    expect(canAccessOwnerRoute("STAFF", "STAFF")).toBe(true);
    expect(canAccessOwnerRoute("READ_ONLY", "READ_ONLY")).toBe(true);
  });
});
