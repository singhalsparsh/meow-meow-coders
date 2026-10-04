"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, Loader2, Play, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useCppJudge } from "@/hooks/use-cpp-judge";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import type {
  JudgeTestCase,
  ProblemSubmissionPayload,
  SubmissionVerdict,
} from "@/lib/coding/types";
import { VERDICT_LABEL, type CodingProblemPayload } from "@/lib/coding/types";
import { CodeEditor } from "./code-editor";
import { ProblemPanel } from "./problem-panel";
import { ResultsPanel } from "./results-panel";
import { DifficultyBadge, TopicBadge } from "./badges";

interface CodingWorkspaceProps {
  problem: CodingProblemPayload;
  submissions: ProblemSubmissionPayload[];
  courseId: string;
  chapterId: string;
}

const MOBILE_BREAKPOINT = "(max-width: 768px)";

export function CodingWorkspace({
  problem,
  submissions: initialSubmissions,
  courseId,
  chapterId,
}: CodingWorkspaceProps) {
  const storageKey = `cpp-code:${problem.id}`;

  const [code, setCode] = useState<string>(() => {
    if (typeof window === "undefined") return problem.starterCode;
    try {
      return window.localStorage.getItem(storageKey) ?? problem.starterCode;
    } catch {
      return problem.starterCode;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      // Private mode / disabled storage: persistence is best-effort.
    }
  }, [code, storageKey]);

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">(
    "description"
  );
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseInputs, setCaseInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [leftWidth, setLeftWidth] = useState(42);
  const [editorHeight, setEditorHeight] = useState(58);

  const judge = useCppJudge();
  const confetti = useConfettiStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const busy = judge.status !== "idle";

  const handleReset = () => {
    setCode(problem.starterCode);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    toast.success("Reset to starter code");
  };

  const runCases = useCallback(
    async (cases: JudgeTestCase[]) => {
      if (!cases.length) {
        toast.error("This problem has no test cases to run");
        return null;
      }
      try {
        return await judge.execute({
          mode: "run",
          source: code,
          driverCode: problem.driverCode,
          testCases: cases,
          timeLimitMs: problem.timeLimitMs,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Run failed unexpectedly"
        );
        return null;
      }
    },
    [code, problem.driverCode, problem.timeLimitMs, judge]
  );

  const handleRun = async () => {
    const cases: JudgeTestCase[] = problem.testCases.map((tc) => ({
      id: tc.id,
      input: caseInputs[tc.id] ?? tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false,
    }));
    await runCases(cases);
  };

  const handleRunCase = async (caseId: string) => {
    const tc = problem.testCases.find((t) => t.id === caseId);
    if (!tc) return;
    setActiveCaseId(caseId);
    await runCases([
      {
        id: tc.id,
        input: caseInputs[caseId] ?? tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
      },
    ]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: suite } = await axios.get(
        `/api/courses/${courseId}/chapters/${chapterId}/problem/submission-suite`
      );

      const cases: JudgeTestCase[] = (suite.testCases ?? []).map(
        (tc: { id: string; input: string; expectedOutput: string; isHidden: boolean }) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })
      );

      const result = await judge.execute({
        mode: "submit",
        source: code,
        driverCode: suite.driverCode ?? problem.driverCode,
        testCases: cases,
        timeLimitMs: suite.timeLimitMs ?? problem.timeLimitMs,
      });

      if (!result) return;

      const { data } = await axios.post(
        `/api/courses/${courseId}/chapters/${chapterId}/problem/submit`,
        {
          code,
          status: result.verdict,
          passedCount: result.passedCount,
          totalCount: result.totalCount,
          runtimeMs: result.runtimeMs,
        }
      );

      setSubmissions((prev) => [
        {
          id: data.id,
          status: data.status as SubmissionVerdict,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          runtimeMs: data.runtimeMs,
          createdAt: data.createdAt,
        },
        ...prev,
      ]);
      setActiveTab("submissions");

      if (data.isAccepted) {
        confetti.onOpen();
        toast.success("Accepted — chapter complete!");
      } else {
        toast.error(VERDICT_LABEL[result.verdict]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Submission failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Split pane drag handlers -------------------------------------------
  const startVerticalDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const onMove = (e: PointerEvent) => {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(70, Math.max(25, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startHorizontalDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const top = rect.top;
    const onMove = (e: PointerEvent) => {
      const pct = ((e.clientY - top) / rect.height) * 100;
      // The top bar is ~56px; express the editor share relative to the body.
      setEditorHeight(Math.min(80, Math.max(25, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const loading = judge.status === "loading";

  return (
    <div
      ref={containerRef}
      className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 backdrop-blur md:h-[calc(100vh-190px)] md:min-h-[560px]"
    >
      {/* Top control bar */}
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-slate-200 dark:border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold sm:text-base">
            {problem.title}
          </h3>
          <TopicBadge topic={problem.topic} />
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {problem.timeLimitMs} ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            disabled={busy || submitting}
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            onClick={handleRun}
            variant="outline"
            size="sm"
            disabled={busy || submitting}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <Play className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            Run
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={busy || submitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            Submit
          </Button>
        </div>
      </div>

      {/* Toolchain load progress */}
      {loading && (
        <div className="h-1 w-full flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{
              width: `${
                typeof judge.progress === "number"
                  ? Math.max(5, judge.progress * 100)
                  : 30
              }%`,
            }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left: problem context + history */}
        <div
          className="min-h-0 min-w-0 flex-shrink-0 overflow-hidden md:border-r md:border-slate-200 md:dark:border-slate-700"
          style={isMobile ? { height: "38%", flexShrink: 0 } : { width: `${leftWidth}%` }}
        >
          <ProblemPanel
            problem={problem}
            submissions={submissions}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {!isMobile && (
          <div
            onPointerDown={startVerticalDrag}
            className="w-1.5 flex-shrink-0 cursor-col-resize bg-slate-200/60 transition-colors hover:bg-sky-400 dark:bg-slate-700/60 dark:hover:bg-sky-500"
          />
        )}

        {/* Right: editor + console */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className="min-h-0 overflow-hidden"
            style={{ height: isMobile ? `${100 - editorHeight}%` : `${editorHeight}%` }}
          >
            <CodeEditor value={code} onChange={setCode} />
          </div>

          {!isMobile ? (
            <div
              onPointerDown={startHorizontalDrag}
              className="h-1.5 flex-shrink-0 cursor-row-resize bg-slate-200/60 transition-colors hover:bg-sky-400 dark:bg-slate-700/60 dark:hover:bg-sky-500"
            />
          ) : null}

          <div
            className="min-h-0 flex-1 overflow-hidden border-t border-slate-200 dark:border-slate-700"
            style={isMobile ? { height: `${editorHeight}%`, flexShrink: 0 } : undefined}
          >
            <ResultsPanel
              problem={problem}
              result={judge.result}
              error={judge.error}
              busy={busy}
              statusMessage={judge.statusMessage}
              caseInputs={caseInputs}
              onCaseInputChange={(caseId, value) =>
                setCaseInputs((prev) => ({ ...prev, [caseId]: value }))
              }
              onRunCase={handleRunCase}
              activeCaseId={activeCaseId}
              onActiveCaseChange={setActiveCaseId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
