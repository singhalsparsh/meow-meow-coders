"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Code2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { MarkdownWriter } from "./markdown-writer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor } from "@/components/coding-workspace/code-editor";
import {
  ALL_DIFFICULTIES,
  ALL_TOPICS,
  DIFFICULTY_LABEL,
  TOPIC_LABEL,
  type Difficulty,
  type DsaTopic,
} from "@/lib/coding/types";

interface TestCaseDraft {
  id: string;
  input: string;
  expectedOutput: string;
  explanation: string;
  isHidden: boolean;
}

interface CodingProblemDraft {
  id?: string;
  title: string;
  difficulty: Difficulty;
  topic: DsaTopic;
  description: string;
  constraints: string;
  solution: string;
  starterCode: string;
  driverCode: string;
  timeLimitMs: number;
  testCases: TestCaseDraft[];
}

interface CodingProblemFormProps {
  initialData: { problems: CodingProblemDraft[] };
  apiBase: string;
}

const DEFAULT_STARTER_CODE = `#include <iostream>
#include <vector>
#include <string>
using namespace std;

// Write your solution here.
int main() {

    return 0;
}
`;

const DEFAULT_DRIVER_CODE = `// Hidden grading harness. The student's code is injected exactly where
// {{USER_CODE}} appears below; without that tag their code is placed above
// this block instead. Define any helper structures (ListNode, TreeNode, ...)
// before the tag so the student can use them.

// {{USER_CODE}}

int main() {
    // Read from stdin, call the student's code, write the result to stdout.
    // The judge compares your program's stdout against each Expected Output.
    return 0;
}
`;

let draftCounter = 0;
const makeTestCase = (partial?: Partial<TestCaseDraft>): TestCaseDraft => {
  draftCounter += 1;
  return {
    id: `draft-${Date.now()}-${draftCounter}`,
    input: "",
    expectedOutput: "",
    explanation: "",
    isHidden: false,
    ...partial,
  };
};

const blankProblem = (): CodingProblemDraft => ({
  title: "",
  difficulty: "EASY",
  topic: "ARRAYS",
  description: "",
  constraints: "",
  solution: "",
  starterCode: DEFAULT_STARTER_CODE,
  driverCode: DEFAULT_DRIVER_CODE,
  timeLimitMs: 2000,
  testCases: [makeTestCase()],
});

