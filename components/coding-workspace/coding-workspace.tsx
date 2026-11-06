"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Code2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { useCppJudge } from "@/hooks/use-cpp-judge";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import type {
  JudgeTestCase,
  ProblemSubmissionPayload,
  SubmissionVerdict,
} from "@/lib/coding/types";
import { VERDICT_LABEL, type CodingProblemPayload } from "@/lib/coding/types";
import { cn } from "@/lib/utils";
import { firaCode } from "@/lib/fonts";
import { LeetCodeLayout } from "./leetcode-layout";
import { DifficultyBadge } from "./badges";

interface CodingWorkspaceProps {
  problem: CodingProblemPayload;
  submissions: ProblemSubmissionPayload[];
  // Base URL for this problem's API: a chapter passes its route, a test passes
  // its own. The workspace is agnostic to which kind of assessment owns it.
  apiBase: string;
  // Fired when a submission is fully accepted. A test uses this to mark the
  // problem solved in its own scoring; a lesson ignores it.
  onAccepted?: () => void;
  // Render as a standalone full-page workspace (always expanded, fills the
  // viewport below the top navbar) instead of an embedded card.
  fullPage?: boolean;
}

const MOBILE_BREAKPOINT = "(max-width: 768px)";

export function CodingWorkspace({
  problem,
  submissions: initialSubmissions,
  apiBase,
  onAccepted,
  fullPage = false,
}: CodingWorkspaceProps) {
  // Auto-save key: code_draft_<problemId>_<language>.
  const storageKey = `code_draft_${problem.id}_cpp`;

  const [code, setCode] = useState<string>(() => {
    if (typeof window === "undefined") return problem.starterCode;
    try {
      return window.localStorage.getItem(storageKey) ?? problem.starterCode;
    } catch {
      return problem.starterCode;
    }
  });
  const [draftSaved, setDraftSaved] = useState(false);

  // Debounced auto-save (1000 ms) so typing doesn't hammer localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!code) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, code);
      } catch {
        // Private mode / disabled storage: persistence is best-effort.
      }
      setDraftSaved(true);
      window.setTimeout(() => setDraftSaved(false), 1200);
    }, 1000);
    return () => clearTimeout(t);
  }, [code, storageKey]);

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">(
    "description"
  );
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseInputs, setCaseInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Editor theme selection, persisted to localStorage.
  const [editorTheme, setEditorTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "lms-dark";
    try {
      return window.localStorage.getItem("code_editor_theme") ?? "lms-dark";
    } catch {
      return "lms-dark";
    }
  });
  const [leftWidth, setLeftWidth] = useState(42);
  const [editorHeight, setEditorHeight] = useState(58);
  // Collapsed by default so the tall workspace only mounts once the learner
  // opts in; otherwise it pushes the rest of the chapter far down the page.
  // Full-page mode is always expanded.
  const [isExpanded, setIsExpanded] = useState(fullPage);

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

  const handleThemeChange = (theme: string) => {
    setEditorTheme(theme);
    try {
      window.localStorage.setItem("code_editor_theme", theme);
    } catch {
      // ignore
    }
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
        `${apiBase}/problem/submission-suite?problemId=${problem.id}`
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
        `${apiBase}/problem/submit`,
        {
          problemId: problem.id,
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
        toast.success("Accepted!");
        onAccepted?.();
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

  // Collapsed: show a compact summary row. The heavy editor + WASM toolchain
  // only mount once the learner expands the challenge.
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10">
          <Code2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{problem.title}</h3>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Click to open the coding challenge
          </p>
        </div>
        <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-y-0.5" />
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        firaCode.variable,
        fullPage
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border md:h-[calc(100vh-190px)] md:min-h-[560px]"
      )}
    >
      <LeetCodeLayout
        problem={problem}
        submissions={submissions}
        code={code}
        onCodeChange={setCode}
        busy={busy}
        submitting={submitting}
        loading={loading}
        progress={typeof judge.progress === "number" ? judge.progress : undefined}
        onReset={handleReset}
        onRun={handleRun}
        onSubmit={handleSubmit}
        result={judge.result}
        error={judge.error}
        statusMessage={judge.statusMessage}
        caseInputs={caseInputs}
        onCaseInputChange={(caseId, value) =>
          setCaseInputs((prev) => ({ ...prev, [caseId]: value }))
        }
        onRunCase={handleRunCase}
        activeCaseId={activeCaseId}
        onActiveCaseChange={setActiveCaseId}
        leftWidth={leftWidth}
        onVerticalDragStart={startVerticalDrag}
        editorHeight={editorHeight}
        onHorizontalDragStart={startHorizontalDrag}
        isMobile={isMobile}
        draftSaved={draftSaved}
        editorTheme={editorTheme}
        onEditorThemeChange={handleThemeChange}
      />
    </div>
  );
}
