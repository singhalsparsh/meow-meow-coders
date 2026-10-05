"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Clock,
  Code2,
  Loader2,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodingWorkspace } from "@/components/coding-workspace/coding-workspace";
import type { CodingProblemPayload, ProblemSubmissionPayload } from "@/lib/coding/types";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

interface McqOption {
  id: string;
  text: string;
}

interface McqPayload {
  id: string;
  question: string;
  options: McqOption[];
  position: number;
  // True when the question was authored with several correct options. The
  // server sends only the flag, never the ids.
  multiCorrect?: boolean;
}

interface AttemptAnswer {
  mcqId: string;
  selectedOptionIds: string[];
}

interface AttemptPayload {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  score: number | null;
  maxScore: number | null;
  answers?: AttemptAnswer[];
}

export interface TestPayload {
  id: string;
  title: string;
  description: string | null;
  mcqs: McqPayload[];
  // A coding problem in a test carries the learner's submission history so
  // the workspace can populate its "Submissions" tab on load.
  problems: (CodingProblemPayload & {
    submissions: ProblemSubmissionPayload[];
  })[];
}

interface TestRunnerProps {
  test: TestPayload;
  initialAttempt: AttemptPayload | null;
}

// Graded result for a single MCQ, as returned by the submit endpoint.
interface McqResult {
  mcqId: string;
  isCorrect: boolean;
  awardedPoints: number;
}

