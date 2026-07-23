import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, ClipboardCheck, FlaskConical, RefreshCw, Save, TrendingUp } from "lucide-react";

type FeedbackRecord = {
  id: string;
  recommendationId: string;
  executiveDecision: string;
  status: string;
  feedback: string;
  owner: string;
  createdAt: string;
};

type MeasurementRecord = {
  id: string;
  recommendationId: string;
  metricName: string;
  actualValue: number | null;
  targetValue: number | null;
  unit: string;
  verified: boolean;
  verificationEvidence: string;
};

type LessonRecord = {
  id: string;
  recommendationId: string;
  lessonType: string;
  summary: string;
  approvedForReuse: boolean;
};

type LearningProfile = {
  category: string;
  evidenceCount: number;
  successfulOutcomeCount: number;
  unsuccessfulOutcomeCount: number;
  inconclusiveOutcomeCount: number;
  reliabilityScore: number;
};

type LearningResponse = {
  ok: boolean;
  feedback: FeedbackRecord[];
  measurements: MeasurementRecord[];
  lessons: LessonRecord[];
  profiles: LearningProfile[];
  adaptiveLearningReady: boolean;
  adaptiveLearningReason: string;
};

export default function AthenaLearningLoop() {
  const [learning, setLearning] = useState<LearningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    recommendationId: "sales-high-open-opportunity-volume",
    executiveDecision: "no_decision",
    status: "pending",
    feedback: "",
    owner: "",
  });
  const [measurementForm, setMeasurementForm] = useState({
    recommendationId: "sales-high-open-opportunity-volume",
    metricName: "Open opportunities reviewed",
    baselineValue: "",
    targetValue: "",
    actualValue: "",
    unit: "count",
    measurementSource: "user-entered evidence",
    verificationEvidence: "",
  });

  async function loadLearning() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/prn/athena/learning", { headers: { Accept: "application/json" } });
      const payload = await response.json() as LearningResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || `Learning request failed with HTTP ${response.status}`);
      setLearning(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Athena Learning.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLearning();
  }, []);

  const awaitingDecision = useMemo(() => learning?.feedback.filter((item) => item.executiveDecision === "no_decision" || item.status === "pending") || [], [learning]);
  const inProgress = useMemo(() => learning?.feedback.filter((item) => item.status === "in_progress") || [], [learning]);
  const awaitingReview = useMemo(() => learning?.feedback.filter((item) => item.status === "review_due") || [], [learning]);
  const approvedLessons = useMemo(() => learning?.lessons.filter((item) => item.approvedForReuse) || [], [learning]);

  async function submitFeedback() {
    await postLearning("/api/prn/athena/feedback", {
      ...feedbackForm,
      feedback: feedbackForm.feedback || "User-entered feedback pending detail.",
      owner: feedbackForm.owner || "Unassigned",
    }, "Feedback recorded. Audit event preserved.");
    setFeedbackForm({ recommendationId: "sales-high-open-opportunity-volume", executiveDecision: "no_decision", status: "pending", feedback: "", owner: "" });
  }

  async function submitMeasurement() {
    await postLearning("/api/prn/athena/measurements", {
      ...measurementForm,
      baselineValue: numberOrNull(measurementForm.baselineValue),
      targetValue: numberOrNull(measurementForm.targetValue),
      actualValue: numberOrNull(measurementForm.actualValue),
      measuredAt: new Date().toISOString(),
      verified: false,
    }, "Measurement recorded as user-entered evidence. Verification remains false.");
    setMeasurementForm({ recommendationId: "sales-high-open-opportunity-volume", metricName: "Open opportunities reviewed", baselineValue: "", targetValue: "", actualValue: "", unit: "count", measurementSource: "user-entered evidence", verificationEvidence: "" });
  }

  async function reviewOutcome(recommendationId: string) {
    await postLearning("/api/prn/athena/outcomes/review", { recommendationId }, "Outcome review created. Executive approval is required before reuse.");
  }

  async function approveLesson(lessonId: string, approved: boolean) {
    await postLearning(`/api/prn/athena/lessons/${lessonId}/approve`, { approved }, approved ? "Lesson approved for reuse." : "Lesson rejected for reuse.");
  }

  async function postLearning(path: string, payload: Record<string, unknown>, successMessage: string) {
    setSuccess(null);
    setError(null);
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const responsePayload = await response.json() as { error?: string; detail?: string };
    if (!response.ok) {
      setError(responsePayload.detail || responsePayload.error || `Learning write failed with HTTP ${response.status}`);
      return;
    }
    setSuccess(successMessage);
    await loadLearning();
  }

  return (
    <section data-testid="athena-learning-loop" className="rounded-lg border border-[#C9A227]/30 bg-[#FFFFFF] p-5 shadow-[0_24px_80px_rgba(201,162,39,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/35 bg-[#F8F4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C6F12]">
            <BookOpen className="h-3.5 w-3.5" />
            Athena Learning Loop
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Outcome Evidence and Executive-Approved Learning</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D8D8D8]">
            Athena adapts only from verified recorded outcomes and executive-approved lessons for this business.
          </p>
        </div>
        <button type="button" onClick={() => void loadLearning()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#D9C579] bg-[#F8F4E8] px-3 text-xs font-semibold text-[#0B0B0B] hover:border-[#C9A227] disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Learning
        </button>
      </div>

      {error ? <div className="mt-4 rounded-md border border-[#F59E0B]/35 bg-[#2A1C05] p-3 text-sm text-[#FBBF24]">{error}</div> : null}
      {success ? <div className="mt-4 rounded-md border border-[#10B981]/35 bg-[#05291F] p-3 text-sm text-[#A7F3D0]">{success}</div> : null}

      {loading ? (
        <p className="mt-5 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4 text-sm text-[#D8D8D8]">Loading Athena Learning.</p>
      ) : learning ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A227]">Recent Learning Influence</p>
            <p className="mt-2 text-sm text-[#E8E8E8]">{learning.adaptiveLearningReady ? "Adaptive learning is available for at least one category." : learning.adaptiveLearningReason}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <LearningPanel icon={ClipboardCheck} title="Recommendations Awaiting Decision">
              <LearningList items={awaitingDecision} empty="No recommendations awaiting decision." />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <TextInput label="Recommendation ID" value={feedbackForm.recommendationId} onChange={(recommendationId) => setFeedbackForm({ ...feedbackForm, recommendationId })} />
                <SelectInput label="Decision" value={feedbackForm.executiveDecision} options={["accepted", "dismissed", "deferred", "modified", "no_decision"]} onChange={(executiveDecision) => setFeedbackForm({ ...feedbackForm, executiveDecision })} />
                <SelectInput label="Status" value={feedbackForm.status} options={["pending", "in_progress", "completed", "cancelled", "review_due"]} onChange={(status) => setFeedbackForm({ ...feedbackForm, status })} />
                <TextInput label="Owner" value={feedbackForm.owner} onChange={(owner) => setFeedbackForm({ ...feedbackForm, owner })} />
                <TextInput label="Feedback" value={feedbackForm.feedback} onChange={(feedback) => setFeedbackForm({ ...feedbackForm, feedback })} />
                <ActionButton label="Record Feedback" onClick={() => void submitFeedback()} />
              </div>
            </LearningPanel>

            <LearningPanel icon={FlaskConical} title="Record Measurement">
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Recommendation ID" value={measurementForm.recommendationId} onChange={(recommendationId) => setMeasurementForm({ ...measurementForm, recommendationId })} />
                <TextInput label="Metric name" value={measurementForm.metricName} onChange={(metricName) => setMeasurementForm({ ...measurementForm, metricName })} />
                <TextInput label="Baseline" value={measurementForm.baselineValue} onChange={(baselineValue) => setMeasurementForm({ ...measurementForm, baselineValue })} />
                <TextInput label="Target" value={measurementForm.targetValue} onChange={(targetValue) => setMeasurementForm({ ...measurementForm, targetValue })} />
                <TextInput label="Actual" value={measurementForm.actualValue} onChange={(actualValue) => setMeasurementForm({ ...measurementForm, actualValue })} />
                <TextInput label="Unit" value={measurementForm.unit} onChange={(unit) => setMeasurementForm({ ...measurementForm, unit })} />
                <TextInput label="Source" value={measurementForm.measurementSource} onChange={(measurementSource) => setMeasurementForm({ ...measurementForm, measurementSource })} />
                <TextInput label="Verification evidence" value={measurementForm.verificationEvidence} onChange={(verificationEvidence) => setMeasurementForm({ ...measurementForm, verificationEvidence })} />
                <ActionButton label="Record Measurement" onClick={() => void submitMeasurement()} />
              </div>
              <MeasurementList items={learning.measurements.slice(0, 5)} />
            </LearningPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <LearningPanel icon={TrendingUp} title="In Progress">
              <LearningList items={inProgress} empty="No recommendations in progress." />
            </LearningPanel>
            <LearningPanel icon={CheckCircle2} title="Outcomes Awaiting Review">
              {awaitingReview.length === 0 ? <EmptyText text="No outcomes awaiting review." /> : awaitingReview.map((item) => (
                <div key={item.id} className="mt-3 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
                  <p className="text-sm font-semibold text-white">{item.recommendationId}</p>
                  <button type="button" onClick={() => void reviewOutcome(item.recommendationId)} className="mt-2 rounded-md border border-[#D9C579] px-2 py-1 text-xs text-[#0B0B0B] hover:border-[#C9A227]">Review Outcome</button>
                </div>
              ))}
            </LearningPanel>
            <LearningPanel icon={BookOpen} title="Approved Lessons">
              {approvedLessons.length === 0 ? <EmptyText text="No executive-approved lessons yet." /> : approvedLessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onApprove={approveLesson} />)}
              {learning.lessons.filter((lesson) => !lesson.approvedForReuse).slice(0, 3).map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onApprove={approveLesson} />)}
            </LearningPanel>
          </div>

          <LearningPanel icon={TrendingUp} title="Category Reliability Scores">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {learning.profiles.map((profile) => (
                <div key={profile.category} className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
                  <p className="text-sm font-semibold capitalize text-white">{profile.category.replace("_", " ")}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#8C6F12]">{profile.reliabilityScore}/100</p>
                  <p className="mt-1 text-xs text-[#A0A0A0]">{profile.evidenceCount} evidence items; {profile.successfulOutcomeCount} successful; {profile.unsuccessfulOutcomeCount} unsuccessful; {profile.inconclusiveOutcomeCount} inconclusive</p>
                </div>
              ))}
            </div>
          </LearningPanel>
        </div>
      ) : null}
    </section>
  );
}

