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
import type {
  AssetLoadContext,
  UseAssetOptions,
} from "@/components/hooks/use-asset";

/** Public demo stream used when a chapter has no playable source. */
const PLACEHOLDER_SRC =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";

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

// Route any cross-origin media URL through our same-origin streaming proxy so
// Archive.org / other CDNs that omit CORS headers (and non-faststart MP4s)
// can still be fetched reliably. Same-origin and YouTube URLs are left
// untouched. Works for both the native <video> path (MP4) and Shaka (HLS).
function proxifyMediaUrl(u: string): string {
  if (!u.startsWith("http://") && !u.startsWith("https://")) return u;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return u;
  }
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return u;
  }
  return `/api/video-proxy?url=${encodeURIComponent(u)}`;
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
  // Assemble every candidate source (in order) from the caller's list, or from
  // the single-stream props.
  const allSources = useMemo<{ src: string; title?: string; hls?: boolean }[]>(
    () => {
      if (videoSources && videoSources.length > 0) {
        return videoSources.map((s) => {
          const raw = unwrapProxyUrl(s.src);
          return {
            src: raw,
            title: s.title || title,
            hls: s.hls ?? raw.toLowerCase().includes(".m3u8"),
          };
        });
      }

      const out: { src: string; title?: string; hls?: boolean }[] = [];
      if (playbackId) {
        // Mux streams are HLS and served with full CORS — no proxy needed.
        const url = getMuxPlaybackUrl(playbackId);
        if (url) out.push({ src: url, title: title || "Primary stream", hls: true });
      }
      if (videoUrl) {
        const raw = unwrapProxyUrl(videoUrl);
        out.push({
          src: raw,
          title: title || "Video",
          hls: raw.toLowerCase().includes(".m3u8"),
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
        // Proxy cross-origin media (fixes CORS + lets Shaka handle non-faststart
        // MP4s). YouTube is excluded (handled by its own iframe).
        src: proxifyMediaUrl(s.src),
        title: s.title,
        hls: s.hls,
      })),
    [playable]
  );

  // Custom loader:
  //  - HLS always goes through Shaka (the Limeplay default).
  //  - MP4 also tries Shaka first: Shaka parses non-faststart files whose
  //    `moov` box lives at the end (native <video> would buffer the whole file
  //    before playing). Sources are routed through our same-origin proxy, so
  //    Shaka's XHR fetches don't hit a CORS wall.
  //  - If Shaka fails on an MP4 (e.g. an unusual container), fall back to the
  //    browser's native <video> so we never show a blank spinner.
  const loadAsset = async (ctx: AssetLoadContext<VideoPlayerAsset>) => {
    const { asset, media, loadDefault, startTime } = ctx;

    if (asset.hls) {
      await loadDefault();
      return;
    }

    const src = asset.src;
    if (!src) return;

    try {
      await loadDefault();
      return;
    } catch (loadError) {
      // Shaka path failed — fall through to native playback.
      console.warn(
        "[video-player] Shaka MP4 load failed, falling back to native <video>:",
        loadError
      );
    }

    // --- debug: surface the real media/network error instead of a silent
    // spinner. Kept verbose on purpose while diagnosing playback issues.
    const report = (what: string, extra?: unknown) => {
      console.log(`[video-player > ${what}]`, {
        src,
        readyState: media.readyState,
        networkState: media.networkState,
        error: media.error
          ? { code: media.error.code, message: media.error.message }
          : null,
        extra,
      });
    };
    const onError = () => report("error", media.error);
    const onStalled = () => report("stalled");
    const onWaiting = () => report("waiting");
    const onCanPlay = () => report("canplay");
    const onPlaying = () => report("playing");
    const onLoadedMetadata = () => report("loadedmetadata");

    media.addEventListener("error", onError);
    media.addEventListener("stalled", onStalled);
    media.addEventListener("waiting", onWaiting);
    media.addEventListener("canplay", onCanPlay);
    media.addEventListener("playing", onPlaying);
    media.addEventListener("loadedmetadata", onLoadedMetadata);

    media.src = src;
    media.load();
    if (startTime != null && Number.isFinite(startTime)) {
      media.currentTime = startTime;
    }

    // Clean up listeners once playback actually starts (or the element is
    // replaced). Avoids leaking handlers across chapter navigations.
    const detach = () => {
      media.removeEventListener("error", onError);
      media.removeEventListener("stalled", onStalled);
      media.removeEventListener("waiting", onWaiting);
      media.removeEventListener("canplay", onCanPlay);
      media.removeEventListener("playing", onPlaying);
      media.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
    media.addEventListener("playing", detach, { once: true });
    media.addEventListener("error", detach, { once: true });
  };

  const loader: UseAssetOptions<VideoPlayerAsset>["loader"] = {
    load: loadAsset,
  };

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
        source={[{ id: "demo", src: proxifyMediaUrl(PLACEHOLDER_SRC), title: "Demo video" }]}
        mediaProps={{ playsInline, autoPlay, onEnded }}
        loading={{ loader }}
      />
    );
  }

  return (
    <LimeplayPlayer
      className={className}
      layout={layout}
      theme="dark"
      source={assets}
      mediaProps={{ playsInline, autoPlay, onEnded }}
      loading={{ loader }}
    />
  );
};
