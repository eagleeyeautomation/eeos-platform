export type DemoEnvironment = { organizationId:string; organizationName:string; classification:"demo"; dataClassification:"synthetic"; scenarioVersion:string; seededAt:string; resetAt?:string };
export type DemoScenario = { id:string; organizationId:string; name:string; description:string; status:"ready"|"active"|"completed"|"reset"; version:string; startedAt?:string; completedAt?:string };
export const DEMO_SLUG="summit-home-services-demo";
export const DEMO_NAME="Summit Home Services Group";
export const DEMO_VERSION="demo-sprint-1.v1";
export const DEMO_SCENARIO_ID="summit-monday-executive-briefing-v1";
export const DEMO_LOCATIONS=[
  {id:"demo-summit-virginia",name:"Summit Home Services — Virginia",city:"Richmond",state:"VA",status:"Healthy"},
  {id:"demo-summit-south-carolina",name:"Summit Home Services — South Carolina",city:"Columbia",state:"SC",status:"Needs Attention"},
  {id:"demo-summit-florida",name:"Summit Home Services — Florida",city:"Tampa",state:"FL",status:"Growth Opportunity"},
] as const;

export function assertDemoClassification(environment:{classification:string;dataClassification:string}|undefined){
  if(!environment||environment.classification!=="demo"||environment.dataClassification!=="synthetic") throw new Error("Demo reset is restricted to classified synthetic demo organizations.");
}
