"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface McqOption {
  id: string;
  text: string;
}

// A saved MCQ arrives from the API with `options`/`correctOptionIds` as JSON.
// Drafts (unsaved) use the same shape, so one type covers both.
interface McqDraft {
  id?: string;
  question: string;
  options: McqOption[];
  correctOptionIds: string[];
  explanation: string;
}

interface McqFormProps {
  initialData: { mcqs: McqDraft[] };
  testId: string;
}

// Deterministic-ish client ids so React keys and the correct-answer set stay
// stable while the teacher types. A counter is enough: these never reach the DB
// unless the option is saved, at which point the DB id is used.
let optionCounter = 0;
const makeOptionId = () => `opt-${Date.now()}-${++optionCounter}`;

const makeOption = (text = ""): McqOption => ({ id: makeOptionId(), text });

const blankMcq = (): McqDraft => ({
  question: "",
  options: [makeOption(), makeOption()],
  correctOptionIds: [],
  explanation: "",
});

// Normalize whatever the API returned into the draft shape. The DB stores the
// two arrays as JSON; if a legacy row is malformed, fall back to empty arrays
// rather than crash the editor.
function toDraft(raw: McqDraft): McqDraft {
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((o) =>
          o && typeof o === "object" && typeof o.id === "string"
            ? { id: o.id, text: typeof o.text === "string" ? o.text : "" }
            : null
        )
        .filter((o): o is McqOption => o !== null)
    : [];
  const correct = Array.isArray(raw.correctOptionIds)
    ? raw.correctOptionIds.filter((c) => typeof c === "string")
    : [];
  return {
    id: raw.id,
    question: typeof raw.question === "string" ? raw.question : "",
    options: options.length >= 2 ? options : [makeOption(), makeOption()],
    // Drop any correct id that no longer matches an option (e.g. after an edit
    // left the key stale) so the form never claims a nonexistent answer.
    correctOptionIds: correct.filter((c) => options.some((o) => o.id === c)),
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const McqForm = ({ initialData, testId }: McqFormProps) => {
  const router = useRouter();

  const [mcqs, setMcqs] = useState<McqDraft[]>(() =>
    (initialData.mcqs ?? []).map(toDraft)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleSaved = (draftId: string, saved: McqDraft) => {
    setMcqs((prev) => {
      const idx = prev.findIndex((m) => (m.id ?? "__new__") === draftId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setEditing(null);
    refresh();
  };

  const startNew = () => {
    const draft = blankMcq();
    (draft as McqDraft & { id: string }).id = `new-${Date.now()}`;
    setMcqs((prev) => [...prev, draft]);
    setEditing(draft.id as string);
  };

  const handleDelete = async (id: string, question: string) => {
    const label = question.trim() ? `"${question.trim().slice(0, 40)}"` : "this question";
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      setBusyId(id);
      await axios.delete(`/api/tests/${testId}/mcqs/${id}`);
      toast.success("Question deleted");
      setMcqs((prev) => prev.filter((m) => m.id !== id));
      if (editing === id) setEditing(null);
      refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="font-medium flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>Multiple choice</span>
          {mcqs.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
              {mcqs.length} attached
            </span>
          )}
        </div>
        <Button
          type="button"
          onClick={startNew}
          variant="outline"
          size="sm"
          disabled={mcqs.some((m) => !m.id || m.id.startsWith("new-"))}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add question
        </Button>
      </div>

      {mcqs.length === 0 && editing === null && (
        <p className="mt-3 text-sm text-muted-foreground">
          No MCQs yet. Click <span className="font-medium">Add question</span> to
          create one.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {mcqs.map((mcq, index) => {
          const mid = mcq.id as string;
          const isOpen = editing === mid;
          const isNew = !mcq.id || mcq.id.startsWith("new-");
          const multi = mcq.correctOptionIds.length > 1;

          return (
            <div
              key={mid}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => setEditing(isOpen ? null : mid)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-75 transition"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground shrink-0">
                    Q{index + 1}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {mcq.question.trim() || "Untitled question"}
                  </span>
                  {multi && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 shrink-0">
                      multi
                    </span>
                  )}
                  {!isNew && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 shrink-0">
                      saved
                    </span>
                  )}
                </button>
                {!isNew && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      onClick={() => setEditing(mid)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-sky-600"
                      aria-label="Edit question"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleDelete(mid, mcq.question)}
                      disabled={busyId === mid}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {isOpen && (
                <McqEditor
                  key={mid}
                  draft={mcq}
                  testId={testId}
                  onCancel={() => {
                    if (isNew) {
                      setMcqs((prev) =>
                        prev.filter((m) => (m.id as string) !== mid)
                      );
                    }
                    setEditing(null);
                  }}
                  onSaved={(saved) => handleSaved(mid, saved)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Editor for one MCQ (create or update).
// ---------------------------------------------------------------------------

interface McqEditorProps {
  draft: McqDraft;
  testId: string;
  onCancel: () => void;
  onSaved: (saved: McqDraft) => void;
}

const McqEditor = ({ draft, testId, onCancel, onSaved }: McqEditorProps) => {
  const isNew = !draft.id || draft.id.startsWith("new-");

  const [form, setForm] = useState<McqDraft>(draft);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof McqDraft>(key: K, value: McqDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateOption = (id: string, text: string) =>
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.id === id ? { ...o, text } : o)),
    }));

  const addOption = () =>
    setForm((prev) => ({ ...prev, options: [...prev.options, makeOption()] }));

  const removeOption = (id: string) => {
    setForm((prev) => {
      if (prev.options.length <= 2) {
        toast.error("An MCQ needs at least two options");
        return prev;
      }
      return {
        ...prev,
        options: prev.options.filter((o) => o.id !== id),
        // Clearing a removed option from the answer key keeps the key valid.
        correctOptionIds: prev.correctOptionIds.filter((c) => c !== id),
      };
    });
  };

  // Toggling a correct option adds/removes it from the key, so the same control
  // serves single- and multi-correct: one active = single, several = multi.
  const toggleCorrect = (id: string) =>
    setForm((prev) => {
      const active = prev.correctOptionIds.includes(id);
      return {
        ...prev,
        correctOptionIds: active
          ? prev.correctOptionIds.filter((c) => c !== id)
          : [...prev.correctOptionIds, id],
      };
    });

  const onSave = async () => {
    if (!form.question.trim()) return toast.error("Question text is required");

    const filled = form.options.filter((o) => o.text.trim());
    if (filled.length < 2) return toast.error("At least two options are required");
    if (!form.correctOptionIds.length)
      return toast.error("Mark at least one correct answer");

    try {
      setSaving(true);
      const { data } = await axios.post(`/api/tests/${testId}/mcqs`, {
        ...(isNew ? {} : { id: form.id }),
        question: form.question,
        // Options that the teacher left blank are dropped on save; the DB never
        // stores an empty choice.
        options: filled,
        correctOptionIds: form.correctOptionIds.filter((c) =>
          filled.some((o) => o.id === c)
        ),
        explanation: form.explanation || null,
      });
      toast.success(isNew ? "Question added" : "Question saved");
      onSaved(toDraft(data));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-3 pb-3 space-y-4 border-t border-slate-200 dark:border-slate-700">
      <div className="pt-4 space-y-2">
        <label className="text-xs text-muted-foreground">Question</label>
        <Textarea
          value={form.question}
          onChange={(e) => update("question", e.target.value)}
          placeholder="What is the time complexity of binary search?"
          rows={2}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">
            Options{" "}
            <span className="text-muted-foreground/60">
              (check every correct one — several makes it multi-correct)
            </span>
          </label>
        </div>

        <div className="space-y-2">
          {form.options.map((option) => {
            const isCorrect = form.correctOptionIds.includes(option.id);
            return (
              <div key={option.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCorrect(option.id)}
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-md border flex items-center justify-center transition",
                    isCorrect
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500"
                  )}
                  aria-label={isCorrect ? "Correct answer" : "Mark as correct"}
                  title={isCorrect ? "Correct answer" : "Mark as correct"}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <Input
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder="An answer choice"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 shrink-0"
                  aria-label="Remove option"
                  disabled={form.options.length <= 2}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          onClick={addOption}
          variant="outline"
          size="sm"
          className="mt-1"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add option
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          Explanation{" "}
          <span className="text-muted-foreground/60">
            (shown after the test is submitted)
          </span>
        </label>
        <Textarea
          value={form.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          placeholder="Why is the correct answer correct?"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          size="sm"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          {isNew ? "Add question" : "Save question"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
