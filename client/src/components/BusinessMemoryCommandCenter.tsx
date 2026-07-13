import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  Layers,
  RefreshCw,
  Save,
  Target,
} from "lucide-react";

type MemoryRecord = {
  id: string;
  businessId: string;
  category: string;
  title: string;
  description: string;
  status: string;
  source: "user" | "system";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type RecommendationOutcomeRecord = MemoryRecord & {
  recommendationId: string;
  actionTaken: string;
  expectedOutcome: string;
  actualOutcome: string;
  successMetric: string;
  result: string;
  reviewedAt: string | null;
};

type BusinessMemoryResponse = {
  ok: boolean;
  businessId: string;
  businessGoals: MemoryRecord[];
  strategicPriorities: MemoryRecord[];
  executiveDecisions: MemoryRecord[];
  recommendationOutcomes: RecommendationOutcomeRecord[];
  businessMilestones: MemoryRecord[];
  auditTrail: Array<{
    id: string;
    recordType: string;
    recordId: string;
    action: string;
    source: string;
    createdAt: string;
  }>;
  error?: string;
};

type IntelligenceRecommendation = {
  id: string;
  category: string;
  observation: string;
  recommendation: string;
  memoryInfluence?: {
    influenced: boolean;
    activeGoalsReferenced: string[];
    strategicPrioritiesReferenced: string[];
    pastDecisionsReferenced: string[];
    outcomeComparisons: string[];
  };
};

type IntelligenceResponse = {
  ok: boolean;
  recommendations: IntelligenceRecommendation[];
};

type SubmitState = "idle" | "saving" | "success" | "error";

const goalStatuses = ["planned", "active", "at_risk", "completed", "cancelled"];
const outcomeResults = ["accepted", "dismissed", "deferred", "completed", "result_unknown"];

export default function BusinessMemoryCommandCenter() {
  const [memory, setMemory] = useState<BusinessMemoryResponse | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const [goalForm, setGoalForm] = useState({
    title: "",
    target: "",
    dueDate: "",
    priority: "high",
    status: "planned",
  });
  const [priorityForm, setPriorityForm] = useState({ title: "", description: "" });
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    reason: "",
    supportingEvidence: "",
    owner: "",
    decisionDate: "",
    reviewDate: "",
    expectedOutcome: "",
    status: "active",
  });
  const [outcomeForm, setOutcomeForm] = useState({
    recommendationId: "",
    actionTaken: "",
    expectedOutcome: "",
    actualOutcome: "",
    successMetric: "",
    result: "result_unknown",
    reviewedAt: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    category: "growth",
    description: "",
    lessonLearned: "",
  });

  async function loadMemory() {
    setLoading(true);
    setError(null);

    try {
      const [memoryResponse, intelligenceResponse] = await Promise.all([
        fetch("/api/prn/business-memory", { headers: { Accept: "application/json" } }),
        fetch("/api/prn/intelligence-engine", { headers: { Accept: "application/json" } }),
      ]);
      const memoryPayload = (await memoryResponse.json()) as BusinessMemoryResponse;
      const intelligencePayload = (await intelligenceResponse.json()) as IntelligenceResponse;

      if (!memoryResponse.ok) {
        throw new Error(memoryPayload.error || `Business Memory request failed with HTTP ${memoryResponse.status}`);
      }

      setMemory(memoryPayload);
      setIntelligence(intelligenceResponse.ok || intelligenceResponse.status === 207 ? intelligencePayload : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Business Memory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemory();
  }, []);

  const sortedPriorities = useMemo(() => sortPriorities(memory?.strategicPriorities || []), [memory?.strategicPriorities]);
  const timeline = useMemo(() => buildMilestoneTimeline(memory), [memory]);
  const influencedRecommendations = useMemo(
    () => (intelligence?.recommendations || []).filter(hasMemoryInfluence),
    [intelligence?.recommendations],
  );

  async function createGoal() {
    if (!goalForm.title.trim()) return;
    await submitMemory("/api/prn/business-memory/goals", "POST", {
      category: "goal",
      title: goalForm.title,
      description: goalForm.target || "User-entered business goal.",
      status: goalForm.status,
      source: "user",
      target: goalForm.target,
      dueDate: goalForm.dueDate,
      priority: goalForm.priority,
    });
    setGoalForm({ title: "", target: "", dueDate: "", priority: "high", status: "planned" });
  }

  async function updateRecord(path: string, payload: Record<string, unknown>) {
    await submitMemory(path, "PATCH", { ...payload, source: "user" });
  }

  async function createPriority() {
    if (!priorityForm.title.trim()) return;
    await submitMemory("/api/prn/business-memory/priorities", "POST", {
      category: "strategic",
      title: priorityForm.title,
      description: priorityForm.description || "User-entered strategic priority.",
      status: "active",
      source: "user",
      sortOrder: sortedPriorities.length + 1,
    });
    setPriorityForm({ title: "", description: "" });
  }

  async function createDecision() {
    if (!decisionForm.title.trim()) return;
    await submitMemory("/api/prn/business-memory/decisions", "POST", {
      category: "decision",
      title: decisionForm.title,
      description: decisionForm.reason || "User-entered executive decision.",
      status: decisionForm.status,
      source: "user",
      reason: decisionForm.reason,
      supportingEvidence: decisionForm.supportingEvidence,
      owner: decisionForm.owner,
      decisionDate: decisionForm.decisionDate,
      reviewDate: decisionForm.reviewDate,
      expectedOutcome: decisionForm.expectedOutcome,
    });
    setDecisionForm({ title: "", reason: "", supportingEvidence: "", owner: "", decisionDate: "", reviewDate: "", expectedOutcome: "", status: "active" });
  }

  async function createOutcome() {
    if (!outcomeForm.recommendationId.trim() || !outcomeForm.actionTaken.trim()) return;
    await submitMemory("/api/prn/business-memory/outcomes", "POST", {
      category: "recommendation",
      title: `Outcome for ${outcomeForm.recommendationId}`,
      description: outcomeForm.actionTaken,
      status: "reviewed",
      source: "user",
      recommendationId: outcomeForm.recommendationId,
      actionTaken: outcomeForm.actionTaken,
      expectedOutcome: outcomeForm.expectedOutcome,
      actualOutcome: outcomeForm.actualOutcome || "Result unknown",
      successMetric: outcomeForm.successMetric,
      result: outcomeForm.result,
      reviewedAt: outcomeForm.reviewedAt || null,
    });
    setOutcomeForm({ recommendationId: "", actionTaken: "", expectedOutcome: "", actualOutcome: "", successMetric: "", result: "result_unknown", reviewedAt: "" });
  }

  async function createMilestone() {
    if (!milestoneForm.title.trim()) return;
    await submitMemory("/api/prn/business-memory/milestones", "POST", {
      category: milestoneForm.category,
      title: milestoneForm.title,
      description: milestoneForm.description || "User-entered business milestone.",
      status: "completed",
      source: "user",
      lessonLearned: milestoneForm.lessonLearned,
    });
    setMilestoneForm({ title: "", category: "growth", description: "", lessonLearned: "" });
  }

  async function submitMemory(path: string, method: "POST" | "PATCH", payload: Record<string, unknown>) {
    setSubmitState("saving");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json() as { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(responsePayload.detail || responsePayload.error || `Business Memory write failed with HTTP ${response.status}`);
      }
      setSubmitState("success");
      await loadMemory();
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof Error ? err.message : "Unable to save Business Memory.");
    }
  }

  return (
    <section data-testid="business-memory-command-center" className="rounded-lg border border-[#0EA5E9]/30 bg-[#061527] p-5 shadow-[0_24px_80px_rgba(14,165,233,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#38BDF8]/35 bg-[#08233D] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7DD3FC]">
            <BookOpen className="h-3.5 w-3.5" />
            Business Memory Command Center
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Strategic Continuity and Accountability</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C5D8]">
            User-entered goals, priorities, decisions, outcomes, milestones, and lessons learned that shape future EEOS recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SourceBadge source="user" />
          <SourceBadge source="system" />
          <button
            type="button"
            onClick={() => void loadMemory()}
            disabled={loading}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#1D4F73] bg-[#08233D] px-3 text-xs font-semibold text-[#DDF7FF] transition hover:border-[#38BDF8] hover:bg-[#0B2D4D] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Memory
          </button>
        </div>
      </div>

      {loading ? (
        <MemoryState title="Loading Business Memory" message="EEOS is retrieving executive memory records." />
      ) : error ? (
        <MemoryState title="Business Memory needs attention" message={error} tone="error" />
      ) : !memory ? (
        <MemoryState title="No Business Memory available" message="No memory records were returned." />
      ) : (
        <div className="mt-5 space-y-5">
          {submitState === "success" ? (
            <div className="rounded-md border border-[#10B981]/35 bg-[#05291F] p-3 text-sm text-[#A7F3D0]">Saved. Audit event preserved.</div>
          ) : submitState === "error" ? (
            <div className="rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-3 text-sm text-[#FBBF24]">Save failed. No silent history change was made.</div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <MemoryPanel icon={Target} title="Active Business Goals" empty="No active business goals recorded.">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Goal" value={goalForm.title} onChange={(title) => setGoalForm({ ...goalForm, title })} />
                <TextInput label="Target" value={goalForm.target} onChange={(target) => setGoalForm({ ...goalForm, target })} />
                <DateInput label="Due date" value={goalForm.dueDate} onChange={(dueDate) => setGoalForm({ ...goalForm, dueDate })} />
                <SelectInput label="Status" value={goalForm.status} options={goalStatuses} onChange={(status) => setGoalForm({ ...goalForm, status })} />
                <SelectInput label="Priority" value={goalForm.priority} options={["critical", "high", "medium", "low"]} onChange={(priority) => setGoalForm({ ...goalForm, priority })} />
                <ActionButton label="Create Goal" onClick={() => void createGoal()} disabled={submitState === "saving"} />
              </div>
              <MemoryRecordList records={memory.businessGoals.filter((item) => item.status !== "cancelled")} endpoint="goals" onUpdate={updateRecord} />
            </MemoryPanel>

            <MemoryPanel icon={Flag} title="Strategic Priorities" empty="No strategic priorities recorded.">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <TextInput label="Priority" value={priorityForm.title} onChange={(title) => setPriorityForm({ ...priorityForm, title })} />
                <TextInput label="Description" value={priorityForm.description} onChange={(description) => setPriorityForm({ ...priorityForm, description })} />
                <ActionButton label="Create" onClick={() => void createPriority()} disabled={submitState === "saving"} />
              </div>
              <div className="mt-4 space-y-3">
                {sortedPriorities.length === 0 ? <EmptyText text="No strategic priorities recorded." /> : sortedPriorities.map((priority, index) => (
                  <PriorityRow
                    key={priority.id}
                    priority={priority}
                    index={index}
                    total={sortedPriorities.length}
                    onUpdate={updateRecord}
                  />
                ))}
              </div>
            </MemoryPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MemoryPanel icon={ClipboardCheck} title="Recent Executive Decisions" empty="No executive decisions recorded.">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Decision" value={decisionForm.title} onChange={(title) => setDecisionForm({ ...decisionForm, title })} />
                <TextInput label="Owner" value={decisionForm.owner} onChange={(owner) => setDecisionForm({ ...decisionForm, owner })} />
                <TextInput label="Reason" value={decisionForm.reason} onChange={(reason) => setDecisionForm({ ...decisionForm, reason })} />
                <TextInput label="Supporting evidence" value={decisionForm.supportingEvidence} onChange={(supportingEvidence) => setDecisionForm({ ...decisionForm, supportingEvidence })} />
                <DateInput label="Decision date" value={decisionForm.decisionDate} onChange={(decisionDate) => setDecisionForm({ ...decisionForm, decisionDate })} />
                <DateInput label="Review date" value={decisionForm.reviewDate} onChange={(reviewDate) => setDecisionForm({ ...decisionForm, reviewDate })} />
                <TextInput label="Expected outcome" value={decisionForm.expectedOutcome} onChange={(expectedOutcome) => setDecisionForm({ ...decisionForm, expectedOutcome })} />
                <ActionButton label="Record Decision" onClick={() => void createDecision()} disabled={submitState === "saving"} />
              </div>
              <MemoryRecordList records={memory.executiveDecisions.slice(0, 5)} endpoint="decisions" onUpdate={updateRecord} />
            </MemoryPanel>

            <MemoryPanel icon={Layers} title="Recommendation Outcomes" empty="No recommendation outcomes recorded.">
              <div className="grid gap-3 md:grid-cols-2">
                <SelectInput
                  label="Recommendation"
                  value={outcomeForm.recommendationId}
                  options={["", ...(intelligence?.recommendations || []).map((item) => item.id)]}
                  onChange={(recommendationId) => setOutcomeForm({ ...outcomeForm, recommendationId })}
                />
                <SelectInput label="Result" value={outcomeForm.result} options={outcomeResults} onChange={(result) => setOutcomeForm({ ...outcomeForm, result })} />
                <TextInput label="Action taken" value={outcomeForm.actionTaken} onChange={(actionTaken) => setOutcomeForm({ ...outcomeForm, actionTaken })} />
                <TextInput label="Expected outcome" value={outcomeForm.expectedOutcome} onChange={(expectedOutcome) => setOutcomeForm({ ...outcomeForm, expectedOutcome })} />
                <TextInput label="Actual outcome" value={outcomeForm.actualOutcome} onChange={(actualOutcome) => setOutcomeForm({ ...outcomeForm, actualOutcome })} />
                <TextInput label="Success metric" value={outcomeForm.successMetric} onChange={(successMetric) => setOutcomeForm({ ...outcomeForm, successMetric })} />
                <DateInput label="Review date" value={outcomeForm.reviewedAt} onChange={(reviewedAt) => setOutcomeForm({ ...outcomeForm, reviewedAt })} />
                <ActionButton label="Track Outcome" onClick={() => void createOutcome()} disabled={submitState === "saving"} />
              </div>
              <OutcomeList outcomes={memory.recommendationOutcomes.slice(0, 5)} onUpdate={updateRecord} />
            </MemoryPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <MemoryPanel icon={CalendarDays} title="Business Milestones and Lessons Learned" empty="No milestones recorded.">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Milestone" value={milestoneForm.title} onChange={(title) => setMilestoneForm({ ...milestoneForm, title })} />
                <SelectInput label="Category" value={milestoneForm.category} options={["revenue", "growth", "operations", "product", "goal"]} onChange={(category) => setMilestoneForm({ ...milestoneForm, category })} />
                <TextInput label="Description" value={milestoneForm.description} onChange={(description) => setMilestoneForm({ ...milestoneForm, description })} />
                <TextInput label="Lesson learned" value={milestoneForm.lessonLearned} onChange={(lessonLearned) => setMilestoneForm({ ...milestoneForm, lessonLearned })} />
                <ActionButton label="Add Milestone" onClick={() => void createMilestone()} disabled={submitState === "saving"} />
              </div>
              <Timeline items={timeline} />
            </MemoryPanel>

            <MemoryPanel icon={BookOpen} title="Memory-Influenced Recommendations" empty="No current recommendations show memory influence.">
              {influencedRecommendations.length === 0 ? <EmptyText text="No current recommendations show memory influence." /> : (
                <div className="space-y-3">
                  {influencedRecommendations.slice(0, 6).map((recommendation) => (
                    <div key={recommendation.id} className="rounded-md border border-[#12314D] bg-[#050F1D] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#38BDF8]/35 bg-[#08233D] px-2 py-0.5 text-xs font-semibold text-[#7DD3FC]">Memory influenced</span>
                        <span className="text-xs uppercase tracking-[0.14em] text-[#86A6C8]">{recommendation.category}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{recommendation.observation}</p>
                      <MemoryInfluenceList recommendation={recommendation} />
                    </div>
                  ))}
                </div>
              )}
            </MemoryPanel>
          </div>
        </div>
      )}
    </section>
  );
}

