"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bookmark,
  BookMarked,
  Braces,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Lightbulb,
  ListChecks,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Settings,
  Loader2,
  Type,
  Undo2,
  Wand2,
  X,
  Minus,
  SearchCheck,
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

type NavTab = "description" | "editorial" | "submission" | "review";
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

const NAV_TABS: { id: NavTab; label: string; icon: ReactNode }[] = [
  { id: "description", label: "Description", icon: <FileText className="h-4 w-4" /> },
  { id: "editorial", label: "Editorial", icon: <BookMarked className="h-4 w-4" /> },
  { id: "submission", label: "Submission", icon: <CheckCheck className="h-4 w-4" /> },
  { id: "review", label: "Review", icon: <SearchCheck className="h-4 w-4" /> },
];

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
  const [navTab, setNavTab] = useState<NavTab>("description");
  const [bookmarked, setBookmarked] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copied, setCopied] = useState(false);
  const [editorialCopied, setEditorialCopied] = useState(false);
  const [dockTab, setDockTab] = useState<"cases" | "output">("cases");
  const [dockOpen, setDockOpen] = useState(true);

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
        "flex flex-col min-h-0 bg-[color:var(--ide-bg)] text-[color:var(--ide-foreground)] selection:bg-indigo-500/30",
        isFullscreen ? "fixed inset-0 z-[90]" : "h-full"
      )}
    >
      {/* ============================= TOP NAV ============================= */}
      <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-[color:var(--ide-border)] bg-[color:var(--ide-bg)] px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setNavTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                navTab === t.id
                  ? "bg-[color:var(--ide-surface-hover)] text-[color:var(--ide-active)]"
                  : "text-[color:var(--ide-foreground-muted)] hover:bg-[color:var(--ide-overlay-weak)] hover:text-[color:var(--ide-foreground)]"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={onRun}
            disabled={busy || submitting}
            className="h-8 gap-1.5 border border-[color:var(--ide-border)] bg-zinc-800 px-3.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white"
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
          <Button
            type="button"
            onClick={onSubmit}
            disabled={busy || submitting}
            className="h-8 gap-1.5 bg-indigo-500 px-3.5 text-xs font-semibold text-white hover:bg-indigo-400"
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
        </div>
      </div>

      {/* ============================= SPLIT ============================= */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ============================= LEFT PANE ============================= */}
        {!isFullscreen && (
          <div
            className="flex min-w-0 flex-col border-r border-[color:var(--ide-border)] md:p-2.5 md:bg-[color:var(--ide-bg-deep)]"
            style={isMobile ? { height: "42%" } : { width: `${leftWidth}%` }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[color:var(--ide-border)] bg-[color:var(--ide-bg)]">
              {/* Left card header */}
              <div className="flex h-11 flex-shrink-0 items-center border-b border-[color:var(--ide-border)] px-3">
                <span className="text-sm font-semibold text-[color:var(--ide-active)]">
                  {navTab === "description" ? "Description" : NAV_TABS.find((t) => t.id === navTab)?.label}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setBookmarked((b) => !b)}
                    className="rounded-md p-1.5 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
                    aria-label="Bookmark"
                  >
                    {bookmarked ? (
                      <BookMarked className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Left scroll content */}
              <div className="relative flex-1 overflow-y-auto px-4 py-4">
                {navTab === "description" && (
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-xl font-semibold text-[color:var(--ide-active)]">{problem.title}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={problem.difficulty} />
                        <TopicBadge topic={problem.topic} />
                        <span className="text-xs text-[color:var(--ide-foreground-muted)]">
                          {problem.timeLimitMs} ms
                        </span>
                      </div>
                    </div>

                    {problem.description && (
                      <div className="prose prose-sm max-w-none leading-relaxed prose-invert prose-headings:text-[color:var(--ide-active)] prose-p:text-[color:var(--ide-foreground)] prose-strong:text-[color:var(--ide-active)] prose-code:rounded prose-code:bg-[color:var(--ide-surface)] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-indigo-700 dark:prose-code:text-indigo-300 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {problem.description}
                        </ReactMarkdown>
                      </div>
                    )}

                    {problem.constraints && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--ide-foreground-muted)]">
                          Constraints
                        </h4>
                        <div className="prose prose-sm max-w-none leading-relaxed prose-invert rounded-lg border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)] p-3 prose-code:rounded prose-code:bg-[color:var(--ide-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-indigo-700 dark:prose-code:text-indigo-300 prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {problem.constraints}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {examples.map((tc, i) => (
                      <div key={tc.id} className="space-y-1.5">
                        <p className="text-sm font-semibold text-[color:var(--ide-active)]">Example {i + 1}:</p>
                        <MacWindow title={`Example ${i + 1}`} onCopy={() => {}}>
                          {`Input: ${tc.input}\nOutput: ${tc.expectedOutput}`}
                        </MacWindow>
                        {tc.explanation && (
                          <p className="text-[13px] text-[color:var(--ide-foreground-muted)]">
                            <span className="font-medium text-[color:var(--ide-active)]">Explanation: </span>
                            {tc.explanation}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* "Now Your Turn!" callout */}
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        <p className="text-sm font-semibold text-[color:var(--ide-active)]">Now Your Turn!</p>
                      </div>
                      <p className="mt-1.5 text-[13px] text-[color:var(--ide-foreground-muted)]">
                        Write your solution in the editor on the right, then press{" "}
                        <span className="font-medium text-indigo-700 dark:text-indigo-300">Run</span> to test it
                        against the sample cases, or{" "}
                        <span className="font-medium text-indigo-700 dark:text-indigo-300">Submit</span> to check
                        it against the full grading suite.
                      </p>
                    </div>
                  </div>
                )}

                {navTab === "submission" && <SubmissionsTab submissions={submissions} />}

                {navTab === "editorial" && (
                  <div>
                    {problem.solution?.trim() ? (
                      <div className="overflow-hidden rounded-lg border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)]">
                        <div className="flex h-9 items-center justify-between border-b border-[color:var(--ide-border)] px-3">
                          <span className="text-xs font-medium text-[color:var(--ide-foreground-muted)]">
                            Editorial / Solution
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(problem.solution ?? "");
                                setEditorialCopied(true);
                                setTimeout(() => setEditorialCopied(false), 1500);
                              } catch {
                                /* clipboard unavailable */
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-[color:var(--ide-foreground-muted)] transition-colors hover:bg-[color:var(--ide-overlay-weak)] hover:text-[color:var(--ide-active)]"
                            title="Copy solution code"
                          >
                            {editorialCopied ? (
                              <>
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <CodeEditor value={problem.solution} readOnly height={360} />
                      </div>
                    ) : (
                      <EmptyState
                        icon={<BookMarked className="h-8 w-8" />}
                        title="No editorial yet"
                        subtitle="The official approach for this problem hasn't been published."
                      />
                    )}
                  </div>
                )}

                {navTab === "review" && (
                  <EmptyState
                    icon={<SearchCheck />}
                    title="Review"
                    subtitle="This panel is ready for content."
                  />
                )}
              </div>

              {/* Left bottom dock: test cases / output */}
              <div className="flex flex-shrink-0 flex-col border-t border-[color:var(--ide-border)]">
                <div className="flex h-9 items-center gap-1 px-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDockTab("cases")}
                    className={cn(
                      "rounded px-2.5 py-1 font-medium transition-colors",
                      dockTab === "cases"
                        ? "bg-[color:var(--ide-overlay-strong)] text-[color:var(--ide-active)]"
                        : "text-[color:var(--ide-foreground-muted)] hover:text-[color:var(--ide-active)]"
                    )}
                  >
                    Test Cases
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockTab("output")}
                    className={cn(
                      "rounded px-2.5 py-1 font-medium transition-colors",
                      dockTab === "output"
                        ? "bg-[color:var(--ide-overlay-strong)] text-[color:var(--ide-active)]"
                        : "text-[color:var(--ide-foreground-muted)] hover:text-[color:var(--ide-active)]"
                    )}
                  >
                    Output
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockOpen((o) => !o)}
                    className="ml-auto rounded p-1 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
                    aria-label={dockOpen ? "Collapse dock" : "Expand dock"}
                  >
                    {dockOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {dockOpen && (
                  <div className="max-h-32 overflow-y-auto border-t border-[color:var(--ide-border)] px-3 py-2 text-xs">
                    {dockTab === "cases" ? (
                      <div className="space-y-2">
                        {examples.map((tc, i) => (
                          <div key={tc.id} className="space-y-0.5">
                            <p className="font-medium text-[color:var(--ide-foreground-muted)]">Case {i + 1}</p>
                            <pre className="whitespace-pre-wrap rounded bg-[color:var(--ide-surface)] p-2 font-mono text-[11px] text-[color:var(--ide-foreground)]">
                              {tc.input}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : result ? (
                      <div className="space-y-1">
                        <p className="text-[color:var(--ide-foreground-muted)]">
                          {result.passedCount}/{result.totalCount} passed
                        </p>
                        <pre className="whitespace-pre-wrap rounded bg-[color:var(--ide-surface)] p-2 font-mono text-[11px] text-[color:var(--ide-foreground)]">
                          {result.results.find((r) => r.id === activeCaseId)?.stdout || "(no output)"}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-[color:var(--ide-foreground-muted)]">Run code to see output.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Draggable vertical divider — 1px visible line on a wide hit area */}
        {!isMobile && !isFullscreen && (
          <div className="group/div relative flex w-2 flex-shrink-0 items-stretch justify-center">
            <div
              onPointerDown={onVerticalDragStart}
              className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 cursor-col-resize bg-[color:var(--ide-overlay-strong)] transition-colors group-hover/div:bg-indigo-500/70"
            />
          </div>
        )}

        {/* ============================= RIGHT PANE ============================= */}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          {/* Editor toolbar */}
          <div className="flex h-11 flex-shrink-0 items-center gap-1 border-b border-[color:var(--ide-border)] bg-[color:var(--ide-bg)] px-2">
            {/* Language selector */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--ide-foreground)] transition-colors hover:border-[color:var(--ide-border)]"
              >
                <Braces className="h-3.5 w-3.5 text-indigo-400" />
                C++
                <ChevronDown className="h-3 w-3 text-[color:var(--ide-foreground-muted)]" />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              {/* Format */}
              <ToolbarIconButton onClick={handleFormat} title="Format code (Shift+Alt+F)">
                <Wand2 className="h-4 w-4" />
              </ToolbarIconButton>
              {/* Font size */}
              <ToolbarIconButton onClick={() => setFontSize((f) => Math.min(24, f + 1))} title="Increase font size">
                <Type className="h-4 w-4" />
              </ToolbarIconButton>
              {/* Braces toggle (tab size) */}
              <ToolbarIconButton onClick={() => setTabSize(tabSize === 4 ? 2 : 4)} title="Toggle tab size">
                <Braces className="h-4 w-4" />
              </ToolbarIconButton>
              {/* Undo / Redo */}
              <ToolbarIconButton
                onClick={() => editorRef.current?.trigger?.("toolbar", "undo")}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarIconButton>
              <ToolbarIconButton
                onClick={() => editorRef.current?.trigger?.("toolbar", "redo")}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarIconButton>
              {/* Copy */}
              <ToolbarIconButton onClick={handleCopy} title="Copy code">
                {copied ? (
                  <CheckCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </ToolbarIconButton>
              {/* Expand / fullscreen */}
              <ToolbarIconButton
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? "Exit fullscreen" : "Expand editor"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </ToolbarIconButton>
              {/* Settings */}
              <div className="relative">
                <ToolbarIconButton
                  onClick={() => setSettingsOpen((o) => !o)}
                  title="Settings"
                  active={settingsOpen}
                >
                  <Settings className="h-4 w-4" />
                </ToolbarIconButton>
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
            <div className="h-0.5 w-full flex-shrink-0 overflow-hidden bg-[color:var(--ide-overlay-weak)]">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${Math.max(5, (progress ?? 0.3) * 100)}%` }}
              />
            </div>
          )}

          {/* Horizontal divider (editor vs console) — 1px visible line on a wide hit area */}
          {!isMobile && consoleOpen && (
            <div className="group/hdiv relative flex h-2 flex-shrink-0 items-center justify-center">
              <div
                onPointerDown={onHorizontalDragStart}
                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 cursor-row-resize bg-[color:var(--ide-overlay-strong)] transition-colors group-hover/hdiv:bg-indigo-500/70"
              />
            </div>
          )}

          {/* Console / test-case panel */}
          <div
            className={cn(
              "flex min-h-0 flex-col border-t border-[color:var(--ide-border)] bg-[color:var(--ide-bg-deep)]",
              consoleOpen ? "flex-1" : "flex-shrink-0"
            )}
          >
            {/* Console header */}
            <div className="flex h-9 flex-shrink-0 items-center gap-1 border-b border-[color:var(--ide-border)] px-2 text-xs">
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
                      ? "bg-[color:var(--ide-overlay-strong)] text-[color:var(--ide-active)]"
                      : "text-[color:var(--ide-foreground-muted)] hover:text-[color:var(--ide-active)]"
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
                  className="rounded p-1.5 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)] disabled:opacity-40"
                  title="Reset code"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleOpen((o) => !o)}
                  className="rounded p-1.5 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
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

function ToolbarIconButton({
  children,
  onClick,
  title,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--ide-foreground-muted)] transition-colors hover:bg-[color:var(--ide-overlay-strong)] hover:text-[color:var(--ide-active)]",
        active && "bg-[color:var(--ide-overlay-strong)] text-[color:var(--ide-active)]"
      )}
    >
      {children}
    </button>
  );
}

function MacWindow({
  title,
  onCopy,
  children,
}: {
  title?: string;
  onCopy: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)]">
      <div className="flex items-center gap-1.5 border-b border-[color:var(--ide-border)] px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        {title && <span className="ml-2 text-[11px] text-[color:var(--ide-foreground-muted)]">{title}</span>}
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto rounded p-1 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
          aria-label="Copy example"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="whitespace-pre-wrap p-3 font-mono text-[13px] leading-relaxed text-[color:var(--ide-foreground)]">
        {children}
      </pre>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--ide-overlay-weak)] text-[color:var(--ide-foreground-muted)]">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-[color:var(--ide-active)]">{title}</p>
      <p className="mt-1 text-[13px] text-[color:var(--ide-foreground-muted)]">{subtitle}</p>
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
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-[color:var(--ide-foreground)] transition-colors hover:bg-[color:var(--ide-overlay-weak)]"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-indigo-500" : "bg-zinc-600"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-[color:var(--ide-overlay-strong)] shadow transition-all",
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
      <span className="text-[color:var(--ide-foreground)]">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="rounded p-1 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)] disabled:opacity-40"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center font-mono text-[color:var(--ide-foreground)]">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="rounded p-1 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)] disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
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
    <div className="absolute top-10 right-0 z-50 w-72 overflow-hidden rounded-xl border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)] shadow-2xl">
      <div className="flex items-center border-b border-[color:var(--ide-border)] px-3 py-2">
        <span className="text-xs font-semibold text-[color:var(--ide-active)]">Settings</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-0.5 text-[color:var(--ide-foreground-muted)] transition-colors hover:text-[color:var(--ide-active)]"
          title="Close settings"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-[color:var(--ide-border)] px-2 py-1.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              tab === id
                ? "bg-[color:var(--ide-overlay-strong)] text-[color:var(--ide-active)]"
                : "text-[color:var(--ide-foreground-muted)] hover:text-[color:var(--ide-active)]"
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
            <p className="px-2 pt-1 text-[11px] leading-snug text-[color:var(--ide-foreground-muted)]">
              The console shows sample and hidden test cases, output and verdicts.
            </p>
          </div>
        )}

        {tab === "editor" && (
          <div className="space-y-0.5">
            <div className="px-2 py-1.5 text-xs">
              <span className="mb-1.5 block text-[color:var(--ide-foreground)]">Editor theme</span>
              <div className="grid grid-cols-2 gap-1">
                {EDITOR_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange?.(t.id)}
                    className={cn(
                      "rounded px-2 py-1 text-left text-xs transition-colors",
                      theme === t.id
                        ? "bg-indigo-500 text-white"
                        : "text-[color:var(--ide-foreground)] hover:bg-[color:var(--ide-overlay-weak)] hover:text-[color:var(--ide-active)]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-2 my-1.5 h-px bg-[color:var(--ide-overlay-strong)]" />
            <Stepper
              label="Font size"
              value={fontSize}
              min={10}
              max={24}
              onChange={onFontSizeChange}
            />
            <div className="flex items-center justify-between px-2 py-1.5 text-xs">
              <span className="text-[color:var(--ide-foreground)]">Tab size</span>
              <div className="flex gap-1">
                {[2, 4, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onTabSizeChange(n)}
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-xs transition-colors",
                      tabSize === n
                        ? "bg-indigo-500 text-white"
                        : "text-[color:var(--ide-foreground-muted)] hover:text-[color:var(--ide-active)]"
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
                <span className="text-[color:var(--ide-foreground-muted)]">{action}</span>
                <kbd className="rounded border border-[color:var(--ide-border)] bg-[color:var(--ide-overlay-weak)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--ide-foreground)]">
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
      <EmptyState
        icon={<ListChecks className="h-8 w-8" />}
        title="No submissions yet"
        subtitle="Write your solution and press Submit."
      />
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--ide-border)] bg-[color:var(--ide-surface)] px-3 py-2.5"
        >
          <div>
            <VerdictBadge verdict={s.status} />
            <p className="mt-1 text-xs text-[color:var(--ide-foreground-muted)]">
              {s.passedCount}/{s.totalCount} test cases passed
            </p>
          </div>
          <div className="text-right text-xs text-[color:var(--ide-foreground-muted)]">
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
