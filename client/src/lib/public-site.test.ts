import { describe, expect, it } from "vitest";
import {
  ADDON_DISPLAY_DISCLOSURES,
  FOUNDING_CUSTOMER_PLANS,
  OPTIONAL_INTELLIGENCE_ADDONS,
} from "./public-site";

const approvedAddons = [
  "C2C Intelligence Pack",
  "C2B Intelligence Pack",
  "B2B Intelligence Pack",
  "Growth Intelligence Suite",
  "Additional Location",
  "Additional User Pack",
  "Additional Industry Pack",
  "Advanced Connector Pack",
  "Custom Branding",
  "API Access",
  "Priority Support",
  "Data Retention Extension",
  "Onboarding and Training",
];

describe("public pricing add-on catalog", () => {
  it("displays every approved customer-visible add-on", () => {
    expect(OPTIONAL_INTELLIGENCE_ADDONS.map((addon) => addon.name)).toEqual(approvedAddons);
  });

  it("keeps approved base plan and intelligence add-on prices unchanged", () => {
    expect(FOUNDING_CUSTOMER_PLANS.map((plan) => [plan.name, plan.price])).toEqual([
      ["Starter", "$99"],
      ["Growth", "$199"],
      ["Scale", "$299"],
    ]);
    expect(OPTIONAL_INTELLIGENCE_ADDONS.slice(0, 4).map((addon) => [addon.name, addon.price])).toEqual([
      ["C2C Intelligence Pack", "$99"],
      ["C2B Intelligence Pack", "$149"],
      ["B2B Intelligence Pack", "$149"],
      ["Growth Intelligence Suite", "$299"],
    ]);
  });

  it("uses approved ranges or contact-sales language for non-intelligence add-ons", () => {
    expect(Object.fromEntries(OPTIONAL_INTELLIGENCE_ADDONS.map((addon) => [addon.name, addon.price]))).toMatchObject({
      "Additional Location": "$49-$99",
      "Additional User Pack": "Contact Sales",
      "Additional Industry Pack": "$49-$99",
      "Advanced Connector Pack": "$99-$249",
      "Custom Branding": "$99",
      "API Access": "$199-$499",
      "Priority Support": "$199-$499",
      "Data Retention Extension": "Contact Sales",
      "Onboarding and Training": "$1,500-$10,000",
    });
  });

  it("requires explanation fields for every add-on", () => {
    for (const addon of OPTIONAL_INTELLIGENCE_ADDONS) {
      expect(addon).toMatchObject({
        billingType: expect.any(String),
        basePlanRequirement: expect.stringContaining("active EEOS base plan"),
        whatItDoes: expect.any(String),
        whoItHelps: expect.any(String),
        exampleUseCase: expect.any(String),
        exclusions: expect.any(String),
      });
      expect(addon.includedCapabilities.length).toBeGreaterThan(0);
    }
  });

  it("keeps no-checkout and no-guarantee disclosures visible", () => {
    expect(ADDON_DISPLAY_DISCLOSURES).toEqual(expect.arrayContaining([
      "Add-ons require an active EEOS base plan.",
      "Third-party service charges may be separate.",
      "Human approval remains required for governed actions.",
      "External execution is not included.",
      "Results, leads, referrals, revenue, or conversions are not guaranteed.",
    ]));
  });
});