export function sortPriorities(priorities: MemoryRecord[]) {
  return priorities.slice().sort((a, b) => readNumber(a.metadata?.sortOrder, 999) - readNumber(b.metadata?.sortOrder, 999));
}

export function hasMemoryInfluence(recommendation: IntelligenceRecommendation) {
  return Boolean(recommendation.memoryInfluence?.influenced);
}

export function buildMilestoneTimeline(memory: BusinessMemoryResponse | null) {
  if (!memory) return [];

  const completedGoals = memory.businessGoals
    .filter((goal) => goal.status === "completed")
    .map((goal) => ({ id: `goal-${goal.id}`, title: goal.title, category: "goal completed", date: goal.updatedAt, description: goal.description, source: goal.source, lesson: readText(goal.metadata?.lessonLearned) }));
  const decisions = memory.executiveDecisions
    .map((decision) => ({ id: `decision-${decision.id}`, title: decision.title, category: "major decision", date: readText(decision.metadata?.decisionDate) || decision.createdAt, description: decision.description, source: decision.source, lesson: readText(decision.metadata?.lessonLearned) }));
  const milestones = memory.businessMilestones
    .map((milestone) => ({ id: `milestone-${milestone.id}`, title: milestone.title, category: milestone.category, date: milestone.createdAt, description: milestone.description, source: milestone.source, lesson: readText(milestone.metadata?.lessonLearned) }));

  return [...completedGoals, ...decisions, ...milestones]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);
}

