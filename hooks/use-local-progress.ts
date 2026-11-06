"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readCache, writeCache, delCache } from "@/lib/client-cache";

const PROGRESS_NS = "progress";

/**
 * Per-user chapter-completion state for a course, persisted to the browser.
 *
 * - Hydrates instantly from localStorage on repeat visits (no waiting on the
 *   server), falling back to the server-provided `seed` on first load.
 * - `needsSeed` is true on first load (cold cache) so callers can hydrate from
 *   the server via the /api/my-progress endpoint; once seeded, repeat visits
 *   skip the server request entirely.
 * - `setChapterCompleted` / `setProgress` update React state and write through
 *   to localStorage immediately, so the sidebar reflects a completion before
 *   the server refresh round-trip resolves.
 *
 * The server remains the source of truth (progress is written to the DB via
 * the progress API); this cache keeps the UI instant and consistent across
 * refreshes/navigations for the same browser, and avoids re-querying the DB on
 * every visit.
 */
export function useLocalProgress(
  courseId: string,
  userId: string,
  seed?: Record<string, boolean>,
) {
  const cacheKeyParts = `${userId}:${courseId}`;

  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    if (!userId || !courseId) return seed ?? {};
    const cached = readCache<Record<string, boolean>>(PROGRESS_NS, cacheKeyParts);
    return cached ?? seed ?? {};
  });

  // Record whether we initialized from the cache (vs. cold). Computed once.
  const hadCacheRef = useRef<boolean | null>(null);
  if (hadCacheRef.current === null) {
    hadCacheRef.current =
      !!userId && !!courseId
        ? readCache<Record<string, boolean>>(PROGRESS_NS, cacheKeyParts) !== null
        : false;
  }

  // Persist on every change (and initial hydrate).
  useEffect(() => {
    if (!userId || !courseId) return;
    writeCache(PROGRESS_NS, completed, cacheKeyParts);
  }, [completed, courseId, userId, cacheKeyParts]);

  const isCompleted = useCallback(
    (chapterId: string) => !!completed[chapterId],
    [completed],
  );

  const setChapterCompleted = useCallback((chapterId: string, done: boolean) => {
    setCompleted((prev) => ({ ...prev, [chapterId]: done }));
  }, []);

  const setProgress = useCallback((next: Record<string, boolean>) => {
    setCompleted(next);
  }, []);

  const clearProgress = useCallback(() => {
    delCache(PROGRESS_NS, cacheKeyParts);
    setCompleted({});
  }, [cacheKeyParts]);

  const completedCount = useMemo(
    () => Object.values(completed).filter(Boolean).length,
    [completed],
  );

  return {
    completed,
    completedCount,
    isCompleted,
    setChapterCompleted,
    setProgress,
    clearProgress,
    needsSeed: !!userId && !!courseId && !hadCacheRef.current,
  };
}
