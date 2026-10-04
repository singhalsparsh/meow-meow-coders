import { cn } from "@/lib/utils";
import {
  DIFFICULTY_LABEL,
  TOPIC_LABEL,
  VERDICT_LABEL,
  type Difficulty,
  type DsaTopic,
  type SubmissionVerdict,
} from "@/lib/coding/types";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
  MEDIUM:
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
  HARD: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
};

const VERDICT_STYLES: Record<SubmissionVerdict, string> = {
  ACCEPTED:
    "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
  WRONG_ANSWER:
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25",
  TIME_LIMIT_EXCEEDED:
    "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/25",
  COMPILE_ERROR:
    "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25",
  RUNTIME_ERROR:
    "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        DIFFICULTY_STYLES[difficulty]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function TopicBadge({ topic }: { topic: DsaTopic }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      {TOPIC_LABEL[topic]}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: SubmissionVerdict }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        VERDICT_STYLES[verdict]
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
