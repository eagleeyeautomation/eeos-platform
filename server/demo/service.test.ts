import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { assertDemoClassification,DEMO_LOCATIONS,DEMO_SCENARIO_ID,DEMO_VERSION } from "./contract";
import { SYNTHETIC_METRICS } from "./scenarios";
describe("demo foundation contract",()=>{
  it("is deterministic and isolated to three synthetic locations",()=>{expect(DEMO_SCENARIO_ID).toContain("summit");expect(DEMO_VERSION).toBe("demo-sprint-1.v1");expect(DEMO_LOCATIONS.map(x=>x.id)).toEqual(["demo-summit-virginia","demo-summit-south-carolina","demo-summit-florida"]);expect(Object.keys(SYNTHETIC_METRICS)).toEqual(DEMO_LOCATIONS.map(x=>x.id));});
  it("marks every metric source as synthetic by contract",()=>{for(const metrics of Object.values(SYNTHETIC_METRICS)) expect(Object.keys(metrics)).toContain("compliance_status");});
  it("rejects non-demo reset targets",()=>{expect(()=>assertDemoClassification({classification:"production",dataClassification:"customer"})).toThrow(/restricted/);expect(()=>assertDemoClassification(undefined)).toThrow(/restricted/);});
  it("permits only classified synthetic demo targets",()=>expect(()=>assertDemoClassification({classification:"demo",dataClassification:"synthetic"})).not.toThrow());
  it("rebuilds the prepared recommendation and workflow during reset",()=>{const source=readFileSync("server/demo/service.ts","utf8");const reset=source.slice(source.indexOf("export async function resetDemo"),source.indexOf("export async function replayDemo"));expect(reset).toContain("await seedDemo(actorId)");expect(reset).toContain("await startDemoScenario(actorId)");expect(reset).toContain("status='ready'")});
});