interface SubmitResponse {
  attemptId: string;
  score: number;
  maxScore: number;
  mcqResults: McqResult[];
  problemResults: { problemId: string; solved: boolean }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Student: take a test.
//
// MCQ answers are held locally and graded in one request at the end; coding
// problems are graded live by the same judge the lessons use, and their score
// is derived from the learner's recorded submissions at submit time. That split
// means a coding question solved here counts even if the learner never clicks
// "Submit test", but the MCQ score is only computed when they do.
export const TestRunner = ({ test, initialAttempt }: TestRunnerProps) => {
  const router = useRouter();

  // Map of mcqId -> selected option ids. Resumed attempts rehydrate from the
  // server so a learner who closes the tab does not lose their picks.
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const seed: Record<string, string[]> = {};
    for (const a of initialAttempt?.answers ?? []) {
      seed[a.mcqId] = a.selectedOptionIds;
    }
    return seed;
  });

  const alreadySubmitted = initialAttempt?.status === "SUBMITTED";
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(
    alreadySubmitted
      ? {
          attemptId: initialAttempt!.id,
          score: initialAttempt!.score ?? 0,
          maxScore: initialAttempt!.maxScore ?? 0,
          mcqResults: [],
          problemResults: [],
        }
      : null
  );

  // Track, per coding problem, whether the learner currently has a fully
  // passing submission. Refreshed by the workspace's own submit flow.
  const [solved, setSolved] = useState<Record<string, boolean>>({});

  const totalQuestions = test.mcqs.length + test.problems.length;
  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;
  const solvedCount = Object.values(solved).filter(Boolean).length;

  const toggleOption = (mcqId: string, optionId: string, multi: boolean) => {
    if (alreadySubmitted) return;
    setAnswers((prev) => {
      const current = prev[mcqId] ?? [];
      // Single-correct behaves like a radio: picking replaces. Multi-correct
      // toggles individually.
      if (!multi) {
        return { ...prev, [mcqId]: [optionId] };
      }
      const isActive = current.includes(optionId);
      return {
        ...prev,
        [mcqId]: isActive
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const onSubmit = async () => {
    const unanswered = totalQuestions - answeredCount - solvedCount;
    const confirmMessage =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit and grade anyway?`
        : "Submit this test for grading?";
    if (!window.confirm(confirmMessage)) return;

    try {
      setSubmitting(true);
      const payload = Object.entries(answers)
        .filter(([, ids]) => ids.length > 0)
        .map(([mcqId, selectedOptionIds]) => ({ mcqId, selectedOptionIds }));

      const { data } = await axios.post<SubmitResponse>(
        `/api/tests/${test.id}/submit`,
        { answers: payload }
      );
      setResult(data);
      toast.success(`Test submitted — ${data.score}/${data.maxScore}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong submitting the test");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Results view -----------------------------------------------------
  if (result) {
    const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    const resultsById = new Map(result.mcqResults.map((r) => [r.mcqId, r]));
    const solvedById = new Map(result.problemResults.map((p) => [p.problemId, p.solved]));

    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Test submitted</span>
          </div>
          <div className="text-4xl font-bold">
            {result.score}
            <span className="text-2xl text-muted-foreground">/{result.maxScore}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">{pct}% correct</div>

          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {result.mcqResults.filter((r) => r.isCorrect).length} of {test.mcqs.length} MCQ
              {test.mcqs.length === 1 ? "" : "s"} correct
            </span>
            {test.problems.length > 0 && (
              <span className="text-muted-foreground">
                {result.problemResults.filter((p) => p.solved).length} of {test.problems.length} coding
                {test.problems.length === 1 ? "" : "s"} solved
              </span>
            )}
          </div>
        </div>

        {/* Per-question review. Explanations are only meaningful once graded,
            so they render here rather than during the attempt. */}
        <div className="space-y-4">
          {test.mcqs.map((mcq, index) => {
            const res = resultsById.get(mcq.id);
            const selected = answers[mcq.id] ?? [];
            const correctIds = selected.length ? res?.isCorrect : false;
            return (
              <div key={mcq.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground shrink-0 mt-0.5">
                    Q{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{mcq.question}</p>
                    <div className="mt-3 space-y-1.5">
                      {mcq.options.map((option) => {
                        const wasSelected = selected.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                              wasSelected && correctIds
                                ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                                : wasSelected
                                ? "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10"
                                : "border-slate-200 dark:border-slate-700"
                            )}
                          >
                            <span
                              className={cn(
                                "h-4 w-4 shrink-0 rounded border flex items-center justify-center",
                                wasSelected && correctIds
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : wasSelected
                                  ? "bg-red-600 border-red-600 text-white"
                                  : "border-slate-300 dark:border-slate-600"
                              )}
                            >
                              {wasSelected && <CheckCheck className="h-3 w-3" />}
                            </span>
                            <span>{option.text}</span>
                          </div>
                        );
                      })}
                    </div>
                    {selected.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        Not answered
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {test.problems.map((problem, index) => {
            const res = solvedById.get(problem.id);
            return (
              <div key={problem.id} className="glass-card rounded-2xl p-4 flex items-center gap-2">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground shrink-0">
                  C{index + 1}
                </span>
                <span className="text-sm font-medium flex-1 truncate">{problem.title}</span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    res
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                      : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                  )}
                >
                  {res ? "Solved" : "Not solved"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----- Taking the test --------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {answeredCount + solvedCount} of {totalQuestions} answered
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {test.mcqs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {test.mcqs.length} MCQ{test.mcqs.length === 1 ? "" : "s"} · {test.problems.length} coding
              {test.problems.length === 1 ? "" : "s"}
            </span>
          )}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1" />
            )}
            Submit test
          </Button>
        </div>
      </div>

      {test.mcqs.map((mcq, index) => {
        const selected = answers[mcq.id] ?? [];
        // A question is multi-correct only if it was authored with several
        // correct options. The student payload deliberately omits the key, so
        // the runner infers the input style from a hint the API includes.
        const multi = (mcq as McqPayload & { multiCorrect?: boolean }).multiCorrect === true;
        return (
          <div key={mcq.id} className="glass-card rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground shrink-0 mt-0.5">
                Q{index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{mcq.question}</p>
                {multi && (
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    Select all that apply
                  </p>
                )}
                <div className="mt-3 space-y-1.5">
                  {mcq.options.map((option) => {
                    const isActive = selected.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(mcq.id, option.id, multi)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition",
                          isActive
                            ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 shrink-0 border flex items-center justify-center",
                            multi ? "rounded-sm" : "rounded-full",
                            isActive
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {isActive && <CheckCheck className="h-3 w-3" />}
                        </span>
                        <span>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {test.problems.map((problem, index) => (
        <div key={problem.id} className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground shrink-0">
              C{index + 1}
            </span>
            <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{problem.title}</span>
            {solved[problem.id] && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 shrink-0">
                solved
              </span>
            )}
          </div>
          <CodingWorkspace
            problem={problem}
            submissions={problem.submissions ?? []}
            apiBase={`/api/tests/${test.id}`}
            onAccepted={() => setSolved((prev) => ({ ...prev, [problem.id]: true }))}
          />
        </div>
      ))}
    </div>
  );
};
