export type DemoAudience = "customer" | "investor";
export type DemoDuration = "full" | "quick";

export const FULL_DEMO_STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export const QUICK_DEMO_STEPS = [0, 1, 2, 3, 4, 5, 9, 8, 13] as const;

export function presentationOptions(search: string) {
  const params = new URLSearchParams(search);
  const duration: DemoDuration = params.get("mode") === "quick" ? "quick" : "full";
  const audience: DemoAudience = params.get("audience") === "investor" ? "investor" : "customer";
  const steps: number[] = duration === "quick" ? [...QUICK_DEMO_STEPS] : [...FULL_DEMO_STEPS];
  return { duration, audience, steps };
}

export function presentationUrl(duration: DemoDuration, audience: DemoAudience) {
  const params = new URLSearchParams();
  if (duration === "quick") params.set("mode", "quick");
  if (audience === "investor") params.set("audience", "investor");
  const query = params.toString();
  return `/demo/presentation${query ? `?${query}` : ""}`;
}

export const audienceFraming: Record<DemoAudience, string> = {
  customer: "Focus on business outcomes, organization intelligence, governed action, and configurable Industry Packs.",
  investor: "Focus on repeatable architecture, tenant isolation, governed security, industry configuration, and commercial scalability.",
};

export const FLAGSHIP_NARRATION = `Every day, executives make hundreds of decisions.

Most are made with incomplete information.

Information alone does not build great companies. Intelligence does.

Meet the Brain.

EEOS connects every signal across your organization. It transforms data into priorities, evidence, and action.

Governed automation keeps you in control while AI works beside you.

One intelligent platform, configured for every industry. The power of a Fortune 500 executive operating system. Built for every business.

Turn information into intelligence. Turn intelligence into leadership.

EEOS. Fortune 500 Intelligence. Built for Every Business. Stop Managing. Start Leading.`;

export const commercialAsset = {
  status: "blocked" as const,
  reason: "No approved commercial master, web derivative, captions, narration master, or music-license evidence was supplied.",
};
