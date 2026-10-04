"use client";

import {
  CheckCircle2,
  Loader2,
  Play,
  Terminal,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  CaseResult,
  CodingProblemPayload,
  JudgeDoneMessage,
} from "@/lib/coding/types";
import { VerdictBadge } from "./badges";

interface ResultsPanelProps {
  problem: CodingProblemPayload;
  result: JudgeDoneMessage | null;
  error: string | null;
  busy: boolean;
  statusMessage: string | null;
  caseInputs: Record<string, string>;
  onCaseInputChange: (caseId: string, value: string) => void;
  onRunCase: (caseId: string) => void;
  activeCaseId: string | null;
  onActiveCaseChange: (caseId: string) => void;
}

export function ResultsPanel({
  problem,
  result,
  error,
  busy,
  statusMessage,
  caseInputs,
  onCaseInputChange,
  onRunCase,
  activeCaseId,
  onActiveCaseChange,
}: ResultsPanelProps) {
  // Tabs come from the latest result when there is one, otherwise from the
  // problem's public cases so the samples are available before any run.
  const tabs: { id: string; label: string; hidden: boolean }[] = result
    ? result.results.map((r, i) => ({
        id: r.id,
        label: r.hidden ? `Hidden ${result.results.slice(0, i + 1).filter((x) => x.hidden).length}` : `Case ${result.results.slice(0, i + 1).filter((x) => !x.hidden).length}`,
        hidden: r.hidden,
      }))
    : problem.testCases.map((tc, i) => ({
        id: tc.id,
        label: `Case ${i + 1}`,
        hidden: false,
      }));

  const activeId =
    activeCaseId && tabs.some((t) => t.id === activeId2(activeCaseId, tabs))
      ? activeCaseId
      : tabs[0]?.id ?? null;

  const activeResult: CaseResult | undefined = result?.results.find(
    (r) => r.id === activeId
  );

  const activeCase = problem.testCases.find((tc) => tc.id === activeId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header / verdict summary */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Console</span>
        </div>
        {result && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {result.passedCount}/{result.totalCount} passed
            </span>
            <VerdictBadge verdict={result.verdict} />
            {result.runtimeMs != null && (
              <span className="text-xs text-muted-foreground">
                {result.runtimeMs} ms
              </span>
            )}
          </div>
        )}
      </div>

      {busy ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm">{statusMessage ?? "Working…"}</p>
        </div>
      ) : error ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
              Execution failed
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-800 dark:text-rose-300">
              {error}
            </pre>
          </div>
        </div>
      ) : (
        <>
          {/* Case tabs */}
          {tabs.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700 px-2 py-1">
              {tabs.map((tab) => {
                const tabResult = result?.results.find((r) => r.id === tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => onActiveCaseChange(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      activeId === tab.id
                        ? "bg-slate-100 dark:bg-slate-800 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tabResult &&
                      (tabResult.passed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-rose-500" />
                      ))}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {!result ? (
              <EmptyConsole problem={problem} />
            ) : result.compileError ? (
              <CompileError output={result.compileError} />
            ) : !activeResult ? (
              <p className="text-sm text-muted-foreground">No output.</p>
            ) : (
              <CaseDetail
                result={activeResult}
                input={caseInputs[activeResult.id] ?? ""}
                editable={!activeResult.hidden}
                onInputChange={(value) =>
                  onCaseInputChange(activeResult.id, value)
                }
                onRun={() => onRunCase(activeResult.id)}
                explanation={activeCase?.explanation ?? null}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Keeps the active tab valid when switching between run and submit results.
function activeId2(current: string, tabs: { id: string }[]) {
  return tabs.some((t) => t.id === current) ? current : tabs[0]?.id ?? "";
}

function EmptyConsole({ problem }: { problem: CodingProblemPayload }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
      <Terminal className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        Press <span className="font-medium text-foreground">Run</span> to test
        your code against the sample cases.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Time limit: {problem.timeLimitMs} ms per case
      </p>
    </div>
  );
}

function CompileError({ output }: { output: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-rose-500" />
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
          Compilation error
        </span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">
        {output}
      </pre>
    </div>
  );
}

function CaseDetail({
  result,
  input,
  editable,
  onInputChange,
  onRun,
  explanation,
}: {
  result: CaseResult;
  input: string;
  editable: boolean;
  onInputChange: (value: string) => void;
  onRun: () => void;
  explanation: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={result.verdict} />
          {result.timedOut && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              exceeded {result.runtimeMs} ms
            </span>
          )}
          {!result.timedOut && (
            <span className="text-xs text-muted-foreground">
              {result.runtimeMs} ms
            </span>
          )}
        </div>
        {editable && (
          <Button
            type="button"
            onClick={onRun}
            variant="outline"
            size="sm"
            className="h-7"
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        )}
      </div>

      {result.hidden ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This is a hidden grading case — its input and expected output are
            not shown.
          </p>
          <p className="mt-1 text-xs font-medium">
            {result.passed ? "Passed." : "Did not pass."}
          </p>
        </div>
      ) : (
        <>
          <Field label="Input (editable)">
            {editable ? (
              <Textarea
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                className="min-h-[64px] font-mono text-xs"
                spellCheck={false}
              />
            ) : (
              <Pre>{result.input ?? ""}</Pre>
            )}
          </Field>

          <Field label="Expected Output">
            <Pre>{result.expectedOutput ?? ""}</Pre>
          </Field>

          <Field label="Your Output">
            <Pre>{result.stdout || "(no output)"}</Pre>
          </Field>

          {result.stderr && (
            <Field label="stderr">
              <Pre className="text-rose-300">{result.stderr}</Pre>
            </Field>
          )}

          {result.diff && (
            <Field label="Diff (expected vs yours)">
              <Pre>{result.diff}</Pre>
            </Field>
          )}

          {explanation && !result.passed && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {explanation}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pre({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 p-2.5 font-mono text-xs leading-relaxed text-slate-200",
        className
      )}
    >
      {children}
    </pre>
  );
}
