import { describe, expect, it } from "vitest";
import { INDUSTRY_KEYS, INDUSTRY_PACKS, resolveIndustryContext, scoreIndustryOpportunity } from "./core";

describe("industry intelligence packs", () => {
  it("covers every certified industry with one pack contract", () => {
    expect(Object.keys(INDUSTRY_PACKS)).toHaveLength(INDUSTRY_KEYS.length);
    for (const key of INDUSTRY_KEYS) expect(INDUSTRY_PACKS[key]).toMatchObject({ key, kpis: expect.any(Array), intelligence: { c2c: expect.any(Array), c2b: expect.any(Array), b2b: expect.any(Array) } });
  });
  it("merges multiple packs without duplicate knowledge", () => {
    const context = resolveIndustryContext(["home-care", "healthcare", "home-care"]);
    expect(context.packs).toHaveLength(2); expect(new Set(context.kpis).size).toBe(context.kpis.length);
  });
  it("uses executive terminology from the primary pack", () => expect(resolveIndustryContext(["churches", "hvac"]).terminology.customer).toBe("Member"));
  it("refuses unsupported opportunity scoring", () => expect(scoreIndustryOpportunity({ evidenceCount: 0, strategicFit: 100, conversionPotential: 100, complianceRisk: 0 })).toMatchObject({ eligible: false, score: 0 }));
});
