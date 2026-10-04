"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, History, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  CodingProblemPayload,
  ProblemSubmissionPayload,
} from "@/lib/coding/types";
import { VerdictBadge } from "./badges";

interface ProblemPanelProps {
  problem: CodingProblemPayload;
  submissions: ProblemSubmissionPayload[];
  activeTab: "description" | "submissions";
  onTabChange: (tab: "description" | "submissions") => void;
}

export function ProblemPanel({
  problem,
  submissions,
  activeTab,
  onTabChange,
}: ProblemPanelProps) {
  const publicCases = problem.testCases;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 px-2 pt-1">
        <TabButton
          active={activeTab === "description"}
          onClick={() => onTabChange("description")}
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Description"
        />
        <TabButton
          active={activeTab === "submissions"}
          onClick={() => onTabChange("submissions")}
          icon={<History className="h-3.5 w-3.5" />}
          label="Submissions"
          count={submissions.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "description" ? (
          <DescriptionTab problem={problem} publicCases={publicCases} />
        ) : (
          <SubmissionsTab submissions={submissions} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-sky-500 text-sky-600 dark:text-sky-400"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 text-[10px] font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}

function DescriptionTab({
  problem,
  publicCases,
}: {
  problem: CodingProblemPayload;
  publicCases: CodingProblemPayload["testCases"];
}) {
  return (
    <div className="space-y-5">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {problem.description || "No description provided."}
        </ReactMarkdown>
      </div>

      {problem.constraints && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Constraints
          </h4>
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {problem.constraints}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {publicCases.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Examples
          </h4>
          <div className="space-y-3">
            {publicCases.map((tc, index) => (
              <div
                key={tc.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold">Example {index + 1}</span>
                  {tc.isHidden && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      hidden
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div>
                    <span className="font-sans font-medium text-sky-600 dark:text-sky-400">
                      Input:{" "}
                    </span>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md bg-white dark:bg-slate-950/60 p-2">
                      {tc.input || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <span className="font-sans font-medium text-emerald-600 dark:text-emerald-400">
                      Output:{" "}
                    </span>
                    <pre className="mt-0.5 whitespace-pre-wrap rounded-md bg-white dark:bg-slate-950/60 p-2">
                      {tc.expectedOutput || "(empty)"}
                    </pre>
                  </div>
                </div>
                {tc.explanation && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Explanation:{" "}
                    </span>
                    {tc.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionsTab({
  submissions,
}: {
  submissions: ProblemSubmissionPayload[];
}) {
  if (!submissions.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
        <History className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No submissions yet.
          <br />
          Your attempts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 p-3"
        >
          <div className="flex items-center gap-3">
            <VerdictBadge verdict={submission.status} />
            <div>
              <p className="text-xs font-medium">
                {submission.passedCount} / {submission.totalCount} test cases
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {submission.runtimeMs != null
                  ? `${submission.runtimeMs} ms`
                  : "—"}
                {" · "}
                {formatDate(submission.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
