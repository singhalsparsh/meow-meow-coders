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
  EASY: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  MEDIUM: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  HARD: "text-rose-300 bg-rose-500/10 border-rose-500/25",
};

const VERDICT_STYLES: Record<SubmissionVerdict, string> = {
  ACCEPTED: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  WRONG_ANSWER: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  TIME_LIMIT_EXCEEDED: "text-orange-300 bg-orange-500/10 border-orange-500/25",
  COMPILE_ERROR: "text-indigo-300 bg-indigo-500/10 border-indigo-500/25",
  RUNTIME_ERROR: "text-rose-300 bg-rose-500/10 border-rose-500/25",
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
    <span className="inline-flex items-center rounded-full border border-indigo-500/25 bg-indigo-500/20 px-3 py-0.5 text-xs font-medium text-indigo-300">
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
