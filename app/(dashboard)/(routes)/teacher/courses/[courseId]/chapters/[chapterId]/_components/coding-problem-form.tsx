"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code2,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";
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
  starterCode: string;
  driverCode: string;
  timeLimitMs: number;
  testCases: TestCaseDraft[];
}

interface CodingProblemFormProps {
  initialData: { problem: CodingProblemDraft | null };
  courseId: string;
  chapterId: string;
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

export const CodingProblemForm = ({
  initialData,
  courseId,
  chapterId,
}: CodingProblemFormProps) => {
  const router = useRouter();
  const existing = initialData.problem;

  const [enabled, setEnabled] = useState(!!existing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState<CodingProblemDraft>(
    existing ?? {
      title: "",
      difficulty: "EASY",
      topic: "ARRAYS",
      description: "",
      constraints: "",
      starterCode: DEFAULT_STARTER_CODE,
      driverCode: DEFAULT_DRIVER_CODE,
      timeLimitMs: 2000,
      testCases: [makeTestCase()],
    }
  );

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
      await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/problem`, {
        title: form.title,
        difficulty: form.difficulty,
        topic: form.topic,
        description: form.description,
        constraints: form.constraints || null,
        starterCode: form.starterCode,
        driverCode: form.driverCode || null,
        timeLimitMs: form.timeLimitMs,
        testCases: usable.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          explanation: tc.explanation || null,
          isHidden: tc.isHidden,
        })),
      });
      toast.success("Coding problem saved");
      setEnabled(true);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    try {
      setDeleting(true);
      await axios.delete(
        `/api/courses/${courseId}/chapters/${chapterId}/problem`
      );
      toast.success("Coding problem removed");
      setEnabled(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6 glass-card rounded-2xl p-4">
      <div className="font-medium flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span>Coding Problem</span>
          {existing?.id && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
              attached
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enabled && existing?.id && (
            <Button
              onClick={onRemove}
              disabled={deleting}
              variant="ghost"
              size="sm"
              className="text-red-600 dark:text-red-400 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? "Removing…" : "Remove"}
            </Button>
          )}
          {/* Attach / detach toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
              enabled
                ? "bg-emerald-500"
                : "bg-slate-300 dark:bg-slate-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {enabled && (
        <div className="mt-4 space-y-5">
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

          {/* Description (markdown) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Description (Markdown) <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide preview
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                  </>
                )}
              </Button>
            </div>
            {showPreview ? (
              <div className="prose prose-sm dark:prose-invert max-w-none min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-3">
                {form.description.trim() ? (
                  <ReactMarkdown>{form.description}</ReactMarkdown>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            ) : (
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the problem in Markdown. Use ```cpp blocks for examples."
                className="min-h-[120px] font-mono text-xs"
              />
            )}
          </div>

          {/* Constraints */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Constraints (Markdown)
            </label>
            <Textarea
              value={form.constraints}
              onChange={(e) => update("constraints", e.target.value)}
              placeholder={"1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9"}
              className="min-h-[70px] font-mono text-xs"
            />
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
              <div className="h-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
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
                  <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">
                    {"{{USER_CODE}}"}
                  </code>
                  )
                </span>
              </label>
              <div className="h-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
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
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 p-3 space-y-2"
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
                            : "bg-slate-300 dark:bg-slate-600"
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
                    <span className="text-[10px] font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
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
              {saving ? "Saving…" : "Save problem"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