export function learningControlsAvailable() {
  return ["Accept", "Dismiss", "Defer", "Mark Modified", "Assign Owner", "Add Feedback", "Record Measurement", "Mark Review Due"];
}

function LearningPanel({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-2 text-[#C9A227]">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LearningList({ items, empty }: { items: FeedbackRecord[]; empty: string }) {
  if (items.length === 0) return <EmptyText text={empty} />;
  return <div className="space-y-3">{items.slice(0, 5).map((item) => <FeedbackRow key={item.id} item={item} />)}</div>;
}

function FeedbackRow({ item }: { item: FeedbackRecord }) {
  return (
    <div className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
      <div className="flex flex-wrap gap-2">
        <Badge text="User-entered feedback" tone="green" />
        <Badge text={item.executiveDecision} />
        <Badge text={item.status} />
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{item.recommendationId}</p>
      <p className="mt-1 text-xs text-[#D8D8D8]">{item.feedback}</p>
      <p className="mt-1 text-xs text-[#A0A0A0]">Owner: {item.owner}</p>
    </div>
  );
}

function MeasurementList({ items }: { items: MeasurementRecord[] }) {
  if (items.length === 0) return <EmptyText text="No measurements recorded." />;
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
          <div className="flex flex-wrap gap-2">
            <Badge text={item.verified ? "Verified measurement" : "User-entered evidence"} tone={item.verified ? "green" : "blue"} />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">{item.metricName}</p>
          <p className="mt-1 text-xs text-[#D8D8D8]">Actual {item.actualValue ?? "not entered"} / Target {item.targetValue ?? "not entered"} {item.unit}</p>
        </div>
      ))}
    </div>
  );
}

