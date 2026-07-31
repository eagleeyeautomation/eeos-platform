import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ExecutiveCopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<{ answer: string; confidence: number; evidence: string[] } | null>(null);
  const ask = trpc.intelligence.copilot.useMutation({ onSuccess: setResponse });
  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open ? <div className="mb-3 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#07131f]/95 p-4 text-white shadow-2xl backdrop-blur-xl" role="dialog" aria-label="Executive Copilot">
        <div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Executive Copilot</p><p className="text-xs text-white/55">Answers only from authorized EEOS evidence</p></div><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close Copilot"><X className="h-4 w-4" /></Button></div>
        {response ? <div className="mb-3 rounded-xl bg-white/5 p-3 text-sm"><p>{response.answer}</p><p className="mt-2 text-xs text-cyan-300">Confidence {response.confidence}%</p>{response.evidence.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/60">{response.evidence.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : <p className="mb-3 text-sm text-white/60">Ask about priorities, risks, opportunities, evidence, or next actions.</p>}
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (question.trim()) ask.mutate({ question: question.trim() }); }}><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What needs attention?" className="border-white/10 bg-white/5" /><Button type="submit" size="icon" disabled={ask.isPending}><Send className="h-4 w-4" /></Button></form>
        {ask.error ? <p className="mt-2 text-xs text-red-300">{ask.error.message}</p> : null}
      </div> : null}
      <Button onClick={() => setOpen((value) => !value)} className="ml-auto flex h-12 rounded-full bg-cyan-500 px-4 text-[#04111d] hover:bg-cyan-400"><Bot className="mr-2 h-5 w-5" />Ask The Brain</Button>
    </div>
  );
}
