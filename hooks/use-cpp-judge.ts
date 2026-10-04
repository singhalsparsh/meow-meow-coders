"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  JudgeDoneMessage,
  JudgeMessage,
  JudgeRequest,
  JudgeStage,
} from "@/lib/coding/types";

// A first run has to download (~29 MB) and compile; subsequent runs only
// compile. The watchdog is a liveness check, not a time limit: every progress
// message extends it, so a long-but-healthy run is never killed.
const WATCHDOG_SLACK_MS = 25_000;
const COMPILE_BUDGET_MS = 90_000;
const WATCHDOG_POLL_MS = 1_000;

type Status = "idle" | JudgeStage;

export interface UseCppJudge {
  status: Status;
  progress: number | null;
  statusMessage: string | null;
  result: JudgeDoneMessage | null;
  error: string | null;
  /** Execute a request and resolve to the final verdict message. */
  execute: (request: Omit<JudgeRequest, "id">) => Promise<JudgeDoneMessage>;
  /** Tear down the worker; the next execute() spins up a fresh one. */
  reset: () => void;
}

export function useCppJudge(): UseCppJudge {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<
    Map<string, { resolve: (m: JudgeDoneMessage) => void; reject: (e: Error) => void }>
  >(new Map());
  const deadlineRef = useRef<number>(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idCounterRef = useRef(0);

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [result, setResult] = useState<JudgeDoneMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data as JudgeMessage;
    if (!message || typeof message.id !== "string") return;

    if (message.type === "progress") {
      // Any progress proves the worker is alive.
      deadlineRef.current = Math.max(
        deadlineRef.current,
        Date.now() + WATCHDOG_SLACK_MS
      );
      setStatus(message.stage);
      setProgress(typeof message.progress === "number" ? message.progress : null);
      setStatusMessage(message.message ?? null);
      return;
    }

    const pending = pendingRef.current.get(message.id);
    pendingRef.current.delete(message.id);

    if (message.type === "done") {
      setStatus("idle");
      setProgress(null);
      setStatusMessage(null);
      setResult(message);
      setError(null);
      pending?.resolve(message);
      return;
    }

    // type === "error"
    setStatus("idle");
    setProgress(null);
    setStatusMessage(null);
    setError(message.message);
    pending?.reject(new Error(message.message));
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL("../workers/cpp-judge.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", (event) => {
      setError(event.message || "The judge worker crashed.");
      setStatus("idle");
      setProgress(null);
      for (const [id, pending] of pendingRef.current.entries()) {
        pending.reject(new Error(event.message || "The judge worker crashed."));
        pendingRef.current.delete(id);
      }
    });
    workerRef.current = worker;
    return worker;
  }, [handleMessage]);

  const execute = useCallback(
    (request: Omit<JudgeRequest, "id">) => {
      idCounterRef.current += 1;
      const id = `${Date.now()}-${idCounterRef.current}`;

      return new Promise<JudgeDoneMessage>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        setError(null);
        setResult(null);
        setStatus("loading");
        setStatusMessage("Loading C++ toolchain…");
        setProgress(null);

        // Compile budget first, then per-case time limits.
        deadlineRef.current =
          Date.now() + COMPILE_BUDGET_MS + request.timeLimitMs * Math.max(1, request.testCases.length);

        const worker = ensureWorker();
        worker.postMessage({ ...request, id });
      });
    },
    [ensureWorker]
  );

  // Watchdog: a hung worker (e.g. an infinite loop in student code blocks the
  // WASM execution synchronously) is terminated and reported as a timeout.
  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      if (!pendingRef.current.size) return;
      if (Date.now() < deadlineRef.current) return;

      const worker = workerRef.current;
      if (worker) {
        worker.terminate();
        workerRef.current = null;
      }

      const message =
        "Time limit exceeded — the run took too long and was aborted. Check for infinite loops or very slow code.";

      for (const [, pending] of pendingRef.current.entries()) {
        pending.reject(new Error(message));
      }
      pendingRef.current.clear();

      setError(message);
      setStatus("idle");
      setProgress(null);
      setStatusMessage(null);
    }, WATCHDOG_POLL_MS);

    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, []);

  // Clean up the worker on unmount.
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRef.current.clear();
    };
  }, []);

  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingRef.current.clear();
    setStatus("idle");
    setProgress(null);
    setStatusMessage(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    statusMessage,
    result,
    error,
    execute,
    reset,
  };
}
