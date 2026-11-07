"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Preview } from "@/components/preview";
import { DifficultyBadge } from "@/components/coding-workspace/badges";
import type { PracticeQuestionView as PracticeQuestionData } from "@/lib/content";

interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

function parseTestCases(raw: string | null): TestCase[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const PracticeQuestionView = ({ question }: { question: PracticeQuestionData }) => {
  const [showSolution, setShowSolution] = useState(false);
  const testCases = parseTestCases(question.testCases);
  const custom = !!question.problemStatement;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              {custom ? (
                <Code2 className="h-5 w-5 text-primary" />
              ) : (
                <ExternalLink className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {question.title}
              </h1>
            </div>
            <DifficultyBadge difficulty={question.difficulty as any} />
          </div>

          {question.tags && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {question.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}

          {!custom && question.url && (
            <div className="mt-4">
              <a
                href={question.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open question on LeetCode
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {question.notes && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Notes
              </h2>
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none rounded-xl bg-muted/50 p-4">
                <Preview value={question.notes} />
              </div>
            </section>
          )}

          {custom && question.problemStatement && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Problem statement
              </h2>
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <Preview value={question.problemStatement} />
              </div>
            </section>
          )}

          {custom && testCases.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Test cases ({testCases.length})
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Input</th>
                      <th className="px-4 py-2 font-medium">Expected output</th>
                      {testCases.some((t) => t.explanation) && (
                        <th className="px-4 py-2 font-medium">Explanation</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.map((tc, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-b-0 align-top"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-pre-wrap">
                          {tc.input}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-pre-wrap text-emerald-600 dark:text-emerald-400">
                          {tc.expectedOutput}
                        </td>
                        {testCases.some((t) => t.explanation) && (
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {tc.explanation ?? ""}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {question.solution && (
            <section>
              <button
                type="button"
                onClick={() => setShowSolution((s) => !s)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                <span className="flex items-center gap-2">
                  {showSolution ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  Solution
                </span>
                {showSolution ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showSolution && (
                <div className="mt-3 rounded-xl border border-border p-4">
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <Preview value={question.solution} />
                  </div>
                </div>
              )}
            </section>
          )}

          {!custom && !question.url && (
            <p className="text-sm text-muted-foreground">
              This practice question has no external link or statement attached yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
