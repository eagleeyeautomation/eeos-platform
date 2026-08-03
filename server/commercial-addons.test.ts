import { describe, expect, it } from "vitest";
import {
  assertCommercialAddonGrantAllowed,
  assertExternalExecutionBlocked,
  calculateCommercialMonthlyTotal,
  classifyOrganizationForBilling,
  mapLegacyPlanToBasePlan,
  resolveCommercialAddonAccess,
} from "./commercial-addons";

describe("commercial add-on billing policy", () => {
  it("preserves approved base-plan version 2 mapping", () => {
    expect(mapLegacyPlanToBasePlan("starter")).toMatchObject({ marketingName: "Starter", code: "FOUNDATION", monthlyPrice: 99 });
    expect(mapLegacyPlanToBasePlan("professional")).toMatchObject({ marketingName: "Growth", code: "INTELLIGENCE", monthlyPrice: 199 });
    expect(mapLegacyPlanToBasePlan("enterprise")).toMatchObject({ marketingName: "Scale", code: "ENTERPRISE", monthlyPrice: 299 });
  });

  it("keeps PRN Staffers and Summit Demo non-billed", () => {
    expect(classifyOrganizationForBilling({ slug: "prn-staffers", name: "PRN Staffers", organizationType: "customer" })).toBe("INTERNAL_FOUNDER");
    expect(classifyOrganizationForBilling({ slug: "summit-demo", name: "Summit Demo", organizationType: "customer" })).toBe("INTERNAL_DEMO");
    expect(classifyOrganizationForBilling({ slug: "eea", name: "Eagle Eye Automation", organizationType: "platform_owner" })).toBe("INTERNAL_FOUNDER");
  });

  it("classifies new external organizations as commercial", () => {
    expect(classifyOrganizationForBilling({ slug: "abc-hvac", name: "ABC HVAC", organizationType: "customer" })).toBe("COMMERCIAL");
    expect(() => assertCommercialAddonGrantAllowed("COMMERCIAL")).not.toThrow();
    expect(() => assertCommercialAddonGrantAllowed("INTERNAL_FOUNDER")).toThrow(/new external commercial organizations/i);
  });

  it("deduplicates suite overlap and keeps approved pricing", () => {
    const resolved = resolveCommercialAddonAccess(["ADDON_GROWTH_INTELLIGENCE_SUITE", "ADDON_C2C_INTELLIGENCE"]);
    expect(resolved).toEqual(expect.arrayContaining([
      "ADDON_GROWTH_INTELLIGENCE_SUITE",
      "ADDON_C2C_INTELLIGENCE",
      "ADDON_C2B_INTELLIGENCE",
      "ADDON_B2B_INTELLIGENCE",
    ]));
    expect(calculateCommercialMonthlyTotal("INTELLIGENCE", ["ADDON_C2C_INTELLIGENCE"])).toBe(298);
    expect(calculateCommercialMonthlyTotal("INTELLIGENCE", ["ADDON_GROWTH_INTELLIGENCE_SUITE", "ADDON_C2C_INTELLIGENCE"])).toBe(498);
  });

  it("blocks external execution and does not imply charging", () => {
    expect(assertExternalExecutionBlocked()).toEqual({
      allowed: false,
      status: "blocked",
      reason: expect.stringContaining("No payment provider is integrated"),
    });
  });
});
