"use client";

// Video playback is handled exclusively by the Limeplay player (Shaka-based,
// shadcn-style — we own components/video-player/*). Sources are pre-wrapped in
// signed same-origin proxy URLs by the server (lib/video-proxy.ts), so Shaka
// fetches every stream — HLS or plain MP4 — from our own origin and never hits
// a CORS wall on an upstream host.
//
// YouTube cannot be played by Shaka, so a chapter whose only playable source is
// a YouTube link falls back to the IFrame-based player. When nothing playable
// is supplied, a CORS-enabled public demo MP4 is shown for instant testing.

import { useMemo } from "react";

import { CustomVideoPlayer } from "@/components/custom-video-player";
import {
  VideoPlayer as LimeplayPlayer,
  type VideoPlayerAsset,
} from "@/components/video-player/player";
import type { PlayerSource } from "@/components/liquid-glass-player";
import { getMuxPlaybackUrl, getVideoUrlInfo } from "@/lib/video";

/** Public demo stream used when a chapter has no playable source. */
const PLACEHOLDER_SRC =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

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

// Recover the real upstream URL from a stored signed proxy token (legacy data).
// The proxy is gone; this guarantees a proxy URL is never handed to Shaka.
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

export const VideoPlayer = ({
  title,
  playbackId,
  videoUrl,
  videoSources,
  playsInline = true,
  onEnded,
  className,
  layout = "aspect",
}: VideoPlayerProps) => {
  // Assemble every candidate source (in order) from the caller's list, or from
  // the single-stream props.
  const allSources = useMemo<{ src: string; title?: string; hls?: boolean }[]>(
    () => {
      if (videoSources && videoSources.length > 0) {
        return videoSources.map((s) => ({
          src: unwrapProxyUrl(s.src),
          title: s.title || title,
          hls: s.hls,
        }));
      }

      const out: { src: string; title?: string; hls?: boolean }[] = [];
      if (playbackId) {
        const url = getMuxPlaybackUrl(playbackId);
        if (url) out.push({ src: url, title: title || "Primary stream", hls: true });
      }
      if (videoUrl) {
        const src = unwrapProxyUrl(videoUrl);
        out.push({
          src,
          title: title || "Video",
          hls: src.toLowerCase().includes(".m3u8"),
        });
      }

      return out;
    },
    [videoSources, playbackId, videoUrl, title]
  );

  const youtubeSources = useMemo(
    () => allSources.filter((s) => getVideoUrlInfo(s.src).kind === "youtube"),
    [allSources]
  );
  const playable = useMemo(
    () => allSources.filter((s) => getVideoUrlInfo(s.src).kind !== "youtube"),
    [allSources]
  );
  const assets = useMemo<VideoPlayerAsset[]>(
    () =>
      playable.map((s, i) => ({
        id: `src-${i + 1}`,
        src: s.src,
        title: s.title,
        hls: s.hls,
      })),
    [playable]
  );

  // YouTube-only chapter → dedicated IFrame player.
  if (youtubeSources.length > 0 && playable.length === 0) {
    const id = getVideoUrlInfo(youtubeSources[0].src).youtubeId;
    return (
      <CustomVideoPlayer
        title={title}
        youtubeId={id}
        onEnded={onEnded}
        className={layout === "fill" ? "h-full w-full" : className}
      />
    );
  }

  // No playable source at all → show the demo placeholder for instant testing.
  if (playable.length === 0) {
    return (
      <LimeplayPlayer
        className={className}
        layout={layout}
        theme="dark"
        source={[{ id: "demo", src: PLACEHOLDER_SRC, title: "Demo video" }]}
        mediaProps={{ playsInline, onEnded }}
      />
    );
  }

  return (
    <LimeplayPlayer
      className={className}
      layout={layout}
      theme="dark"
      source={assets}
      mediaProps={{ playsInline, onEnded }}
    />
  );
};
