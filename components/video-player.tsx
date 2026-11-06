"use client";

// Video playback abstraction.
//
// - HLS streams (Mux etc.) → Limeplay (Shaka-based, shadcn-style player).
// - Direct MP4 files → a native HTML5 player with a glass control overlay
//   (Shaka requires CORS on the host; plain MP4 links usually don't have it,
//   so the native <video> path is the reliable choice for MP4).
// - YouTube-only → dedicated IFrame player.
//
// When nothing playable is supplied, a high-quality public demo MP4 is shown so
// the player can be verified immediately.

import { useMemo } from "react";

import { CustomVideoPlayer } from "@/components/custom-video-player";
import { Mp4Player } from "@/components/mp4-player";
import {
  VideoPlayer as LimeplayPlayer,
  type VideoPlayerAsset,
} from "@/components/video-player/player";
import type { PlayerSource } from "@/components/liquid-glass-player";
import { getMuxPlaybackUrl, getVideoUrlInfo, isHlsUrl } from "@/lib/video";

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

  // Does the playable set include an HLS stream? HLS needs Shaka/Limeplay; a
  // set of plain MP4s plays more reliably through the native player.
  const hasHls = useMemo(
    () => playable.some((s) => isHlsUrl(s.src)),
    [playable]
  );

  const mp4Sources = useMemo(
    () => playable.map((s, i) => ({ id: `src-${i + 1}`, ...s })),
    [playable]
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
      <Mp4Player
        sources={[
          { id: "demo", src: PLACEHOLDER_SRC, title: "Demo video" },
        ]}
        layout={layout}
        className={className}
        playsInline={playsInline}
        onEnded={onEnded}
      />
    );
  }

  // HLS (or mixed with HLS) → Limeplay/Shaka.
  if (hasHls) {
    return (
      <LimeplayPlayer
        className={className}
        layout={layout}
        theme="dark"
        source={assets}
        mediaProps={{ playsInline, onEnded }}
      />
    );
  }

  // Plain MP4 → native player.
  return (
    <Mp4Player
      sources={mp4Sources}
      layout={layout}
      className={className}
      playsInline={playsInline}
      onEnded={onEnded}
    />
  );
};
