"use client";

// Video playback uses Vidstack (MediaPlayer + default video layout). Sources
// are passed straight through to the browser's native <video>; no proxy, no
// API route, no Shaka. This means:
//
//   - archive.org MP4 / WebM files play directly via native <video>, which
//     ( unlike Shaka/fetch) does NOT require the server to send CORS headers.
//   - A Mux playbackId is rendered as HLS (.m3u8) — native HLS where the
//     browser supports it (Safari), otherwise it falls back to the browser's
//     own HLS support. Mux streams DO send proper CORS headers.
//
// IMPORTANT (crossOrigin): we intentionally do NOT set `crossOrigin`. Setting
// it would force the media element into CORS mode, and since archive.org sends
// no `Access-Control-Allow-Origin` headers, that would BLOCK playback (and the
// thumbnails/canvas would also be tainted). A plain <video> plays cross-origin
// MP4s fine without crossOrigin — CORS is only needed for reading pixels.

import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
  type MediaSrc,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { getMuxPlaybackUrl, getVideoUrlInfo } from "@/lib/video";
import type { PlayerSource } from "@/components/liquid-glass-player";

interface VideoPlayerProps {
  title?: string;
  /** Mux playback id — rendered as an HLS stream (used as a fallback). */
  playbackId?: string | null;
  /** A single external URL (used as a fallback). */
  videoUrl?: string | null;
  /** Server-assembled playable streams (may be proxy-signed). */
  videoSources?: PlayerSource[];
  /** Kept for API compatibility (autoplay is handled by the player). */
  autoPlay?: boolean;
  playsInline?: boolean;
  /** Called when playback reaches the end. */
  onEnded?: () => void;
  className?: string;
  layout?: "aspect" | "fill";
}

/** Recover the real upstream URL from a stored signed proxy token (legacy). */
function unwrapProxyUrl(u: string): string {
  if (!u.startsWith("/api/video-proxy?t=")) return u;
  try {
    const token = u.slice("/api/video-proxy?t=".length);
    const dot = token.indexOf(".");
    const b64 = (dot > 0 ? token.slice(0, dot) : token)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const parsed = JSON.parse(atob(b64)) as { u?: unknown };
    if (typeof parsed.u === "string" && parsed.u.trim()) return parsed.u;
  } catch {
    /* fall through to the raw value */
  }
  return u;
}

type InfSrcType =
  | "video/mp4"
  | "video/webm"
  | "video/ogg"
  | "application/x-mpegurl"
  | "video/youtube";

function inferSourceType(raw: string): InfSrcType {
  if (getVideoUrlInfo(raw).kind === "youtube") return "video/youtube";
  const lower = raw.toLowerCase();
  if (lower.includes(".m3u8")) return "application/x-mpegurl";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".ogg") || lower.includes(".ogv")) return "video/ogg";
  // Default for anything else (mp4/mov/m4v/mkv).
  return "video/mp4";
}

export const VideoPlayer = ({
  title,
  playbackId,
  videoUrl,
  videoSources,
  playsInline = true,
  autoPlay = false,
  onEnded,
  className,
  layout = "aspect",
}: VideoPlayerProps) => {
  const playerRef = useRef<MediaPlayerInstance>(null);

  // Resolve the single source to feed Vidstack. Prefer the assembled source
  // list (which carries the archive.org URL), then the single videoUrl, then
  // the Mux playbackId.
  const source = useMemo<MediaSrc | null>(() => {
    let raw: string | null = null;

    if (videoSources && videoSources.length > 0) {
      raw = unwrapProxyUrl(videoSources[0].src);
    } else if (videoUrl) {
      raw = unwrapProxyUrl(videoUrl);
    } else if (playbackId) {
      const url = getMuxPlaybackUrl(playbackId);
      if (url) raw = url;
    }

    if (!raw) return null;
    return { src: raw, type: inferSourceType(raw) };
  }, [videoSources, videoUrl, playbackId]);

  if (!source) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm text-secondary">
        No video for this chapter
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-black",
        layout === "fill" ? "h-full w-full" : "aspect-video",
        className
      )}
    >
      <MediaPlayer
        ref={playerRef}
        className="!h-full !w-full"
        title={title || "Video"}
        src={source}
        playsInline={playsInline}
        autoPlay={autoPlay}
        onEnded={onEnded}
        crossOrigin={undefined}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
};