export const CodingProblemForm = ({
  initialData,
  apiBase,
}: CodingProblemFormProps) => {
  const router = useRouter();

  // Saved problems for this chapter, in display order.
  const [problems, setProblems] = useState<CodingProblemDraft[]>(
    initialData.problems ?? []
  );
  // id of the problem currently being edited, or "new" for a fresh draft, or
  // null when the list is collapsed.
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleSaved = (draftId: string, saved: CodingProblemDraft) => {
    setProblems((prev) => {
      const existing = prev.findIndex((p) => (p.id ?? "new") === draftId);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setEditing(null);
    refresh();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" and all its test cases?`)) return;
    try {
      setBusyId(id);
      await axios.delete(
        `${apiBase}/problem`,
        { data: { id } }
      );
      toast.success("Problem deleted");
      setProblems((prev) => prev.filter((p) => p.id !== id));
      if (editing === id) setEditing(null);
      refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const startNew = () => {
    // Give the draft a temporary client-side id so the editor can be keyed on it.
    draftCounter += 1;
    const draft = blankProblem();
    (draft as CodingProblemDraft & { id: string }).id = `new-${Date.now()}-${draftCounter}`;
    setProblems((prev) => [...prev, draft]);
    setEditing(draft.id as string);
  };

  // The problem currently open in the full-page modal, or null.
  const activeProblem = editing
    ? (problems.find((p) => (p.id as string) === editing) ?? null)
    : null;

  const closeEditor = () => {
    if (editing) {
      const target = problems.find((p) => (p.id as string) === editing);
      if (target && (!target.id || String(target.id).startsWith("new-"))) {
        // Discard the unsaved draft when cancelled.
        setProblems((prev) => prev.filter((p) => (p.id as string) !== editing));
      }
    }
    setEditing(null);
  };

  // Close the modal with Escape.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, problems]);

  return (
    <>
      <div className="mt-6 glass-card rounded-2xl p-4">
        <div className="font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span>Coding Problems</span>
            {problems.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
                {problems.length} attached
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={startNew}
            variant="outline"
            size="sm"
            disabled={problems.some((p) => !p.id || p.id.startsWith("new-"))}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add question
          </Button>
        </div>

        {problems.length === 0 && editing === null && (
          <p className="mt-3 text-sm text-muted-foreground">
            No coding problems yet. Click{" "}
            <span className="font-medium">Add question</span> to create one.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {problems.map((problem, index) => {
            const pid = problem.id as string;
            const isNew = !problem.id || problem.id.startsWith("new-");

            return (
              <div
                key={pid}
                className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white/40 dark:bg-zinc-800/30 overflow-hidden"
              >
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => setEditing(pid)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-75 transition"
                  >
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-700 text-muted-foreground shrink-0">
                      Q{index + 1}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {problem.title.trim() || "Untitled question"}
                    </span>
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
                        onClick={() => setEditing(pid)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        aria-label="Edit question"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(pid, problem.title || `Question ${index + 1}`)}
                        disabled={busyId === pid}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-page modal editor — one question at a time. Rendered through a
          portal to document.body so page-level transforms (the global
          `main > *` entrance animation) can't shrink/offset `position: fixed`
          into a small corner. */}
      {activeProblem &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 sm:p-8"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeEditor();
            }}
          >
            <div className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex items-center gap-2 min-w-0">
                  <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <h3 className="truncate text-sm font-semibold">
                    {activeProblem.title.trim() || "New coding question"}
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeEditor}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-5 pb-6 pt-3">
                <ProblemEditor
                  key={activeProblem.id}
                  draft={activeProblem}
                  apiBase={apiBase}
                  onCancel={closeEditor}
                  onSaved={(saved) => handleSaved(activeProblem.id as string, saved)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Editor for a single problem (create or update). Keyed by the draft id in the
// parent so switching questions resets all local state cleanly.
// ---------------------------------------------------------------------------

interface ProblemEditorProps {
  draft: CodingProblemDraft;
  apiBase: string;
  onCancel: () => void;
  onSaved: (saved: CodingProblemDraft) => void;
}

const ProblemEditor = ({
  draft,
  apiBase,
  onCancel,
  onSaved,
}: ProblemEditorProps) => {
  const isNew = !draft.id || draft.id.startsWith("new-");

  const [form, setForm] = useState<CodingProblemDraft>(() => ({
    ...draft,
    constraints: draft.constraints ?? "",
    solution: draft.solution ?? "",
  }));
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof CodingProblemDraft>(
    key: K,
    value: CodingProblemDraft[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateTestCase = (id: string, patch: Partial<TestCaseDraft>) =>
    setForm((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) =>
        tc.id === id ? { ...tc, ...patch } : tc
      ),
    }));

  const addTestCase = () =>
    setForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, makeTestCase()],
    }));

  const removeTestCase = (id: string) =>
    setForm((prev) => {
      if (prev.testCases.length === 1) {
        toast.error("At least one test case is required");
        return prev;
      }
      return {
        ...prev,
        testCases: prev.testCases.filter((tc) => tc.id !== id),
      };
    });

  const onSave = async () => {
    if (!form.title.trim()) return toast.error("Problem title is required");
    if (!form.description.trim())
      return toast.error("A problem description is required");
    if (!form.starterCode.trim())
      return toast.error("Starter code is required");

    const usable = form.testCases.filter(
      (tc) => tc.input.trim() !== "" || tc.expectedOutput.trim() !== ""
    );
    if (!usable.length) return toast.error("Add at least one test case");

    try {
      setSaving(true);
      const { data } = await axios.post(
        `${apiBase}/problem`,
        {
          // Omit the temp id on create; send the real id to update.
          ...(isNew ? {} : { id: form.id }),
          title: form.title,
          difficulty: form.difficulty,
          topic: form.topic,
          description: form.description,
          constraints: form.constraints || null,
          solution: form.solution || null,
          starterCode: form.starterCode,
          driverCode: form.driverCode || null,
          timeLimitMs: form.timeLimitMs,
          testCases: usable.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation: tc.explanation || null,
            isHidden: tc.isHidden,
          })),
        }
      );
      toast.success(isNew ? "Coding problem created" : "Coding problem saved");
      onSaved({
        id: data.id,
        title: data.title,
        difficulty: data.difficulty,
        topic: data.topic,
        description: data.description,
        constraints: data.constraints ?? "",
        solution: data.solution ?? "",
        starterCode: data.starterCode,
        driverCode: data.driverCode ?? "",
        timeLimitMs: data.timeLimitMs,
        testCases: (data.testCases ?? []).map((tc: any) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          explanation: tc.explanation ?? "",
          isHidden: tc.isHidden,
        })),
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Problem Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Two Sum"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              DSA Category
            </label>
            <Select
              value={form.topic}
              onValueChange={(v) => update("topic", v as DsaTopic)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {TOPIC_LABEL[topic]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Difficulty
            </label>
            <Select
              value={form.difficulty}
              onValueChange={(v) => update("difficulty", v as Difficulty)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_DIFFICULTIES.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {DIFFICULTY_LABEL[difficulty]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Time Limit (ms)
            </label>
            <Input
              type="number"
              min={100}
              max={30000}
              step={100}
              value={form.timeLimitMs}
              onChange={(e) =>
                update("timeLimitMs", Number(e.target.value) || 2000)
              }
            />
          </div>
        </div>

        {/* Description (markdown writer) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Description <span className="text-red-500">*</span>
          </label>
          <MarkdownWriter
            value={form.description}
            onChange={(v) => update("description", v)}
            placeholder="Describe the problem. Use the toolbar to add arrays, images, powers, code blocks, tables, and more."
            minHeight={160}
          />
        </div>

        {/* Constraints */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Constraints
          </label>
          <MarkdownWriter
            value={form.constraints}
            onChange={(v) => update("constraints", v)}
            placeholder={"1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9"}
            minHeight={90}
          />
        </div>

        {/* Solution (reference code) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Solution{" "}
            <span className="font-normal opacity-70">
              (shown to students in the Solution tab; optional — paste the reference code here)
            </span>
          </label>
          <div className="h-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-950">
            <CodeEditor
              value={form.solution}
              onChange={(v) => update("solution", v)}
              height={220}
            />
          </div>
        </div>

        {/* Dual code editors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Starter Code{" "}
              <span className="font-normal opacity-70">
                (what the student sees)
              </span>
            </label>
            <div className="h-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-950">
              <CodeEditor
                value={form.starterCode}
                onChange={(v) => update("starterCode", v)}
                height={220}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Driver / Wrapper Code{" "}
              <span className="font-normal opacity-70">
                (hidden — inject with{" "}
                <code className="text-[10px] bg-slate-200 dark:bg-zinc-700 px-1 rounded">
                  {"{{USER_CODE}}"}
                </code>
                )
              </span>
            </label>
            <div className="h-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-950">
              <CodeEditor
                value={form.driverCode}
                onChange={(v) => update("driverCode", v)}
                height={220}
              />
            </div>
          </div>
        </div>

        {/* Test cases */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Test Cases{" "}
              <span className="font-normal opacity-70">
                ({form.testCases.filter((t) => !t.isHidden).length} public /{" "}
                {form.testCases.filter((t) => t.isHidden).length} hidden)
              </span>
            </label>
            <Button
              type="button"
              onClick={addTestCase}
              variant="outline"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add test case
            </Button>
          </div>

          {form.testCases.map((tc, index) => (
            <div
              key={tc.id}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Case {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tc.isHidden}
                    onClick={() =>
                      updateTestCase(tc.id, { isHidden: !tc.isHidden })
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span
                      className={cn(
                        "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                        tc.isHidden
                          ? "bg-amber-500"
                          : "bg-slate-300 dark:bg-zinc-600"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                          tc.isHidden ? "translate-x-3.5" : "translate-x-0.5"
                        )}
                      />
                    </span>
                    Hidden (grading only)
                  </button>
                  <Button
                    type="button"
                    onClick={() => removeTestCase(tc.id)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                    Input
                  </span>
                  <Textarea
                    value={tc.input}
                    onChange={(e) =>
                      updateTestCase(tc.id, { input: e.target.value })
                    }
                    placeholder="stdin given to the program"
                    className="min-h-[72px] font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Expected Output
                  </span>
                  <Textarea
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(tc.id, {
                        expectedOutput: e.target.value,
                      })
                    }
                    placeholder="stdout the program must produce"
                    className="min-h-[72px] font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Explanation (optional)
                </span>
                <Input
                  value={tc.explanation}
                  onChange={(e) =>
                    updateTestCase(tc.id, { explanation: e.target.value })
                  }
                  placeholder="Shown to students under this sample case"
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                starterCode: DEFAULT_STARTER_CODE,
                driverCode: DEFAULT_DRIVER_CODE,
                testCases: [makeTestCase()],
                title: "",
                description: "",
                constraints: "",
              }))
            }
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset templates
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            size="sm"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving…" : isNew ? "Create problem" : "Save problem"}
          </Button>
        </div>
      </div>
    </div>
  );
};
