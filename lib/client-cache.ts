/**
 * Client-side localStorage cache.
 *
 * Stores JSON payloads on the browser so repeat visits / refreshes can restore
 * content (course lesson tree, per-user progress) instantly instead of waiting
 * on a server round-trip. This complements the server-side static content:
 * content is already shipped as checked-in JSON, and this layer caches it in
 * the browser so navigating back to a course or refreshing doesn't re-fetch.
 *
 * All reads are best-effort: any failure (private mode, quota, corrupt JSON,
 * SSR) resolves to a cache miss so we never break the page.
 */

export const CACHE_VERSION = 1;

/** Full cache key for a namespace + optional id. Bump CACHE_VERSION to bust all. */
export function cacheKey(namespace: string, id?: string): string {
  return `meow:${CACHE_VERSION}:${namespace}${id ? `:${id}` : ""}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface Envelope<T> {
  v: T;
  __t?: number; // expiry timestamp, when a TTL was requested
}

/** Read a cached value; returns null on miss, expiry, or any error. */
export function readCache<T>(namespace: string, id?: string): T | null {
  const s = storage();
  if (!s) return null;
  const key = cacheKey(namespace, id);
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed && typeof parsed.__t === "number" && Date.now() > parsed.__t) {
      s.removeItem(key);
      return null;
    }
    return parsed?.v ?? null;
  } catch {
    return null;
  }
}

/** Write a value. `ttlMs` optionally expires the entry. Best-effort. */
export function writeCache<T>(
  namespace: string,
  value: T,
  id?: string,
  ttlMs?: number,
): void {
  const s = storage();
  if (!s) return;
  try {
    const envelope: Envelope<T> = { v: value };
    if (ttlMs && ttlMs > 0) envelope.__t = Date.now() + ttlMs;
    s.setItem(cacheKey(namespace, id), JSON.stringify(envelope));
  } catch {
    // Quota / private mode — the cache is best-effort.
  }
}

/** Delete a cached entry (or a whole namespace by omitting id). */
export function delCache(namespace: string, id?: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(cacheKey(namespace, id));
  } catch {
    // ignore
  }
}
