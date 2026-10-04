// In-browser C++ judge.
//
// Compiles and runs student solutions entirely inside this Web Worker using a
// WebAssembly build of Clang/LLD (Clang 22 via @live-codes/clang-wasm), so no
// code ever leaves the browser and there is zero server-side execution cost.
// The runtime blocks whichever thread it runs on, which is exactly why it lives
// in a worker: the UI thread stays free.
//
// Protocol: see lib/coding/types.ts (JudgeRequest / JudgeMessage).

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createToolchain, compilerDiagnostics } from "@live-codes/clang-wasm/toolchain";

import type {
  CaseResult,
  JudgeDoneMessage,
  JudgeMessage,
  JudgeProgressMessage,
  JudgeRequest,
  SubmissionVerdict,
} from "@/lib/coding/types";

// The toolchain assets are staged under /public/wasm/clang and served from the
// app's own origin, so the runtime is self-hosted and CDN-independent.
const TOOLCHAIN_BASE_URL = "/wasm/clang/";

// Where the student's code is injected into the teacher's driver/wrapper. Any of
// these may appear in `driverCode`; the first match wins.
const USER_CODE_MARKERS = [
  "// {{USER_CODE}}",
  "{{USER_CODE}}",
  "// USER_CODE",
  "/* USER_CODE */",
];

// One toolchain per worker. Building it costs a ~29 MB asset download, so it is
// cached for the lifetime of the worker and reused across runs.
let toolchainPromise: Promise<any> | null = null;

function getToolchain() {
  if (!toolchainPromise) {
    toolchainPromise = createToolchain({
      baseUrl: TOOLCHAIN_BASE_URL,
      onProgress: (value: number) => {
        post({
          type: "progress",
          id: pendingId,
          stage: "loading",
          progress: value,
          message: "Loading C++ toolchain…",
        });
      },
    });
  }
  return toolchainPromise;
}

// The request id currently being served; used to tag progress messages.
let pendingId = "unknown";

function post(message: JudgeMessage) {
  (self as unknown as { postMessage: (m: JudgeMessage) => void }).postMessage(message);
}

function postProgress(stage: JudgeProgressMessage["stage"], message?: string) {
  post({ type: "progress", id: pendingId, stage, message });
}

// ---------------------------------------------------------------------------
// Source assembly + diagnostic line remapping.
// ---------------------------------------------------------------------------

interface AssembledSource {
  source: string;
  /** 1-based line in the assembled file where the student's code begins. */
  userCodeStartLine: number;
}

function assemble(userCode: string, driverCode: string | null): AssembledSource {
  if (!driverCode) {
    return { source: userCode, userCodeStartLine: 1 };
  }

  for (const marker of USER_CODE_MARKERS) {
    const index = driverCode.indexOf(marker);
    if (index !== -1) {
      const prefix = driverCode.slice(0, index);
      const suffix = driverCode.slice(index + marker.length);
      // `prefix` ends with the marker's preceding newline, so the number of
      // lines it occupies is the line the student code starts on.
      const userCodeStartLine = prefix.split(/\r?\n/).length;
      return {
        source: `${prefix}${userCode}${suffix}`,
        userCodeStartLine,
      };
    }
  }

  // No explicit marker: put the student's definitions first and let the driver
  // (which declares `main` and the harness) follow them.
  return {
    source: `${userCode}\n\n${driverCode}`,
    userCodeStartLine: 1,
  };
}

const DIAGNOSTIC_LINE = /^(.*?:)(\d+)(:.*)$/;

// Clang reports diagnostics against the assembled file, where the student's code
// is offset by the driver prefix. Shift line numbers back onto their code so a
// click/error readout points at what they actually wrote.
function remapDiagnostics(diagnostics: string[], userCodeStartLine: number): string[] {
  if (userCodeStartLine <= 1) return diagnostics;

  return diagnostics.map((line) => {
    const match = DIAGNOSTIC_LINE.exec(line);
    if (!match) return line;
    const lineNo = Number(match[2]);
    const shifted = lineNo - (userCodeStartLine - 1);
    if (shifted < 1) return line; // the error is in the driver, not the student code
    return `${match[1]}${shifted}${match[3]}`;
  });
}

// ---------------------------------------------------------------------------
// Output comparison.
// ---------------------------------------------------------------------------

// Trim trailing whitespace per line, collapse CRLF and drop trailing blank
// lines so formatting differences never cause a false Wrong Answer.
function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "")
    .trim();
}

// Small LCS-based line diff for failed public test cases.
function diffLines(expected: string[], actual: string[]): string {
  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        expected[i] === actual[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === actual[j]) {
      out.push(`  ${expected[i]}`);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`- ${expected[i]}`);
      i++;
    } else {
      out.push(`+ ${actual[j]}`);
      j++;
    }
  }
  while (i < n) out.push(`- ${expected[i++]}`);
  while (j < m) out.push(`+ ${actual[j++]}`);

  return out.join("\n");
}

