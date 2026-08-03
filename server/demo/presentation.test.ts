import { describe,expect,it } from "vitest";
import { FLAGSHIP_PRESENTATION,presentationStep,safeCopilotAnswer } from "./presentation";

describe("flagship guided presentation contract",()=>{
  it("defines the exact fourteen-step executive story in order",()=>{
    expect(FLAGSHIP_PRESENTATION.steps).toHaveLength(14);
    expect(FLAGSHIP_PRESENTATION.steps.map(step=>step.id)).toEqual(["opening","welcome","health","brain","recommendation","copilot","timeline","intelligence","industry","automation","goals","learning","governance","closing"]);
  });
  it("stays within the 15–20 minute presentation target",()=>expect(FLAGSHIP_PRESENTATION.steps.reduce((sum,step)=>sum+step.durationMinutes,0)).toBeGreaterThanOrEqual(15));
  it("contains complete presenter notes for every step",()=>{for(const step of FLAGSHIP_PRESENTATION.steps) expect(Object.values(step.presenterNote).every(Boolean)).toBe(true)});
  it("rejects navigation outside the guided sequence",()=>{expect(()=>presentationStep(-1)).toThrow(/outside/);expect(()=>presentationStep(14)).toThrow(/outside/)});
  it("identifies the organization and all locations as synthetic",()=>{expect(FLAGSHIP_PRESENTATION.classification).toBe("synthetic");expect(FLAGSHIP_PRESENTATION.locations).toHaveLength(3)});
  it("grounds South Carolina answers in attributed evidence",()=>{const result=safeCopilotAnswer("Why is South Carolina the highest priority?");expect(result.confidence).toBe(92);expect(result.evidence).toContain("Synthetic open shifts: 19");expect(result.source).toContain("Synthetic")});
  it("grounds the Virginia benchmark without overstating transferability",()=>{const result=safeCopilotAnswer("What should we learn from Virginia?");expect(result.classification).toBe("inference");expect(result.answer).toMatch(/validating/)});
  it("grounds the Florida growth opportunity",()=>{const result=safeCopilotAnswer("What is the Florida growth opportunity?");expect(result.evidence).toContain("Synthetic assessment completion: 54%")});
  it("uses bounded language for no-action projections",()=>expect(safeCopilotAnswer("What happens if we do nothing?").answer).toMatch(/not a guaranteed outcome/));
  it("refuses questions without sufficient authorized evidence",()=>{const result=safeCopilotAnswer("Tell me next year's exact revenue");expect(result.classification).toBe("insufficient_data");expect(result.confidence).toBe(0);expect(result.evidence).toEqual([])});
  it("keeps automation human-governed and external execution blocked",()=>expect(FLAGSHIP_PRESENTATION.steps.find(step=>step.id==="automation")?.summary).toMatch(/external execution stays blocked/));
  it("keeps platform governance privacy-safe",()=>expect(FLAGSHIP_PRESENTATION.steps.find(step=>step.id==="governance")?.summary).toMatch(/without tenant-confidential detail/));
  it("includes all guided Copilot questions",()=>expect(FLAGSHIP_PRESENTATION.sampleQuestions).toHaveLength(7));
  it("links the story to measurable outcomes",()=>expect(FLAGSHIP_PRESENTATION.steps.find(step=>step.id==="goals")?.summary).toMatch(/seven days/));
});
