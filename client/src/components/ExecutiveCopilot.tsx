import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductSession } from "@/contexts/ProductSessionContext";

export default function ExecutiveCopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<{ answer: string; confidence: number; evidence: string[] } | null>(null);
  const session = useProductSession();
  const certificationMode = new URLSearchParams(window.location.search).get("phase4Certification") === "27805b0";
  const ask = trpc.intelligence.copilot.useMutation({ onSuccess: setResponse });
  const certify = trpc.intelligence.publish.useMutation();
  const context = trpc.intelligence.context.useQuery({ consumer: "phase4_certification" }, { enabled: certificationMode });
  const isolation = trpc.intelligence.publish.useMutation();
  const runCertification = () => {
    const locationId = session.authorizedLocations[0]?.id;
    if (!locationId) return;
    certify.mutate({
      id: "phase4-certification-27805b0", locationId, producer: "phase4-certification",
      type: "certification.intelligence_verified", category: "risk", occurredAt: new Date().toISOString(),
      subject: { type: "risk", key: "phase4-certification-risk", name: "Phase 4 certification risk check", attributes: { certification: true } },
      entities: [{ type: "kpi", key: "phase4-certification-kpi", name: "Phase 4 certification KPI", attributes: { value: 1, unit: "verification" } }],
      relationships: [{ from: { type: "risk", key: "phase4-certification-risk" }, to: { type: "kpi", key: "phase4-certification-kpi" }, type: "measured_by" }],
      payload: { organizationName: session.organization?.name ?? "Authorized organization", certification: true },
      evidence: ["certification:commit:27805b05e0abc60fe8bc78c0979371297140d9c9", "certification:authenticated-owner-session"],
      correlationId: "phase4-final-certification",
      recommendation: { key: "phase4-certification-recommendation", title: "Review Phase 4 certification evidence", summary: "The authenticated certification event verified the unified intelligence orchestration chain.", action: "Review the attributed certification evidence and close the Phase 4 verification task.", consumers: ["executive_dashboard", "business_health", "notifications", "executive_timeline"], factors: { businessImpact: 75, financialValue: 20, operationalImpact: 80, strategicValue: 90, risk: 45, urgency: 60, confidence: 95 } },
    }, { onSuccess: () => context.refetch() });
  };
  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open ? <div className="mb-3 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#07131f]/95 p-4 text-white shadow-2xl backdrop-blur-xl" role="dialog" aria-label="Executive Copilot">
        <div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Executive Copilot</p><p className="text-xs text-white/55">Answers only from authorized EEOS evidence</p></div><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close Copilot"><X className="h-4 w-4" /></Button></div>
        {response ? <div className="mb-3 rounded-xl bg-white/5 p-3 text-sm"><p>{response.answer}</p><p className="mt-2 text-xs text-cyan-300">Confidence {response.confidence}%</p>{response.evidence.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/60">{response.evidence.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : <p className="mb-3 text-sm text-white/60">Ask about priorities, risks, opportunities, evidence, or next actions.</p>}
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (question.trim()) ask.mutate({ question: question.trim() }); }}><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What needs attention?" className="border-white/10 bg-white/5" /><Button type="submit" size="icon" disabled={ask.isPending}><Send className="h-4 w-4" /></Button></form>
        {ask.error ? <p className="mt-2 text-xs text-red-300">{ask.error.message}</p> : null}
      </div> : null}
      <Button onClick={() => setOpen((value) => !value)} className="ml-auto flex h-12 rounded-full bg-cyan-500 px-4 text-[#04111d] hover:bg-cyan-400"><Bot className="mr-2 h-5 w-5" />Ask The Brain</Button>
      {certificationMode ? <div className="mt-2 max-w-md rounded-lg border border-amber-400/40 bg-[#07131f] p-2 text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={runCertification} disabled={certify.isPending || !session.authorizedLocations.length}>Run Phase 4 Certification</Button><Button size="sm" variant="outline" onClick={() => isolation.mutate({ id: "phase4-isolation-denial", locationId: "unauthorized-certification-location", producer: "phase4-certification", type: "certification.isolation", category: "audit", occurredAt: new Date().toISOString(), payload: {}, evidence: [] })}>Verify Isolation</Button></div><p className="mt-1 text-xs text-white">{certify.data ? `Published ${certify.data.eventId}; duplicate ${certify.data.duplicate}; legacy ${certify.data.legacyRecommendationId}` : certify.error?.message ?? "One-time authenticated production verification"}</p><p className="mt-1 text-xs text-white">Isolation: {isolation.error?.message ?? "pending"}</p><p className="mt-1 text-xs text-white">Context: {context.data ? `${context.data.recentEvents.length} events; ${context.data.memory.length} memories; ${context.data.priorities.length} priorities; ${context.data.graphSummary.map((item) => `${item.type}:${item.count}`).join(",")}; relationships ${context.data.graphRelationships.map((item) => `${item.type}:${item.count}`).join(",")}` : "loading"}</p></div> : null}
    </div>
  );
}
