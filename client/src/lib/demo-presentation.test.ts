import { describe, expect, it } from "vitest";
import { FULL_DEMO_STEPS, QUICK_DEMO_STEPS, audienceFraming, commercialAsset, presentationOptions, presentationUrl } from "./demo-presentation";

describe("sales presentation modes", () => {
  it("preserves the certified full sequence", () => expect(FULL_DEMO_STEPS).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13]));
  it("uses the deliberate nine-step quick narrative", () => expect(QUICK_DEMO_STEPS).toEqual([0,1,2,3,4,5,9,8,13]));
  it("defaults to customer full mode", () => expect(presentationOptions("")).toMatchObject({duration:"full", audience:"customer"}));
  it("supports investor quick framing", () => expect(presentationOptions("?mode=quick&audience=investor")).toMatchObject({duration:"quick", audience:"investor", steps:[0,1,2,3,4,5,9,8,13]}));
  it("builds controlled route parameters", () => expect(presentationUrl("quick", "investor")).toBe("/demo/presentation?mode=quick&audience=investor"));
  it("keeps framing separate from ordinary self-guided content", () => expect(audienceFraming.investor).toMatch(/tenant isolation/));
  it("truthfully blocks cinematic certification without approved evidence", () => expect(commercialAsset.status).toBe("blocked"));
});
