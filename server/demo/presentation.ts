import { DEMO_LOCATIONS, DEMO_NAME, DEMO_SCENARIO_ID } from "./contract";

export type PresentationStep = {
  id: string;
  title: string;
  eyebrow: string;
  durationMinutes: number;
  summary: string;
  presenterNote: {
    say: string;
    click: string;
    notice: string;
    expected: string;
    fallback: string;
    maxTime: string;
  };
};

const note = (say:string, click:string, notice:string, expected:string, fallback:string, maxTime:string) => ({say,click,notice,expected,fallback,maxTime});

export const FLAGSHIP_PRESENTATION = {
  id: "summit-flagship-guided-v1",
  scenarioId: DEMO_SCENARIO_ID,
  organizationName: DEMO_NAME,
  classification: "synthetic" as const,
  title: "Monday Executive Briefing",
  estimatedMinutes: 18,
  briefing: "South Carolina requires immediate staffing attention, while Florida presents a near-term growth opportunity.",
  recommendation: "Reduce the South Carolina caregiver coverage gap before accepting additional high-acuity cases.",
  locations: DEMO_LOCATIONS,
  sampleQuestions: [
    "What should I focus on today?",
    "Why is South Carolina the highest priority?",
    "What evidence supports this recommendation?",
    "What should we learn from Virginia?",
    "What is the Florida growth opportunity?",
    "What happens if we do nothing?",
    "Which action is safest to approve first?",
  ],
  steps: [
    {id:"opening",title:"Cinematic Opening",eyebrow:"Fortune 500 Intelligence",durationMinutes:1,summary:"A resilient cinematic introduction that moves directly into the live platform.",presenterNote:note("Set the executive context: this is one connected operating system, not a dashboard tour.","Play the opening or skip directly to the live briefing.","The introduction never blocks the live demo if media is unavailable.","The presentation advances to the Executive Welcome.","Use the built-in motion introduction and select Continue to live demo.","1 minute")},
    {id:"welcome",title:"Executive Welcome",eyebrow:"Monday Executive Briefing",durationMinutes:1,summary:"One clear briefing across three synthetic locations.",presenterNote:note("Introduce Summit Home Services Group and explicitly identify every value as synthetic.","Point to the Brain briefing and three-location summary.","South Carolina risk, Florida opportunity, and Virginia benchmark are immediately clear.","The audience understands the business story in under a minute.","Use the briefing sentence even if scenario refresh is temporarily unavailable.","1 minute")},
    {id:"health",title:"Business Health",eyebrow:"Observe the business",durationMinutes:2,summary:"Executive health across revenue, staffing, conversion, satisfaction, and compliance.",presenterNote:note("Explain that EEOS compares health across the business without flattening local context.","Move across the three location cards.","Virginia is the benchmark; South Carolina carries staffing risk; Florida carries conversion upside.","The audience can identify risk and opportunity at a glance.","Use the certified synthetic metric snapshot shown in the presentation.","2 minutes")},
    {id:"brain",title:"Meet the Brain",eyebrow:"Connect and explain",durationMinutes:2,summary:"Facts, derived metrics, inferences, recommendations, assumptions, and evidence remain distinct.",presenterNote:note("Walk from source evidence to the bounded recommendation.","Highlight evidence type, confidence, freshness, and assumptions.","The Brain explains why, not only what.","The recommendation is traceable to synthetic evidence.","State that the Brain will refuse where evidence is insufficient.","2 minutes")},
    {id:"recommendation",title:"Executive Recommendation",eyebrow:"Prioritize",durationMinutes:1,summary:"A governed staffing recommendation with impact and measurement plan.",presenterNote:note("Frame the recommendation as decision support, never a guaranteed outcome.","Review expected impact, no-action risk, and the seven-day measure.","Confidence and evidence travel with the recommendation.","The next safest action is clear.","Use the prepared recommendation copy; do not improvise outcomes.","1 minute")},
    {id:"copilot",title:"Executive Copilot",eyebrow:"Ask with evidence",durationMinutes:2,summary:"Guided questions return attributed, confidence-bounded answers from authorized synthetic evidence.",presenterNote:note("Choose two sample questions that match the audience.","Select a question and review evidence, confidence, and source context.","Answers are grounded and insufficient-data requests are refused.","The audience sees an executive assistant with guardrails.","Use the prepared grounded answers and refusal example.","2 minutes")},
    {id:"timeline",title:"Executive Timeline",eyebrow:"See the story unfold",durationMinutes:1,summary:"Signals become recommendation, review, workflow, goal, and scheduled measurement.",presenterNote:note("Describe the timeline as an executive narrative rather than a technical log.","Follow the sequence from signal to measurement.","Every transition has a governed state.","The business story is understandable over time.","Use the deterministic presentation timeline.","1 minute")},
    {id:"intelligence",title:"C2C / C2B / B2B Intelligence",eyebrow:"Find opportunity",durationMinutes:2,summary:"Synthetic referral, client, and partnership opportunities remain review-only.",presenterNote:note("Show how three intelligence domains share evidence and human review.","Move between C2C, C2B, and B2B cards.","No outreach or CRM record is created.","The audience sees connected growth intelligence.","Use the synthetic opportunity cards only.","2 minutes")},
    {id:"industry",title:"Industry Intelligence",eyebrow:"One Brain, configured",durationMinutes:1,summary:"Home Care remains active while other Industry Packs are previewed without saving configuration.",presenterNote:note("Say: One Brain. One platform. Configured for each industry.","Preview terminology for another pack, then return to Home Care.","Preview state is local and never changes the saved pack.","The platform model is clear without a configuration write.","Keep Home Care selected and describe the preview options.","1 minute")},
    {id:"automation",title:"Executive Automation",eyebrow:"Prepare governed action",durationMinutes:2,summary:"A human approval gate controls a prepared workflow while external execution stays blocked.",presenterNote:note("Explain that approval advances governance state, not an external system write.","Review evidence, risk gates, approval policy, and blocked execution status.","External email, SMS, CRM, and financial execution remain off.","The audience understands governed automation.","Demonstrate the prepared state without approving if recent authentication is unavailable.","2 minutes")},
    {id:"goals",title:"Goals and Measurement",eyebrow:"Measure outcomes",durationMinutes:1,summary:"Reduce South Carolina uncovered shifts within seven days.",presenterNote:note("Connect the decision to a measurable outcome.","Review baseline, target, owner, due date, and measurement source.","EEOS measures whether the decision helped.","The audience sees accountability after approval.","Use the certified seven-day goal snapshot.","1 minute")},
    {id:"learning",title:"Learning Loop",eyebrow:"Calibrate safely",durationMinutes:1,summary:"Collect → Analyze → Recommend → Human Decision → Outcome → Measure → Calibrate → Improve.",presenterNote:note("Explain that learning requires verified outcomes and stays tenant-isolated.","Follow the loop and point out bounded confidence adjustment.","Unverified outcomes never train organization memory.","The audience sees improvement with governance.","Use the loop diagram and evidence-threshold statement.","1 minute")},
    {id:"governance",title:"Platform Owner Governance",eyebrow:"Govern without exposure",durationMinutes:1,summary:"Aggregate platform health, connector health, quality, adoption, and audit evidence without tenant-confidential detail.",presenterNote:note("Distinguish platform governance from access to customer operations.","Review anonymous aggregates and audit controls.","No private customer data appears outside its authorized context.","The audience understands platform-owner boundaries.","Use the privacy-safe aggregate cards.","1 minute")},
    {id:"closing",title:"Closing",eyebrow:"Stop Managing. Start Leading.",durationMinutes:1,summary:"EEOS — Fortune 500 Intelligence. Built for Every Business.",presenterNote:note("Close on the operating model: observe, decide, govern, measure, improve.","Choose restart, reset, Demo Center, live platform, or next steps.","The story ends with measurable executive action.","The audience has a clear next conversation.","Return to Demo Center without changing the scenario.","1 minute")},
  ] satisfies PresentationStep[],
};

