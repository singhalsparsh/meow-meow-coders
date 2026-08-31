"use client";

import { useState } from "react";
import { ExternalLink, Code2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

interface LeetCodeQuestion {
  id: string;
  title: string;
  url: string | null;
  difficulty: string;
  tags: string | null;
  notes: string | null;
  position: number;
  problemStatement: string | null;
  testCases: string | null;
  solution: string | null;
}

interface LeetcodeQuestionsProps {
  questions: LeetCodeQuestion[];
}

const difficultyConfig: Record<string, { color: string; dot: string; bg: string }> = {
  Easy: { color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  Medium: { color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  Hard: { color: "text-red-600 dark:text-red-400", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function isCustom(q: LeetCodeQuestion) {
  return !!q.problemStatement;
}

export const LeetcodeQuestions = ({ questions }: LeetcodeQuestionsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSolutionId, setShowSolutionId] = useState<string | null>(null);

  if (!questions.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Practice Questions ({questions.length})
        </h3>
      </div>
      {questions.map((q, i) => {
        const custom = isCustom(q);
        const isExpanded = expandedId === q.id;
        const showSolution = showSolutionId === q.id;
        const diff = difficultyConfig[q.difficulty] || difficultyConfig.Medium;

        let parsedTestCases: TestCase[] = [];
        if (custom && q.testCases) {
          try { parsedTestCases = JSON.parse(q.testCases); } catch {}
        }

        return (
          <div key={q.id} className={cn("glass-card rounded-2xl overflow-hidden transition-all duration-200", isExpanded && "ring-1 ring-slate-200 dark:ring-slate-700")}>
            {/* Header */}
            <button
              onClick={() => {
                if (custom) setExpandedId(isExpanded ? null : q.id);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors",
                custom ? "hover:bg-white/30 dark:hover:bg-white/5 cursor-pointer" : "cursor-default"
              )}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-muted-foreground flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {custom ? (
                    <span className="font-medium text-sm">{q.title}</span>
                  ) : (
                    <a href={q.url!} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate flex items-center gap-1.5 no-animate">
                      {q.title}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  )}
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", diff.bg, diff.color)}>
                    {q.difficulty}
                  </span>
                  {custom ? (
                    <span className="text-xs text-muted-foreground">{parsedTestCases.length} test case{parsedTestCases.length !== 1 ? "s" : ""}</span>
                  ) : q.tags ? (
                    <span className="text-xs text-muted-foreground truncate">{q.tags}</span>
                  ) : null}
                </div>
                {!custom && q.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic truncate">{q.notes}</p>
                )}
              </div>
              {custom && (
                isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {/* Expanded custom question */}
            {custom && isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-200/50 dark:border-slate-700/50">
                {/* Problem Statement */}
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Problem Statement</h4>
                  <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{q.problemStatement}</p>
                  </div>
                </div>

                {/* Test Cases */}
                {parsedTestCases.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Test Cases</h4>
                    <div className="space-y-2">
                      {parsedTestCases.map((tc, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Case {idx + 1}</span>
                            <CopyButton text={`Input: ${tc.input}\nExpected: ${tc.expectedOutput}`} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <span className="text-xs font-medium text-sky-600 dark:text-sky-400 w-16 flex-shrink-0">Input:</span>
                              <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex-1">{tc.input}</code>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 w-16 flex-shrink-0">Output:</span>
                              <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex-1">{tc.expectedOutput}</code>
                            </div>
                            {tc.explanation && (
                              <div className="flex gap-2">
                                <span className="text-xs font-medium text-muted-foreground w-16 flex-shrink-0">Note:</span>
                                <span className="text-xs text-muted-foreground italic">{tc.explanation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">Copy the input above and test it in your IDE</p>
                  </div>
                )}

                {/* Solution */}
                {q.solution && (
                  <div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowSolutionId(showSolution ? null : q.id)}>
                      {showSolution ? "Hide Solution" : "Show Solution"}
                    </Button>
                    {showSolution && (
                      <div className="mt-2 p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Solution</span>
                          <CopyButton text={q.solution!} />
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">{q.solution}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
