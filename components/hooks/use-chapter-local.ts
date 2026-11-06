"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side, per-chapter persistence backed by localStorage.
 *
 * The user explicitly asked not to use server routes (e.g. `/api/pdf-notes`,
 * which returned 401) for these small teaching-authoring features. Everything
 * here lives in the browser: keyed by chapterId, survives reloads, and never
 * touches the server.
 */

const KEY_PREFIX = "coursecrafter:chapter:";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useChapterLocal<T>(chapterId: string, fallback: T) {
  const storageKey = `${KEY_PREFIX}${chapterId}`;
  const [value, setValue] = useState<T>(() =>
    readJSON<T>(storageKey, fallback)
  );

  useEffect(() => {
    // Keep state in sync when the chapter changes on the same page.
    setValue(readJSON<T>(storageKey, fallback));
  }, [storageKey, fallback]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function"
            ? (next as (prev: T) => T)(prev)
            : next;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          /* storage full / unavailable — best effort */
        }
        return resolved;
      });
    },
    [storageKey]
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setValue(fallback);
  }, [storageKey, fallback]);

  return { value, set, remove };
}