// stdin is handed to the WASI host as a chunked reader: the whole input is
// offered once, then EOF. Mirrors @live-codes/clang-wasm's own makeStdin.
function makeStdin(input: string): () => string | null {
  if (!input) return () => null;
  let sent = false;
  return () => {
    if (sent) return null;
    sent = true;
    return input;
  };
}

// ---------------------------------------------------------------------------
// Main handler.
// ---------------------------------------------------------------------------

async function handleRequest(request: JudgeRequest) {
  pendingId = request.id;
  const { mode, source, driverCode, testCases, timeLimitMs } = request;

  // Nothing to judge: a compiled program with no cases is vacuously accepted.
  const empty: JudgeDoneMessage = {
    type: "done",
    id: request.id,
    mode,
    verdict: "ACCEPTED",
    compileError: null,
    compileMs: 0,
    results: [],
    passedCount: 0,
    totalCount: 0,
    runtimeMs: null,
  };

  try {
    postProgress("loading", "Loading C++ toolchain…");
    const toolchain = await getToolchain();

    const assembled = assemble(source, driverCode);

    postProgress("compiling", "Compiling…");
    const compileStarted = performance.now();

    const compiled: { result: any; raw: string; error: Error | null } =
      await toolchain.captureCompilerOutput(() =>
        toolchain.runtime.compileArtifact(assembled.source, {
          language: "CPP",
          fileName: "solution.cpp",
          // Keep the student code reading like a driver-invoked compile.
          compileArgs: ["-std=gnu++20", "-O2", "-ferror-limit=20"],
        })
      );

    const compileMs = Math.round(performance.now() - compileStarted);

    if (compiled.error || !compiled.result) {
      const diagnostics = remapDiagnostics(
        compilerDiagnostics(compiled.raw),
        assembled.userCodeStartLine
      );
      const message = diagnostics.length
        ? diagnostics.join("\n")
        : String((compiled.error as Error | null)?.message ?? "Compilation failed");

      post({
        type: "done",
        id: request.id,
        mode,
        verdict: "COMPILE_ERROR",
        compileError: message,
        compileMs,
        results: [],
        passedCount: 0,
        totalCount: testCases.length,
        runtimeMs: null,
      });
      return;
    }

    if (!testCases.length) {
      empty.compileMs = compileMs;
      post(empty);
      return;
    }

    const artifact = compiled.result;
    const results: CaseResult[] = [];

    for (const testCase of testCases) {
      postProgress("running", `Running test ${results.length + 1} of ${testCases.length}…`);

      const started = performance.now();
      let stdout = "";
      let stderr = "";
      let exitCode: number | null = null;
      let crashed = false;

      try {
        const run = await toolchain.execute(artifact, {
          args: [],
          stdin: makeStdin(testCase.input),
        });
        stdout = run.stdout ?? "";
        stderr = run.stderr ?? "";
        exitCode = run.exitCode;
      } catch {
        // A trap (segfault, abort, stack overflow) surfaces as an exception.
        crashed = true;
      }

      const runtimeMs = Math.round(performance.now() - started);
      const timedOut = runtimeMs > timeLimitMs;

      let verdict: SubmissionVerdict;
      if (timedOut) {
        verdict = "TIME_LIMIT_EXCEEDED";
      } else if (crashed || exitCode === null || exitCode !== 0) {
        verdict = "RUNTIME_ERROR";
      } else if (normalizeOutput(stdout) === normalizeOutput(testCase.expectedOutput)) {
        verdict = "ACCEPTED";
      } else {
        verdict = "WRONG_ANSWER";
      }

      const passed = verdict === "ACCEPTED";

      // Visibility: hidden cases only ever reveal pass/fail + timing.
      const obscure =
        mode === "submit" && testCase.isHidden ? true : false;

      results.push({
        id: testCase.id,
        hidden: testCase.isHidden,
        passed,
        verdict,
        input: obscure ? null : testCase.input,
        expectedOutput: obscure ? null : testCase.expectedOutput,
        stdout: obscure ? null : stdout,
        stderr: obscure ? null : stderr,
        diff:
          obscure || passed || verdict !== "WRONG_ANSWER"
            ? null
            : diffLines(
                normalizeOutput(testCase.expectedOutput).split("\n"),
                normalizeOutput(stdout).split("\n")
              ),
        runtimeMs,
        timedOut,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    // Overall verdict follows the first failing case, matching online judges.
    const firstFailure = results.find((r) => !r.passed);
    const verdict: SubmissionVerdict = firstFailure ? firstFailure.verdict : "ACCEPTED";
    const runtimeMs = Math.max(...results.map((r) => r.runtimeMs));

    post({
      type: "done",
      id: request.id,
      mode,
      verdict,
      compileError: null,
      compileMs,
      results,
      passedCount,
      totalCount: results.length,
      runtimeMs,
    });
  } catch (error) {
    post({
      type: "error",
      id: request.id,
      message:
        error instanceof Error
          ? error.message
          : "The judge worker hit an unexpected error.",
    });
  }
}

self.addEventListener("message", (event: MessageEvent) => {
  const request = event.data as JudgeRequest;
  if (!request || typeof request.id !== "string") return;
  void handleRequest(request);
});
