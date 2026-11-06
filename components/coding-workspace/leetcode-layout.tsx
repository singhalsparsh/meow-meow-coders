"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bookmark,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Info,
  Lightbulb,
  ListChecks,
  Maximize2,
  Play,
  Plus,
  RotateCcw,
  Settings,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { ResultsPanel } from "./results-panel";
import { DifficultyBadge, TopicBadge, VerdictBadge } from "./badges";
import type {
  CodingProblemPayload,
  JudgeDoneMessage,
  ProblemSubmissionPayload,
} from "@/lib/coding/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type LeftTab = "problem" | "solution" | "submissions" | "peer";
type CategoryFilter = "all" | "sample" | "hidden";

interface LeetCodeLayoutProps {
  problem: CodingProblemPayload;
  submissions: ProblemSubmissionPayload[];
  code: string;
  onCodeChange: (value: string) => void;
  busy: boolean;
  submitting: boolean;
  loading: boolean;
  progress?: number;
  onReset: () => void;
  onRun: () => void;
  onSubmit: () => void;
  result: JudgeDoneMessage | null;
  error: string | null;
  statusMessage: string | null;
  caseInputs: Record<string, string>;
  onCaseInputChange: (caseId: string, value: string) => void;
  onRunCase: (caseId: string) => void;
  activeCaseId: string | null;
  onActiveCaseChange: (caseId: string) => void;
  leftWidth: number;
  onVerticalDragStart: (e: React.PointerEvent) => void;
  editorHeight: number;
  onHorizontalDragStart: (e: React.PointerEvent) => void;
  isMobile: boolean;
}

