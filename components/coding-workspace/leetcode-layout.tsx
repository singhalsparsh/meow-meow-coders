"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
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
  Minimize2,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Loader2,
  CheckCheck,
  Wand2,
  X,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { ResultsPanel } from "./results-panel";
import { EDITOR_THEMES } from "./editor-themes";
import { DifficultyBadge, TopicBadge, VerdictBadge } from "./badges";
import { getHints } from "./hints";
import type {
  CodingProblemPayload,
  JudgeDoneMessage,
  ProblemSubmissionPayload,
} from "@/lib/coding/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type LeftTab = "problem" | "solution" | "submissions";
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
  /** True when a debounced auto-save just committed (flash indicator). */
  draftSaved?: boolean;
  /** Selected Monaco theme id. */
  editorTheme?: string;
  /** Callback when the user changes the editor theme. */
  onEditorThemeChange?: (theme: string) => void;
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
  draftSaved = false,
  editorTheme = "lms-dark",
  onEditorThemeChange,
}: LeetCodeLayoutProps) {
  const [leftTab, setLeftTab] = useState<LeftTab>("problem");
  const [bookmarked, setBookmarked] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<"hint" | "info" | null>(null);

  // Editor / settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    "layout" | "editor" | "shortcuts"
  >("layout");
  const [fontSize, setFontSize] = useState(16);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState(false);
  // Fullscreen: hide the left panel and expand the editor + console.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<any>(null);

  const handleFormat = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const action = editor.getAction?.("editor.action.formatDocument");
    if (action) {
      action.run();
    } else {
      editor.trigger?.("keyboard", "editor.action.formatDocument");
    }
    // Keep focus in the editor after formatting.
    setTimeout(() => editor.focus?.(), 0);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (e.shiftKey) {
        if (!busy && !submitting) onSubmit();
      } else {
        if (!busy && !submitting) onRun();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, submitting, onRun, onSubmit]);

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
    <div
      className={cn(
        "flex flex-col min-h-0 bg-[var(--ide-bg)] text-[var(--ide-foreground)] selection:bg-primary/30",
        isFullscreen ? "fixed inset-0 z-[90]" : "h-full"
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ============================= LEFT PANE ============================= */}
        {!isFullscreen && (
        <div
          className="flex min-w-0 flex-col border-r border-[var(--ide-border)]"
          style={isMobile ? { height: "42%" } : { width: `${leftWidth}%` }}
        >
          {/* Left tabs */}
          <div className="flex h-10 flex-shrink-0 items-center border-b border-[var(--ide-border)] text-[13px]">
            {(
              [
                ["problem", "Problem"],
                ["solution", "Solution"],
                ["submissions", "Submissions"],
              ] as [LeftTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeftTab(id)}
                className={cn(
                  "relative h-full px-4 font-medium transition-colors",
                  leftTab === id
                    ? "text-[var(--ide-active)]"
                    : "text-[var(--ide-foreground-muted)] hover:text-[var(--ide-active)]"
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
                className="p-1.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]"
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
                  <h1 className="text-xl font-semibold text-[var(--ide-active)]">{problem.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <TopicBadge topic={problem.topic} />
                    <span className="text-xs text-[var(--ide-foreground-muted)]">
                      {problem.timeLimitMs} ms
                    </span>
                  </div>
                </div>

                {problem.description && (
                  <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert prose-headings:text-[var(--ide-active)] prose-p:text-[var(--ide-foreground)] prose-strong:text-[var(--ide-active)] prose-code:rounded prose-code:bg-[var(--ide-surface)] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[var(--ide-foreground)] prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {problem.description}
                    </ReactMarkdown>
                  </div>
                )}

                {problem.constraints && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ide-foreground-muted)]">
                      Constraints
                    </h4>
                    <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert rounded-lg border border-[var(--ide-border)] bg-[var(--ide-surface)] p-3 prose-code:rounded prose-code:bg-[var(--ide-bg-deep)] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[var(--ide-foreground)] prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.constraints}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {examples.map((tc, i) => (
                  <div key={tc.id} className="border-l-2 border-[#3d8ef7] pl-4 space-y-1.5">
                    <p className="text-sm font-semibold text-[var(--ide-active)]">Example {i + 1}:</p>
                    <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[var(--ide-foreground)]">
                      Input: {tc.input}
                      {"\n"}Output: {tc.expectedOutput}
                    </pre>
                    {tc.explanation && (
                      <p className="text-[13px] text-[var(--ide-foreground-muted)]">
                        <span className="font-medium text-[var(--ide-active)]">Explanation: </span>
                        {tc.explanation}
                      </p>
                    )}
                  </div>
                ))}

                {/* "Now Your Turn!" callout */}
                <div className="mt-6 rounded-lg border border-[#3d8ef7]/40 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[#ffc107]" />
                    <p className="text-sm font-semibold text-[var(--ide-active)]">Now Your Turn!</p>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[var(--ide-foreground-muted)]">
                    Write your solution in the editor on the right, then press{" "}
                    <span className="font-medium text-[var(--ide-active)]">Run</span> to test it
                    against the sample cases, or{" "}
                    <span className="font-medium text-[var(--ide-active)]">Submit</span> to check
                    it against the full grading suite.
                  </p>
                </div>
              </div>
            )}

            {leftTab === "submissions" && (
              <SubmissionsTab submissions={submissions} />
            )}

            {leftTab === "solution" && (
              <div>
                {problem.solution?.trim() ? (
                  <div className="prose max-w-none dark:prose-invert prose-headings:text-[var(--ide-active)] prose-p:text-[var(--ide-foreground)] prose-strong:text-[var(--ide-active)] prose-pre:bg-[var(--ide-surface)] prose-pre:border prose-pre:border-[var(--ide-border)] prose-code:text-[var(--ide-foreground)]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {problem.solution}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FileText className="h-8 w-8 text-[var(--ide-foreground-muted)]" />
                    <p className="mt-3 text-sm text-[var(--ide-foreground-muted)]">
                      No official solution for this problem yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Left footer: hint / info */}
          <div className="relative flex h-11 flex-shrink-0 items-center gap-1 border-t border-[var(--ide-border)] px-3 text-xs text-[var(--ide-foreground-muted)]">
            <span className="mx-1 h-4 w-px bg-[var(--ide-surface-hover)]" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setPanel(panel === "hint" ? null : "hint")}
                className={cn(
                  "rounded p-1.5 transition-colors hover:text-[var(--ide-active)]",
                  panel === "hint" && "bg-[var(--ide-surface)] text-[var(--ide-active)]"
                )}
                title="Hint"
              >
                <Lightbulb className="h-3.5 w-3.5" />
              </button>
              {panel === "hint" && (
                <FooterPopover
                  title="Hints"
                  onClose={() => setPanel(null)}
                  align="left"
                >
                  <ul className="space-y-2">
                    {getHints(problem.topic, problem.difficulty).map((h, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-snug text-[var(--ide-foreground)]">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#3d8ef7]/20 text-[10px] font-semibold text-[#3d8ef7]">
                          {i + 1}
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </FooterPopover>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPanel(panel === "info" ? null : "info")}
              className={cn(
                "ml-auto rounded p-1.5 transition-colors hover:text-[var(--ide-active)]",
                panel === "info" && "bg-[var(--ide-surface)] text-[var(--ide-active)]"
              )}
              title="Info"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {panel === "info" && (
              <FooterPopover
                title="Problem info"
                onClose={() => setPanel(null)}
                align="right"
              >
                <dl className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between gap-6">
                    <dt className="text-[var(--ide-foreground-muted)]">Difficulty</dt>
                    <dd className="font-medium text-[var(--ide-active)]">
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-[var(--ide-foreground-muted)]">Topic</dt>
                    <dd className="font-medium text-[var(--ide-active)]">
                      <TopicBadge topic={problem.topic} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-[var(--ide-foreground-muted)]">Time limit</dt>
                    <dd className="font-medium text-[var(--ide-active)]">{problem.timeLimitMs} ms</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-[var(--ide-foreground-muted)]">Language</dt>
                    <dd className="font-medium text-[var(--ide-active)]">C++</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-[var(--ide-foreground-muted)]">Test cases</dt>
                    <dd className="font-medium text-[var(--ide-active)]">
                      {problem.testCases.filter((t) => !t.isHidden).length} public •{" "}
                      {problem.testCases.filter((t) => t.isHidden).length} hidden
                    </dd>
                  </div>
                </dl>
              </FooterPopover>
            )}
          </div>
        </div>
        )}

        {/* Draggable vertical divider */}
        {!isMobile && !isFullscreen && (
          <div
            onPointerDown={onVerticalDragStart}
            className="w-1 flex-shrink-0 cursor-col-resize bg-[var(--ide-surface)] transition-colors hover:bg-[var(--ide-surface)]"
          />
        )}

        {/* ============================= RIGHT PANE ============================= */}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          {/* Editor nav */}
          <div className="flex h-10 flex-shrink-0 items-center border-b border-[var(--ide-border)] text-[13px]">
            {/* Draft auto-save indicator */}
            <div className="min-w-0 pl-3">
              {draftSaved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#4caf50]">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Draft saved
                </span>
              ) : (
                <span className="text-xs text-[var(--ide-foreground-muted)]">Auto-saves</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5 pr-2">
              {/* Format code */}
              <button
                type="button"
                onClick={handleFormat}
                title="Format code (Shift+Alt+F)"
                className="flex items-center gap-1.5 rounded border border-[var(--ide-border)] bg-[var(--ide-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ide-foreground)] transition-colors hover:border-[var(--ide-border)] hover:text-[var(--ide-active)]"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Format
              </button>

              {/* Language dropdown */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded border border-[var(--ide-border)] bg-[var(--ide-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ide-foreground)] transition-colors hover:border-[var(--ide-border)]"
              >
                C++
                <ChevronDown className="h-3 w-3 text-[var(--ide-foreground-muted)]" />
              </button>

              {/* Run */}
              <Button
                type="button"
                onClick={onRun}
                disabled={busy || submitting}
                className="h-7 gap-1.5 border border-[var(--ide-border)] bg-[var(--ide-surface)] px-3 text-xs font-medium text-[var(--ide-foreground)] hover:bg-[var(--ide-surface-hover)] hover:text-[var(--ide-active)]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </>
                )}
              </Button>

              {/* Submit */}
              <Button
                type="button"
                onClick={onSubmit}
                disabled={busy || submitting}
                className="h-7 gap-1.5 bg-[#2e7d32] px-3 text-xs font-semibold text-[var(--ide-active)] hover:bg-[#388e3c]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-3.5 w-3.5" />
                    Submit
                  </>
                )}
              </Button>

              {/* Fullscreen / Maximize */}
              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen editor"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded border transition-colors",
                  isFullscreen
                    ? "border-[#3d8ef7] bg-[#3d8ef7]/20 text-[#3d8ef7]"
                    : "border-[var(--ide-border)] bg-[var(--ide-surface)] text-[var(--ide-foreground)] hover:border-[var(--ide-border)] hover:text-[var(--ide-active)]"
                )}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div
            className={cn(
              "min-h-0 overflow-hidden flex-shrink-0",
              !consoleOpen && "flex-1"
            )}
            style={consoleOpen ? { height: `${editorHeight}%` } : undefined}
          >
            <CodeEditor
              value={code}
              onChange={onCodeChange}
              fontSize={fontSize}
              tabSize={tabSize}
              wordWrap={wordWrap}
              theme={editorTheme}
              onReady={(editor) => (editorRef.current = editor)}
            />
          </div>

          {/* Toolchain load progress */}
          {loading && (
            <div className="h-0.5 w-full flex-shrink-0 overflow-hidden bg-[var(--ide-surface)]">
              <div
                className="h-full bg-[#3d8ef7] transition-all duration-300"
                style={{ width: `${Math.max(5, (progress ?? 0.3) * 100)}%` }}
              />
            </div>
          )}

          {/* Horizontal divider (editor vs console) */}
          {!isMobile && consoleOpen && (
            <div
              onPointerDown={onHorizontalDragStart}
              className="h-1 flex-shrink-0 cursor-row-resize bg-[var(--ide-surface)] transition-colors hover:bg-[var(--ide-surface)]"
            />
          )}

          {/* Console / test-case panel */}
          <div
            className={cn(
              "flex min-h-0 flex-col border-t border-[var(--ide-border)] bg-[var(--ide-bg-deep)]",
              consoleOpen ? "flex-1" : "flex-shrink-0"
            )}
          >
            {/* Console header */}
            <div className="flex h-9 flex-shrink-0 items-center gap-1 border-b border-[var(--ide-border)] px-2 text-xs">
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
                      ? "bg-[var(--ide-surface-hover)] text-[var(--ide-active)]"
                      : "text-[var(--ide-foreground-muted)] hover:text-[var(--ide-active)]"
                  )}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onReset}
                  disabled={busy || submitting}
                  className="rounded p-1.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)] disabled:opacity-40"
                  title="Reset code"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCheck className="h-3.5 w-3.5 text-[#4caf50]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((o) => !o)}
                    className={cn(
                      "rounded p-1.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]",
                      settingsOpen && "bg-[var(--ide-surface)] text-[var(--ide-active)]"
                    )}
                    title="Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>

                  {settingsOpen && (
                    <SettingsPopover
                      tab={settingsTab}
                      onTabChange={setSettingsTab}
                      fontSize={fontSize}
                      onFontSizeChange={setFontSize}
                      tabSize={tabSize}
                      onTabSizeChange={setTabSize}
                      wordWrap={wordWrap}
                      onWordWrapChange={setWordWrap}
                      consoleOpen={consoleOpen}
                      onConsoleOpenChange={setConsoleOpen}
                      theme={editorTheme}
                      onThemeChange={onEditorThemeChange}
                      onClose={() => setSettingsOpen(false)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConsoleOpen((o) => !o)}
                  className="rounded p-1.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]"
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

type SettingsTab = "layout" | "editor" | "shortcuts";

interface SettingsPopoverProps {
  tab: SettingsTab;
  onTabChange: (t: SettingsTab) => void;
  fontSize: number;
  onFontSizeChange: (n: number) => void;
  tabSize: number;
  onTabSizeChange: (n: number) => void;
  wordWrap: boolean;
  onWordWrapChange: (b: boolean) => void;
  consoleOpen: boolean;
  onConsoleOpenChange: (b: boolean) => void;
  theme: string;
  onThemeChange?: (theme: string) => void;
  onClose: () => void;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-[var(--ide-foreground)] transition-colors hover:bg-[var(--ide-surface-hover)]"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-[#3d8ef7]" : "bg-[var(--ide-foreground-muted)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
            checked ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 text-xs">
      <span className="text-[var(--ide-foreground)]">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="rounded p-1 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)] disabled:opacity-40"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center font-mono text-[var(--ide-foreground)]">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="rounded p-1 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)] disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function FooterPopover({
  title,
  onClose,
  align,
  children,
}: {
  title: string;
  onClose: () => void;
  align: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-10 z-50 w-72 rounded-lg border border-[var(--ide-border)] bg-[var(--ide-surface)] p-3 shadow-2xl",
        align === "left" ? "left-0" : "right-0"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ide-active)]">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function SettingsPopover({
  tab,
  onTabChange,
  fontSize,
  onFontSizeChange,
  tabSize,
  onTabSizeChange,
  wordWrap,
  onWordWrapChange,
  consoleOpen,
  onConsoleOpenChange,
  theme,
  onThemeChange,
  onClose,
}: SettingsPopoverProps) {
  const tabs: [SettingsTab, string][] = [
    ["layout", "Layout"],
    ["editor", "Code Editor"],
    ["shortcuts", "Shortcuts"],
  ];

  return (
    <div className="absolute bottom-9 right-0 z-50 w-72 overflow-hidden rounded-lg border border-[var(--ide-border)] bg-[var(--ide-surface)] shadow-2xl">
      <div className="flex items-center border-b border-[var(--ide-border)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--ide-active)]">Settings</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-0.5 text-[var(--ide-foreground-muted)] transition-colors hover:text-[var(--ide-active)]"
          title="Close settings"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-[var(--ide-border)] px-2 py-1.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              tab === id
                ? "bg-[var(--ide-surface-hover)] text-[var(--ide-active)]"
                : "text-[var(--ide-foreground-muted)] hover:text-[var(--ide-active)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto py-1">
        {tab === "layout" && (
          <div className="space-y-0.5">
            <ToggleRow
              label="Show test case console"
              checked={consoleOpen}
              onChange={onConsoleOpenChange}
            />
            <p className="px-2 pt-1 text-[11px] leading-snug text-[var(--ide-foreground-muted)]">
              The console shows sample and hidden test cases, output and verdicts.
            </p>
          </div>
        )}

        {tab === "editor" && (
          <div className="space-y-0.5">
            {/* Theme selector */}
            <div className="px-2 py-1.5 text-xs">
              <span className="block text-[var(--ide-foreground)] mb-1.5">Editor theme</span>
              <div className="grid grid-cols-2 gap-1">
                {EDITOR_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange?.(t.id)}
                    className={cn(
                      "rounded px-2 py-1 text-left text-xs transition-colors",
                      theme === t.id
                        ? "bg-[#3d8ef7] text-[var(--ide-active)]"
                        : "text-[var(--ide-foreground)] hover:bg-[var(--ide-surface-hover)] hover:text-[var(--ide-active)]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-2 my-1.5 h-px bg-[var(--ide-surface)]" />
            <Stepper
              label="Font size"
              value={fontSize}
              min={10}
              max={24}
              onChange={onFontSizeChange}
            />
            <div className="flex items-center justify-between px-2 py-1.5 text-xs">
              <span className="text-[var(--ide-foreground)]">Tab size</span>
              <div className="flex gap-1">
                {[2, 4, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onTabSizeChange(n)}
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-xs transition-colors",
                      tabSize === n
                        ? "bg-[#3d8ef7] text-[var(--ide-active)]"
                        : "text-[var(--ide-foreground-muted)] hover:text-[var(--ide-active)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              label="Word wrap"
              checked={wordWrap}
              onChange={onWordWrapChange}
            />
          </div>
        )}

        {tab === "shortcuts" && (
          <div className="space-y-0.5 px-2 py-1">
            {(
              [
                ["Run code", "Ctrl ⌘ + Enter"],
                ["Submit code", "Ctrl ⌘ + Shift + Enter"],
                ["Format code", "Shift + Alt + F"],
                ["Reset code", "Toolbar button"],
                ["Copy code", "Toolbar button"],
              ] as [string, string][]
            ).map(([action, keys]) => (
              <div
                key={action}
                className="flex items-center justify-between py-1 text-xs"
              >
                <span className="text-[var(--ide-foreground-muted)]">{action}</span>
                <kbd className="rounded border border-[var(--ide-border)] bg-[var(--ide-surface-hover)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ide-foreground)]">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionsTab({ submissions }: { submissions: ProblemSubmissionPayload[] }) {
  if (!submissions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListChecks className="h-8 w-8 text-[var(--ide-foreground-muted)]" />
        <p className="mt-3 text-sm text-[var(--ide-foreground-muted)]">
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
          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ide-border)] bg-[var(--ide-surface)] px-3 py-2.5"
        >
          <div>
            <VerdictBadge verdict={s.status} />
            <p className="mt-1 text-xs text-[var(--ide-foreground-muted)]">
              {s.passedCount}/{s.totalCount} test cases passed
            </p>
          </div>
          <div className="text-right text-xs text-[var(--ide-foreground-muted)]">
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
