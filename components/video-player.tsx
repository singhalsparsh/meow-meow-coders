"use client";

// Wrapper around the liquid-glass video player.
//
// The server pages assemble the playable streams (Mux HLS, extra streaming
// URLs, single video URL) and, when protection is on, wrap each one in a
// signed proxy URL — so the player only ever sees our own origin. This wrapper
// just passes that list through, and falls back to building it from
// `playbackId` / `videoUrl` when no `videoSources` were given.
//
// YouTube links cannot be played by the liquid-glass player, so a chapter that
// only has a YouTube link falls back to the IFrame-based custom player.

import { useMemo } from "react";

import { CustomVideoPlayer } from "@/components/custom-video-player";
import {
  LiquidGlassPlayer,
  type PlayerSource,
} from "@/components/liquid-glass-player";
import { getMuxPlaybackUrl, getVideoUrlInfo, isHlsUrl } from "@/lib/video";

interface VideoPlayerProps {
  title?: string;
  /** Mux playback id — rendered as an HLS stream (used as a fallback). */
  playbackId?: string | null;
  /** A single external URL (used as a fallback). */
  videoUrl?: string | null;
  /** Server-assembled playable streams (may be proxy-signed). */
  videoSources?: PlayerSource[];
  autoPlay?: boolean;
  playsInline?: boolean;
  /** Called when playback reaches the end. */
  onEnded?: () => void;
  className?: string;
  layout?: "aspect" | "fill";
}

export const VideoPlayer = ({
  title,
  playbackId,
  videoUrl,
  videoSources,
  autoPlay = false,
  playsInline = true,
  onEnded,
  className,
  layout = "aspect",
}: VideoPlayerProps) => {
  // Prefer the caller-assembled list; fall back to assembling one from the
  // single-stream props so callers that don't build a list still work.
  const sources = useMemo<PlayerSource[]>(() => {
    if (videoSources && videoSources.length > 0) return videoSources;

    const list: PlayerSource[] = [];
    const push = (src: string, fallbackTitle: string, hls?: boolean) => {
      if (!src) return;
      const info = getVideoUrlInfo(src);
      if (info.kind === "youtube") return; // handled by the YouTube fallback below
      list.push({ id: `src-${list.length + 1}`, src, title: fallbackTitle, hls: hls ?? isHlsUrl(src) });
    };

    if (playbackId) {
      const url = getMuxPlaybackUrl(playbackId);
      if (url) push(url, title || "Primary stream", true);
    }
    if (videoUrl) push(videoUrl, title || "Video");

    return list;
  }, [videoSources, playbackId, videoUrl, title]);

  // If the only playable thing is a YouTube link, use the dedicated player.
  const youtubeSource = useMemo(
    () => sources.find((s) => getVideoUrlInfo(s.src).kind === "youtube"),
    [sources]
  );

  if (sources.length === 0 && youtubeSource) {
    return (
      <CustomVideoPlayer
        title={title}
        youtubeId={getVideoUrlInfo(youtubeSource.src).youtubeId}
        onEnded={onEnded}
        className={layout === "fill" ? "h-full w-full" : className}
      />
    );
  }

  if (sources.length === 0) return null;

  return (
    <LiquidGlassPlayer
      sources={sources}
      title={title}
      autoPlay={autoPlay}
      playsInline={playsInline}
      onEnded={onEnded}
      layout={layout}
      className={className}
    />
  );
};