export function LeetCodeLayout({
  problem,
  submissions,
  code,
  onCodeChange,
  busy,
  submitting,
  loading,
  progress,
  onReset,
  onRun,
  onSubmit,
  result,
  error,
  statusMessage,
  caseInputs,
  onCaseInputChange,
  onRunCase,
  activeCaseId,
  onActiveCaseChange,
  leftWidth,
  onVerticalDragStart,
  editorHeight,
  onHorizontalDragStart,
  isMobile,
}: LeetCodeLayoutProps) {
  const [leftTab, setLeftTab] = useState<LeftTab>("problem");
  const [bookmarked, setBookmarked] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const examples = problem.testCases;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e] text-[#d4d4d4] selection:bg-[#264f78]">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ============================= LEFT PANE ============================= */}
        <div
          className="flex min-w-0 flex-col border-r border-[#2d2d2d]"
          style={isMobile ? { height: "42%" } : { width: `${leftWidth}%` }}
        >
          {/* Left tabs */}
          <div className="flex h-10 flex-shrink-0 items-center border-b border-[#2d2d2d] text-[13px]">
            {(
              [
                ["problem", "Problem"],
                ["solution", "Solution"],
                ["submissions", "Submissions"],
                ["peer", "Peer Solutions"],
              ] as [LeftTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeftTab(id)}
                className={cn(
                  "relative h-full px-4 font-medium transition-colors",
                  leftTab === id
                    ? "text-white"
                    : "text-[#6e6e6e] hover:text-[#cccccc]"
                )}
              >
                {label}
                {leftTab === id && (
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#3d8ef7]" />
                )}
              </button>
            ))}
            <div className="ml-auto flex items-center pr-3">
              <button
                type="button"
                onClick={() => setBookmarked((b) => !b)}
                className="p-1.5 text-[#6e6e6e] transition-colors hover:text-white"
                aria-label="Bookmark"
              >
                {bookmarked ? (
                  <BookMarked className="h-4 w-4 fill-[#3d8ef7] text-[#3d8ef7]" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Left scroll content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {leftTab === "problem" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-white">{problem.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <TopicBadge topic={problem.topic} />
                    <span className="rounded-full border border-[#3a3a3a] bg-[#2d2d2d] px-2.5 py-0.5 text-xs font-medium text-[#b0b0b0]">
                      Companies
                    </span>
                    <span className="text-xs text-[#6e6e6e]">
                      {problem.timeLimitMs} ms
                    </span>
                  </div>
                </div>

                {problem.description && (
                  <div className="prose prose-sm max-w-none prose-invert prose-headings:text-white prose-p:text-[#d4d4d4] prose-strong:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {problem.description}
                    </ReactMarkdown>
                  </div>
                )}

                {problem.constraints && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
                      Constraints
                    </h4>
                    <div className="prose prose-sm max-w-none prose-invert rounded-lg border border-[#3a3a3a] bg-[#262626] p-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.constraints}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {examples.map((tc, i) => (
                  <div key={tc.id} className="border-l-2 border-[#3d8ef7] pl-4 space-y-1.5">
                    <p className="text-sm font-semibold text-white">Example {i + 1}:</p>
                    <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#c6c6c6]">
                      Input: {tc.input}
                      {"\n"}Output: {tc.expectedOutput}
                    </pre>
                    {tc.explanation && (
                      <p className="text-[13px] text-[#a8a8a8]">
                        <span className="font-medium text-white">Explanation: </span>
                        {tc.explanation}
                      </p>
                    )}
                  </div>
                ))}

                {/* "Now Your Turn!" callout */}
                <div className="mt-6 rounded-lg border border-[#3d8ef7]/40 bg-[#0e2439] p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[#ffc107]" />
                    <p className="text-sm font-semibold text-white">Now Your Turn!</p>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[#b8c7d9]">
                    Write your solution in the editor on the right, then press{" "}
                    <span className="font-medium text-white">Run</span> to test it
                    against the sample cases, or{" "}
                    <span className="font-medium text-white">Submit</span> to check
                    it against the full grading suite.
                  </p>
                </div>
              </div>
            )}

            {leftTab === "submissions" && (
              <SubmissionsTab submissions={submissions} />
            )}

            {(leftTab === "solution" || leftTab === "peer") && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-8 w-8 text-[#4a4a4a]" />
                <p className="mt-3 text-sm text-[#6e6e6e]">
                  {leftTab === "solution"
                    ? "No official solution for this problem yet."
                    : "Peer solutions are not shown."}
                </p>
              </div>
            )}
          </div>

          {/* Left footer: votes / notes */}
          <div className="flex h-11 flex-shrink-0 items-center gap-1 border-t border-[#2d2d2d] px-3 text-xs text-[#6e6e6e]">
            <button
              type="button"
              onClick={() => setVote(vote === "up" ? null : "up")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 transition-colors hover:text-white",
                vote === "up" && "text-[#3d8ef7]"
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span className="font-medium">102</span>
            </button>
            <button
              type="button"
              onClick={() => setVote(vote === "down" ? null : "down")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 transition-colors hover:text-white",
                vote === "down" && "text-[#3d8ef7]"
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-[#3a3a3a]" />
            <button type="button" className="rounded p-1.5 transition-colors hover:text-white" title="Hint">
              <Lightbulb className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="rounded p-1.5 transition-colors hover:text-white" title="Notes">
              <StickyNote className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="ml-auto rounded p-1.5 transition-colors hover:text-white" title="Info">
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Draggable vertical divider */}
        {!isMobile && (
          <div
            onPointerDown={onVerticalDragStart}
            className="w-1 flex-shrink-0 cursor-col-resize bg-[#262626] transition-colors hover:bg-[#2d2d2d]"
          />
        )}

        {/* ============================= RIGHT PANE ============================= */}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          {/* Editor nav */}
          <div className="flex h-10 flex-shrink-0 items-center border-b border-[#2d2d2d] text-[13px]">
            <div className="flex h-full items-center border-r border-[#2d2d2d] bg-[#2d2d2d] px-3 text-[#e8e8e8]">
              <span className="mr-2 h-2 w-2 rounded-full bg-[#3d8ef7]" />
              <span className="font-medium">Tab-1</span>
            </div>
            <button
              type="button"
              className="flex h-full items-center px-2 text-[#6e6e6e] transition-colors hover:text-white"
              title="New tab"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="ml-auto flex items-center gap-1.5 pr-2">
              {/* Language dropdown */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded border border-[#3a3a3a] bg-[#2d2d2d] px-2.5 py-1 text-xs font-medium text-[#d4d4d4] transition-colors hover:border-[#4a4a4a]"
              >
                C++
                <ChevronDown className="h-3 w-3 text-[#8a8a8a]" />
              </button>

              {/* Run */}
              <Button
                type="button"
                onClick={onRun}
                disabled={busy || submitting}
                className="h-7 gap-1.5 border border-[#3a3a3a] bg-[#2d2d2d] px-3 text-xs font-medium text-[#d4d4d4] hover:bg-[#3a3a3a] hover:text-white"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Run
              </Button>

              {/* Submit */}
              <Button
                type="button"
                onClick={onSubmit}
                disabled={busy || submitting}
                className="h-7 gap-1.5 bg-[#2e7d32] px-3 text-xs font-semibold text-white hover:bg-[#388e3c]"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Submit
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div
            className="min-h-0 overflow-hidden"
            style={{ height: isMobile ? `${100 - editorHeight}%` : `${editorHeight}%` }}
          >
            <CodeEditor value={code} onChange={onCodeChange} />
          </div>

          {/* Toolchain load progress */}
          {loading && (
            <div className="h-0.5 w-full flex-shrink-0 overflow-hidden bg-[#2d2d2d]">
              <div
                className="h-full bg-[#3d8ef7] transition-all duration-300"
                style={{ width: `${Math.max(5, (progress ?? 0.3) * 100)}%` }}
              />
            </div>
          )}

          {/* Horizontal divider (editor vs console) */}
          {!isMobile && (
            <div
              onPointerDown={onHorizontalDragStart}
              className="h-1 flex-shrink-0 cursor-row-resize bg-[#262626] transition-colors hover:bg-[#2d2d2d]"
            />
          )}

          {/* Console / test-case panel */}
          <div className="flex min-h-0 flex-shrink-0 flex-col border-t border-[#2d2d2d] bg-[#1a1a1a]">
            {/* Console header */}
            <div className="flex h-9 flex-shrink-0 items-center gap-1 border-b border-[#2d2d2d] px-2 text-xs">
              {(
                [
                  ["all", "Test Case"],
                  ["sample", "Sample"],
                  ["hidden", "Hidden"],
                ] as [CategoryFilter, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={cn(
                    "rounded px-2.5 py-1 font-medium transition-colors",
                    category === id
                      ? "bg-[#3a3a3a] text-white"
                      : "text-[#6e6e6e] hover:text-[#cccccc]"
                  )}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-0.5">
                <a
                  href="#"
                  className="mr-2 text-[#3d8ef7] hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Login to save
                </a>
                <button
                  type="button"
                  onClick={onReset}
                  disabled={busy || submitting}
                  className="rounded p-1.5 text-[#6e6e6e] transition-colors hover:text-white disabled:opacity-40"
                  title="Reset code"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-[#6e6e6e] transition-colors hover:text-white"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCheck className="h-3.5 w-3.5 text-[#4caf50]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[#6e6e6e] transition-colors hover:text-white"
                  title="Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleOpen((o) => !o)}
                  className="rounded p-1.5 text-[#6e6e6e] transition-colors hover:text-white"
                  title={consoleOpen ? "Collapse console" : "Expand console"}
                >
                  {consoleOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Console body */}
            {consoleOpen && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ResultsPanel
                  problem={problem}
                  result={result}
                  error={error}
                  busy={busy}
                  statusMessage={statusMessage}
                  caseInputs={caseInputs}
                  onCaseInputChange={onCaseInputChange}
                  onRunCase={onRunCase}
                  activeCaseId={activeCaseId}
                  onActiveCaseChange={onActiveCaseChange}
                  categoryFilter={category}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionsTab({ submissions }: { submissions: ProblemSubmissionPayload[] }) {
  if (!submissions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListChecks className="h-8 w-8 text-[#4a4a4a]" />
        <p className="mt-3 text-sm text-[#6e6e6e]">
          No submissions yet. Write your solution and press Submit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-[#3a3a3a] bg-[#262626] px-3 py-2.5"
        >
          <div>
            <VerdictBadge verdict={s.status} />
            <p className="mt-1 text-xs text-[#8a8a8a]">
              {s.passedCount}/{s.totalCount} test cases passed
            </p>
          </div>
          <div className="text-right text-xs text-[#8a8a8a]">
            {s.runtimeMs != null && <p>{s.runtimeMs} ms</p>}
            <p>{new Date(s.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Re-export MonacoEditor to keep tree-shaking happy if referenced elsewhere.
export { MonacoEditor };
