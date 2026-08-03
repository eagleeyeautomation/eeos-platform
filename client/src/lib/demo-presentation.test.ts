import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { FULL_DEMO_STEPS, QUICK_DEMO_STEPS, audienceFraming, commercialAsset, presentationOptions, presentationUrl } from "./demo-presentation";

describe("sales presentation modes", () => {
  it("preserves the certified full sequence", () => expect(FULL_DEMO_STEPS).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13]));
  it("uses the deliberate nine-step quick narrative", () => expect(QUICK_DEMO_STEPS).toEqual([0,1,2,3,4,5,9,8,13]));
  it("defaults to customer full mode", () => expect(presentationOptions("")).toMatchObject({duration:"full", audience:"customer"}));
  it("supports investor quick framing", () => expect(presentationOptions("?mode=quick&audience=investor")).toMatchObject({duration:"quick", audience:"investor", steps:[0,1,2,3,4,5,9,8,13]}));
  it("builds controlled route parameters", () => expect(presentationUrl("quick", "investor")).toBe("/demo/presentation?mode=quick&audience=investor"));
  it("keeps framing separate from ordinary self-guided content", () => expect(audienceFraming.investor).toMatch(/tenant isolation/));
  it("registers the approved cinematic delivery assets", () => expect(commercialAsset).toMatchObject({status:"ready",video:"/eeos-assets/demo/eeos-commercial-1080p-web.mp4",poster:"/eeos-assets/demo/eeos-commercial-poster.jpg",captions:"/eeos-assets/demo/eeos-commercial.en.vtt"}));
  it.each([
    ["eeos-commercial-1080p-web.mp4","b080d85adf876a606c22609872faf243c1a906c4e6872f1caa149e4bba444625"],
    ["eeos-commercial-poster.jpg","285a5434669b65ceca4a89f0903e9b402dd147134ddde64cd095aa8c5acabaaa"],
    ["eeos-commercial.en.vtt","965d4764b7e1aca5b897b76c2e21bbb6d84ae17c494781c8c550f5262f64e352"],
  ])("ships the checksum-approved asset %s",(name,expected)=>{const data=readFileSync(`client/public/eeos-assets/demo/${name}`);expect(createHash("sha256").update(data).digest("hex")).toBe(expected)});
  it("captions spoken narration without inventing visual-only closing slogans",()=>{const captions=readFileSync("client/public/eeos-assets/demo/eeos-commercial.en.vtt","utf8");expect(captions).toContain("EEOS. Fortune 500 Intelligence.");expect(captions).not.toContain("Stop Managing")});
});
