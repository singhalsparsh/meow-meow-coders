"use client";

import { ExternalLink, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeetCodeQuestion {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  tags: string | null;
  notes: string | null;
  position: number;
}

interface LeetcodeQuestionsProps {
  questions: LeetCodeQuestion[];
}

const difficultyConfig: Record<string, { color: string; dot: string }> = {
  Easy: {
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Medium: {
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Hard: {
    color: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export const LeetcodeQuestions = ({ questions }: LeetcodeQuestionsProps) => {
  if (!questions.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Practice Questions ({questions.length})
        </h3>
      </div>
      {questions.map((q, i) => {
        const diff = difficultyConfig[q.difficulty] || difficultyConfig.Medium;
        return (
          <a
            key={q.id}
            href={q.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl",
              "glass-card hover:shadow-md transition-all duration-200",
              "group hover:scale-[1.01]"
            )}
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-muted-foreground flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{q.title}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              {q.tags && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {q.tags}
                </p>
              )}
              {q.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {q.notes}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn("h-2 w-2 rounded-full", diff.dot)} />
              <span className={cn("text-xs font-medium", diff.color)}>
                {q.difficulty}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
};
