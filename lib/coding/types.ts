// Shared types for the in-browser DSA coding environment.
//
// These mirror the Prisma enums in schema.prisma but are declared here as plain
// string unions so they can be imported by the Web Worker and client components
// without pulling @prisma/client (and its engine binary) into the worker bundle.

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type DsaTopic =
  | "ARRAYS"
  | "VECTORS"
  | "STRINGS"
  | "LINKED_LISTS"
  | "STACKS"
  | "QUEUES"
  | "TREES"
  | "GRAPHS"
  | "DYNAMIC_PROGRAMMING"
  | "SORTING_SEARCHING"
  | "FUNDAMENTAL"
  | "OTHER";

export type SubmissionVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const TOPIC_LABEL: Record<DsaTopic, string> = {
  ARRAYS: "Arrays",
  VECTORS: "Vectors",
  STRINGS: "Strings",
  LINKED_LISTS: "Linked Lists",
  STACKS: "Stacks",
  QUEUES: "Queues",
  TREES: "Trees",
  GRAPHS: "Graphs",
  DYNAMIC_PROGRAMMING: "Dynamic Programming",
  SORTING_SEARCHING: "Sorting & Searching",
  FUNDAMENTAL: "Fundamentals",
  OTHER: "Other",
};

export const ALL_TOPICS: DsaTopic[] = [
  "ARRAYS",
  "VECTORS",
  "STRINGS",
  "LINKED_LISTS",
  "STACKS",
  "QUEUES",
  "TREES",
  "GRAPHS",
  "DYNAMIC_PROGRAMMING",
  "SORTING_SEARCHING",
  "FUNDAMENTAL",
  "OTHER",
];

export const ALL_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export const VERDICT_LABEL: Record<SubmissionVerdict, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  COMPILE_ERROR: "Compile Error",
  RUNTIME_ERROR: "Runtime Error",
};

// ---------------------------------------------------------------------------
// Problem payload returned by the API to the student workspace.
// ---------------------------------------------------------------------------

export interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  explanation: string | null;
  isHidden: boolean;
  order: number;
}

export interface CodingProblemPayload {
  id: string;
  chapterId: string;
  title: string;
  difficulty: Difficulty;
  topic: DsaTopic;
  description: string;
  constraints: string | null;
  starterCode: string;
  driverCode: string | null;
  timeLimitMs: number;
  testCases: TestCasePayload[];
}

export interface ProblemSubmissionPayload {
  id: string;
  status: SubmissionVerdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Web Worker protocol (workers/cpp-judge.worker.ts <-> useCppJudge hook).
// ---------------------------------------------------------------------------

export interface JudgeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export type JudgeMode = "run" | "submit";

export interface JudgeRequest {
  id: string;
  mode: JudgeMode;
  /** The student's solution, exactly as typed in Monaco. */
  source: string;
  /** Hidden wrapper/driver code from the problem; may contain a `{{USER_CODE}}` injection tag. */
  driverCode: string | null;
  /** Cases to execute. `run` mode should only receive public cases. */
  testCases: JudgeTestCase[];
  /** Per-case hard time limit in milliseconds. */
  timeLimitMs: number;
}

export type JudgeStage = "loading" | "compiling" | "running";

export interface JudgeProgressMessage {
  type: "progress";
  id: string;
  stage: JudgeStage;
  /** Asset download progress, 0..1, only meaningful during `loading`. */
  progress?: number;
  message?: string;
}

export interface CaseResult {
  id: string;
  hidden: boolean;
  passed: boolean;
  verdict: SubmissionVerdict;
  /**
   * Exact I/O for public cases. For hidden cases in `submit` mode these are
   * deliberately obscured so only the pass/fail signal leaks.
   */
  input: string | null;
  expectedOutput: string | null;
  stdout: string | null;
  stderr: string | null;
  diff: string | null;
  runtimeMs: number;
  timedOut: boolean;
}

export interface JudgeDoneMessage {
  type: "done";
  id: string;
  mode: JudgeMode;
  verdict: SubmissionVerdict;
  /** Compiler diagnostics with line numbers remapped onto the student's code, or null. */
  compileError: string | null;
  compileMs: number;
  results: CaseResult[];
  passedCount: number;
  totalCount: number;
  /** Slowest case runtime; null when nothing ran. */
  runtimeMs: number | null;
}

export interface JudgeErrorMessage {
  type: "error";
  id: string;
  message: string;
}

export type JudgeMessage =
  | JudgeProgressMessage
  | JudgeDoneMessage
  | JudgeErrorMessage;