function LessonRow({ lesson, onApprove }: { lesson: LessonRecord; onApprove: (lessonId: string, approved: boolean) => Promise<void> }) {
  return (
    <div className="mt-3 rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3">
      <div className="flex flex-wrap gap-2">
        <Badge text={lesson.approvedForReuse ? "Executive-approved lesson" : "Athena analysis"} tone={lesson.approvedForReuse ? "green" : "blue"} />
        <Badge text={lesson.lessonType} />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#D8D8D8]">{lesson.summary}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => void onApprove(lesson.id, true)} className="rounded-md border border-[#D9C579] px-2 py-1 text-xs text-[#0B0B0B] hover:border-[#C9A227]">Approve Lesson</button>
        <button type="button" onClick={() => void onApprove(lesson.id, false)} className="rounded-md border border-[#D9C579] px-2 py-1 text-xs text-[#0B0B0B] hover:border-[#C9A227]">Reject Lesson</button>
        <button type="button" className="rounded-md border border-[#D9C579] px-2 py-1 text-xs text-[#0B0B0B]">Request More Evidence</button>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B8B8B8]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#D9C579] bg-[#FFFFFF] px-3 text-sm normal-case tracking-normal text-[#0B0B0B] outline-none focus:border-[#C9A227]" />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B8B8B8]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#D9C579] bg-[#FFFFFF] px-3 text-sm normal-case tracking-normal text-[#0B0B0B] outline-none focus:border-[#C9A227]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 items-center justify-center gap-2 self-end rounded-md border border-[#C9A227]/40 bg-[#F8F4E8] px-3 text-xs font-semibold text-[#0B0B0B] hover:border-[#8C6F12]">
      <Save className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Badge({ text, tone = "blue" }: { text: string; tone?: "blue" | "green" }) {
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${tone === "green" ? "border-[#10B981]/35 bg-[#05291F] text-[#A7F3D0]" : "border-[#C9A227]/35 bg-[#F8F4E8] text-[#8C6F12]"}`}>{text}</span>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-[#E7D8A3] bg-[#FFFFFF] p-3 text-sm text-[#A0A0A0]">{text}</p>;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