function MemoryPanel({ icon: Icon, title, empty: _empty, children }: {
  icon: typeof Target;
  title: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-[#12314D] bg-[#071426] p-4">
      <div className="flex items-center gap-2 text-[#38BDF8]">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MemoryRecordList({ records, endpoint, onUpdate }: {
  records: MemoryRecord[];
  endpoint: string;
  onUpdate: (path: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  if (records.length === 0) return <EmptyText text="No user-entered records yet." />;

  return (
    <div className="mt-4 space-y-3">
      {records.map((record) => (
        <div key={record.id} className="rounded-md border border-[#12314D] bg-[#050F1D] p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={record.source} />
                <StatusBadge status={record.status} />
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{record.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#B7C5D8]">{record.description}</p>
              <MetadataLine record={record} />
            </div>
            <div className="flex min-w-[160px] gap-2">
              <select
                aria-label={`Update ${record.title} status`}
                defaultValue={record.status}
                className="h-8 flex-1 rounded-md border border-[#1D4F73] bg-[#061527] px-2 text-xs text-white"
                onChange={(event) => void onUpdate(`/api/prn/business-memory/${endpoint}/${record.id}`, { status: event.target.value })}
              >
                {[...goalStatuses, "active", "archived", "reviewed"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PriorityRow({ priority, index, total, onUpdate }: {
  priority: MemoryRecord;
  index: number;
  total: number;
  onUpdate: (path: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(priority.title);
  const path = `/api/prn/business-memory/priorities/${priority.id}`;

  return (
    <div className="rounded-md border border-[#12314D] bg-[#050F1D] p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 rounded-md border border-[#1D4F73] bg-[#061527] px-3 text-sm text-white" />
        <div className="flex flex-wrap gap-2">
          <IconButton label="Save priority" onClick={() => void onUpdate(path, { title })} icon={Save} />
          <IconButton label="Move up" onClick={() => void onUpdate(path, { sortOrder: Math.max(1, index) })} icon={Flag} disabled={index === 0} />
          <IconButton label="Move down" onClick={() => void onUpdate(path, { sortOrder: Math.min(total, index + 2) })} icon={Layers} disabled={index === total - 1} />
          <IconButton label="Activate" onClick={() => void onUpdate(path, { status: "active" })} icon={CheckCircle2} />
          <IconButton label="Archive" onClick={() => void onUpdate(path, { status: "archived" })} icon={Archive} />
        </div>
      </div>
      <MetadataLine record={priority} />
    </div>
  );
}

function OutcomeList({ outcomes, onUpdate }: {
  outcomes: RecommendationOutcomeRecord[];
  onUpdate: (path: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  if (outcomes.length === 0) return <EmptyText text="No recommendation outcomes recorded." />;

  return (
    <div className="mt-4 space-y-3">
      {outcomes.map((outcome) => (
        <div key={outcome.id} className="rounded-md border border-[#12314D] bg-[#050F1D] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={outcome.source} />
            <StatusBadge status={outcome.result} />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">{outcome.recommendationId}</p>
          <p className="mt-1 text-xs text-[#B7C5D8]">Action: {outcome.actionTaken}</p>
          <p className="mt-1 text-xs text-[#B7C5D8]">Expected: {outcome.expectedOutcome}</p>
          <p className="mt-1 text-xs text-[#B7C5D8]">Actual: {outcome.actualOutcome}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {outcomeResults.map((result) => (
              <button key={result} type="button" onClick={() => void onUpdate(`/api/prn/business-memory/outcomes/${outcome.id}`, { result, status: "reviewed" })} className="rounded-md border border-[#1D4F73] px-2 py-1 text-xs text-[#DDF7FF] hover:border-[#38BDF8]">
                {result}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: ReturnType<typeof buildMilestoneTimeline> }) {
  if (items.length === 0) return <EmptyText text="No milestones or decisions have been recorded yet." />;

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border-l border-[#38BDF8]/35 pl-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#7DD3FC]">{item.category} - {formatDate(item.date)}</p>
          <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#B7C5D8]">{item.description}</p>
          {item.lesson ? <p className="mt-1 text-xs text-[#A7F3D0]">Lesson learned: {item.lesson}</p> : null}
        </div>
      ))}
    </div>
  );
}

function MemoryInfluenceList({ recommendation }: { recommendation: IntelligenceRecommendation }) {
  const influence = recommendation.memoryInfluence;
  if (!influence) return null;
  const rows = [
    ["Current business goal", influence.activeGoalsReferenced],
    ["Strategic priority", influence.strategicPrioritiesReferenced],
    ["Previous decision", influence.pastDecisionsReferenced],
    ["Recorded recommendation outcome", influence.outcomeComparisons],
  ].filter(([, values]) => Array.isArray(values) && values.length > 0) as Array<[string, string[]]>;

  return (
    <div className="mt-3 space-y-2">
      {rows.map(([label, values]) => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86A6C8]">{label}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[#B7C5D8]">
            {values.map((value) => <li key={value}>{value}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MetadataLine({ record }: { record: MemoryRecord }) {
  const values = [
    readText(record.metadata?.target) ? `Target: ${readText(record.metadata?.target)}` : "",
    readText(record.metadata?.dueDate) ? `Due: ${readText(record.metadata?.dueDate)}` : "",
    readText(record.metadata?.priority) ? `Priority: ${readText(record.metadata?.priority)}` : "",
    readText(record.metadata?.owner) ? `Owner: ${readText(record.metadata?.owner)}` : "",
  ].filter(Boolean);
  return values.length > 0 ? <p className="mt-2 text-xs text-[#7D91AA]">{values.join(" | ")}</p> : null;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86A6C8]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#1D4F73] bg-[#050F1D] px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#38BDF8]" />
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86A6C8]">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#1D4F73] bg-[#050F1D] px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#38BDF8]" />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86A6C8]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#1D4F73] bg-[#050F1D] px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#38BDF8]">
        {options.map((option) => <option key={option} value={option}>{option || "Select"}</option>)}
      </select>
    </label>
  );
}

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-9 items-center justify-center gap-2 self-end rounded-md border border-[#38BDF8]/40 bg-[#08233D] px-3 text-xs font-semibold text-[#DDF7FF] transition hover:border-[#7DD3FC] hover:bg-[#0B2D4D] disabled:opacity-60">
      <Save className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function IconButton({ label, onClick, icon: Icon, disabled }: { label: string; onClick: () => void; icon: typeof Save; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#1D4F73] bg-[#061527] text-[#DDF7FF] transition hover:border-[#38BDF8] disabled:opacity-40">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SourceBadge({ source }: { source: "user" | "system" | string }) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${source === "user" ? "border-[#10B981]/35 bg-[#05291F] text-[#A7F3D0]" : "border-[#38BDF8]/35 bg-[#08233D] text-[#7DD3FC]"}`}>
      {source === "user" ? "User-entered" : "System-generated"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex w-fit rounded-full border border-[#1D4F73] bg-[#061527] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#DDF7FF]">{status}</span>;
}

function MemoryState({ title, message, tone = "empty" }: { title: string; message: string; tone?: "empty" | "error" }) {
  return (
    <div className={`mt-5 rounded-md border p-4 text-sm ${tone === "error" ? "border-[#F59E0B]/35 bg-[#2A1C05] text-[#FBBF24]" : "border-[#12314D] bg-[#050F1D] text-[#B7C5D8]"}`}>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-[#12314D] bg-[#050F1D] p-3 text-sm text-[#7D91AA]">{text}</p>;
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
