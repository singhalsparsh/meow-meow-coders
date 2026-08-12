import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { getMuxPlaybackUrl, getVideoUrlInfo, isHlsUrl } from "@/lib/video";

// Opaque, signed video proxy URLs.
//
// The client never sees the CDN URL directly: server components turn every
// playable stream into `/api/video-proxy?t=<token>`, where the token is an
// HMAC-signed, expiring blob that only this server can open. Media fetches
// then all hit our own origin, so the upstream host does not show up in the
// network tab and one-click video downloader extensions that scan for media
// URLs find nothing to grab.
//
// This is deterrence, not DRM: a determined person with the browser's DevTools
// can always capture the decoded media bytes. It stops the casual download.

// On serverless hosts (Vercel) the chapter page signs a token during SSR and
// the browser's video fetch can hit a DIFFERENT function instance. A random
// per-instance secret would make that token fail verification -> 403 -> the
// video never plays. VIDEO_PROXY_SECRET is ideal; fall back to another stable
// server-side secret (Clerk / DB credentials are always configured in prod) so
// direct .mp4 links keep working even when VIDEO_PROXY_SECRET was not set.
const FALLBACK_SECRET = randomBytes(32).toString("hex"); // last resort only
const SECRET =
  process.env.VIDEO_PROXY_SECRET ||
  process.env.CLERK_SECRET_KEY ||
  process.env.DATABASE_URL ||
  FALLBACK_SECRET;

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface ProtectedSource {
  id: string;
  src: string;
  title: string;
  /** True when the upstream stream is HLS (.m3u8) — the proxied URL hides it. */
  hls?: boolean;
}

/** Wrap a raw media URL in a signed proxy token. */
export function signVideoUrl(rawUrl: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: rawUrl, e: Date.now() + TOKEN_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `/api/video-proxy?t=${payload}.${sig}`;
}

/** Open a signed proxy token. Returns null for forged/expired tokens. */
export function verifyVideoToken(
  token: string
): { url: string } | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", SECRET).update(payload).digest();
  const supplied = Buffer.from(sig, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: unknown;
      e?: unknown;
    };
    if (typeof parsed.u !== "string" || typeof parsed.e !== "number") return null;
    if (parsed.e < Date.now()) return null;
    return { url: parsed.u };
  } catch {
    return null;
  }
}

/** Block server-side request forgery: only public http(s) hosts allowed. */
export function isAllowedProxyTarget(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  // IPv4 private / loopback / link-local ranges.
  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((p) => p > 255)) return false;
    const [a, b] = parts;
    const privateRanges =
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (privateRanges) return false;
  }
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return false;
  }
  return true;
}

/**
 * Build the list of playable sources for a chapter, each wrapped in a signed
 * proxy URL (unless `protect` is disabled). YouTube links are left untouched:
 * they can only play through their own iframe.
 *
 * Untitled streams get a stable "Server N" label so the player's stream menu
 * reads nicely.
 */
export function buildPlayerSources(opts: {
  muxPlaybackId?: string | null;
  streams?: { id: string; src: string; title?: string | null }[];
  videoUrl?: string | null;
  fallbackTitle?: string | null;
  protect?: boolean;
}): ProtectedSource[] {
  const protect = opts.protect !== false;
  const list: ProtectedSource[] = [];
  const seen = new Set<string>();

  const push = (raw: string, title: string) => {
    if (!raw) return;
    const info = getVideoUrlInfo(raw);
    if (info.kind === "youtube") {
      // Cannot proxy YouTube — keep the raw link for the iframe player.
      list.push({ id: `yt-${list.length + 1}`, src: raw, title: title || "YouTube" });
      return;
    }
    if (seen.has(raw)) return;
    seen.add(raw);
    list.push({
      id: `src-${list.length + 1}`,
      src: protect ? signVideoUrl(raw) : raw,
      title: title?.trim() || "",
      hls: isHlsUrl(raw),
    });
  };

  if (opts.muxPlaybackId) {
    const url = getMuxPlaybackUrl(opts.muxPlaybackId);
    if (url) push(url, opts.fallbackTitle || "Primary stream");
  }
  for (const stream of opts.streams ?? []) {
    push(stream.src, stream.title ?? "");
  }
  if (opts.videoUrl) push(opts.videoUrl, "");

  return list.map((source, index) => ({
    ...source,
    title: source.title || `Server ${index + 1}`,
  }));
}