export function presentationStep(index:number){
  if(!Number.isInteger(index)||index<0||index>=FLAGSHIP_PRESENTATION.steps.length) throw new Error("Presentation step is outside the guided sequence.");
  return FLAGSHIP_PRESENTATION.steps[index];
}

export function safeCopilotAnswer(question:string){
  const normalized=question.trim().toLowerCase();
  const source="Summit Synthetic Metrics · Monday Executive Briefing";
  if(normalized.includes("south carolina")||normalized.includes("focus")||normalized.includes("safest")) return {answer:"Prioritize the South Carolina caregiver coverage gap before accepting additional high-acuity cases.",evidence:["Synthetic caregiver coverage: 71%","Synthetic open shifts: 19","Synthetic overtime: 18%"],confidence:92,source,classification:"recommendation" as const};
  if(normalized.includes("virginia")) return {answer:"Use Virginia's stable coverage and satisfaction as an operating benchmark, while validating which practices transfer safely.",evidence:["Synthetic caregiver coverage: 96%","Synthetic customer satisfaction: 94%"],confidence:89,source,classification:"inference" as const};
  if(normalized.includes("florida")) return {answer:"Florida shows strong inquiry volume but weak assessment completion, creating a near-term conversion opportunity.",evidence:["Synthetic new inquiries: 36","Synthetic assessment completion: 54%","Synthetic revenue trend: +14%"],confidence:90,source,classification:"inference" as const};
  if(normalized.includes("nothing")||normalized.includes("evidence")) return {answer:"Without intervention, uncovered shifts and overtime may constrain service quality and safe growth; this is a bounded risk projection, not a guaranteed outcome.",evidence:["Synthetic open shifts: 19","Synthetic overtime: 18%","Synthetic customer satisfaction: 84%"],confidence:84,source,classification:"inference" as const};
  return {answer:"I do not have sufficient authorized synthetic evidence to answer that question.",evidence:[],confidence:0,source,classification:"insufficient_data" as const};
}
