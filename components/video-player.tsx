"use client";

// Video playback via Limeplay — a Shaka-based, shadcn-style player that we
// own (components/video-player/*). We feed it the server-assembled playable
// streams (Mux HLS, extra streaming URLs, or a single video URL) as a playlist.
// YouTube links cannot be played by Shaka, so a chapter whose only playable
// source is a YouTube link falls back to the IFrame-based custom player. When
// nothing playable is supplied, we show a high-quality public demo MP4 so the
// player can be verified immediately.

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
  // Assemble every candidate source (in order) from the caller's list, or from
  // the single-stream props.
  const allSources = useMemo<{ src: string; title?: string }[]>(() => {
    if (videoSources && videoSources.length > 0) {
      return videoSources.map((s) => ({ src: s.src, title: s.title || title }));
    }

    const out: { src: string; title?: string }[] = [];
    if (playbackId) {
      const url = getMuxPlaybackUrl(playbackId);
      if (url) out.push({ src: url, title: title || "Primary stream" });
    }
    if (videoUrl) out.push({ src: videoUrl, title: title || "Video" });

    return out;
  }, [videoSources, playbackId, videoUrl, title]);

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
        autoLoad={autoPlay}
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
      autoLoad={autoPlay}
      mediaProps={{ playsInline, onEnded }}
    />
  );
};
