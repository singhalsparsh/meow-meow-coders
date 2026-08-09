"use client";

// Custom video player with its own control bar (play/pause, seek, time,
// volume, speed, fullscreen). Supports direct media files via <video> and
// YouTube via the IFrame API, so the browser's default controls and the
// YouTube brand / related videos are never shown. Fills its parent; the
// caller controls sizing (typically an aspect-video container).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface CustomVideoPlayerProps {
  title?: string;
  /** Direct media file URL (played with a native <video>). */
  src?: string;
  /** YouTube video id (played through the IFrame API). */
  youtubeId?: string;
  autoPlay?: boolean;
  /** Called when playback reaches the end. */
  onEnded?: () => void;
  className?: string;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

const YT_STATES = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById("youtube-iframe-api");
    if (existing) {
      (window as any).onYouTubeIframeAPIReady = () => resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const CustomVideoPlayer = ({
  title,
  src,
  youtubeId,
  autoPlay = false,
  onEnded,
  className,
}: CustomVideoPlayerProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const isYoutube = !!youtubeId;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seek = useCallback(
    (seconds: number) => {
      if (isYoutube) {
        ytPlayerRef.current?.seekTo(seconds, true);
      } else if (videoRef.current) {
        videoRef.current.currentTime = seconds;
      }
      setCurrentTime(seconds);
    },
    [isYoutube]
  );

  const skip = useCallback(
    (delta: number) => {
      const base = isYoutube
        ? ytPlayerRef.current?.getCurrentTime() ?? currentTime
        : videoRef.current?.currentTime ?? currentTime;
      seek(base + delta);
    },
    [isYoutube, currentTime, seek]
  );

  const togglePlay = useCallback(() => {
    if (isYoutube) {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (p.getPlayerState() === YT_STATES.PLAYING) p.pauseVideo();
      else p.playVideo();
    } else {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    }
  }, [isYoutube]);

  const toggleMute = useCallback(() => {
    if (isYoutube) {
      const p = ytPlayerRef.current;
      if (!p) return;
      if (p.isMuted()) {
        p.unMute();
        setIsMuted(false);
      } else {
        p.mute();
        setIsMuted(true);
      }
    } else {
      const v = videoRef.current;
      if (!v) return;
      v.muted = !v.muted;
      setIsMuted(v.muted);
    }
  }, [isYoutube]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolume(value);
      if (isYoutube) {
        const p = ytPlayerRef.current;
        if (!p) return;
        if (value === 0) {
          p.mute();
          setIsMuted(true);
        } else {
          p.unMute();
          p.setVolume(value * 100);
          setIsMuted(false);
        }
      } else {
        const v = videoRef.current;
        if (!v) return;
        v.volume = value;
        v.muted = value === 0;
      }
    },
    [isYoutube]
  );

  const handleRateChange = useCallback(
    (value: number) => {
      setRate(value);
      if (isYoutube) ytPlayerRef.current?.setPlaybackRate(value);
      else if (videoRef.current) videoRef.current.playbackRate = value;
    },
    [isYoutube]
  );

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const onSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (isScrubbing) setScrubTime(value);
    else seek(value);
  };

  const commitSeek = (e: React.PointerEvent<HTMLInputElement>) => {
    const value = Number((e.target as HTMLInputElement).value);
    setIsScrubbing(false);
    seek(value);
  };

  // Native <video> playback listeners reset whenever the source changes.
  useEffect(() => {
    if (isYoutube || !src) return;
    setCurrentTime(0);
    setDuration(0);
    setIsReady(false);
    setError(null);
    setIsPlaying(false);
  }, [isYoutube, src]);

  // YouTube player lifecycle.
  useEffect(() => {
    if (!youtubeId) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    setError(null);
    setIsReady(false);

    (async () => {
      try {
        await loadYouTubeApi();
      } catch {
        if (!cancelled) setError("Could not load the video player.");
        return;
      }
      if (cancelled || !ytContainerRef.current) return;

      const YT = (window as any).YT;
      player = new YT.Player(ytContainerRef.current, {
        width: "100%",
        height: "100%",
        videoId: youtubeId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            ytPlayerRef.current = player;
            setIsReady(true);
            const d = player!.getDuration();
            if (d && !Number.isNaN(d)) setDuration(d);
            if (autoPlay) player!.playVideo();
          },
          onStateChange: (event: any) => {
            const s = event.data;
            if (s === YT_STATES.PLAYING) {
              setIsPlaying(true);
              const d = player!.getDuration();
              if (d && !Number.isNaN(d)) setDuration(d);
            } else if (s === YT_STATES.PAUSED || s === YT_STATES.ENDED || s === YT_STATES.CUED) {
              setIsPlaying(false);
            }
            if (s === YT_STATES.ENDED) onEndedRef.current?.();
          },
          onError: () => {
            setError(
              "Unable to play this video. Check that the YouTube link is correct and the video is available."
            );
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      if (player) {
        try {
          player.destroy();
        } catch {}
      }
      ytPlayerRef.current = null;
    };
  }, [youtubeId, autoPlay]);

  // Poll currentTime while a YouTube video is playing (the API has no
  // timeupdate event).
  useEffect(() => {
    if (!isYoutube || !isPlaying) return;
    const id = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      setCurrentTime(p.getCurrentTime());
    }, 500);
    return () => window.clearInterval(id);
  }, [isYoutube, isPlaying]);

  // Track fullscreen state.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const showControls = isReady && !error;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "group relative w-full overflow-hidden rounded-md border bg-slate-900",
        className
      )}
    >
      {isYoutube ? (
        <div ref={ytContainerRef} className="absolute inset-0 z-0" />
      ) : (
        <video
          key={src}
          ref={videoRef}
          className="h-full w-full object-contain"
          src={src}
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onCanPlay={() => setIsReady(true)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => onEndedRef.current?.()}
          onError={() =>
            setError(
              "Unable to play this video. Check that the link points directly to a video file (.mp4, .webm) or a YouTube link."
            )
          }
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setIsMuted(e.currentTarget.muted);
          }}
        />
      )}

      {!isReady && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800 px-6 text-center text-sm text-slate-300">
          {error}
        </div>
      )}

      {showControls && !isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={title ? `Play ${title}` : "Play"}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition hover:bg-black/10"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg">
            <Play className="h-8 w-8 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {showControls && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-8 transition",
            isPlaying
              ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              : "opacity-100"
          )}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={isScrubbing ? scrubTime : currentTime}
            onChange={onSeekInput}
            onPointerDown={() => setIsScrubbing(true)}
            onPointerUp={commitSeek}
            className="h-1 w-full cursor-pointer accent-sky-500"
            aria-label="Seek"
          />
          <div className="flex items-center gap-x-2 text-xs text-white">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="p-1 transition hover:text-sky-300"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => skip(-10)}
              aria-label="Back 10 seconds"
              className="p-1 transition hover:text-sky-300"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => skip(10)}
              aria-label="Forward 10 seconds"
              className="p-1 transition hover:text-sky-300"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-x-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                className="p-1 transition hover:text-sky-300"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="h-1 w-16 cursor-pointer accent-sky-500"
                aria-label="Volume"
              />
              <select
                value={rate}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                aria-label="Playback speed"
                className="rounded bg-black/40 px-1 text-xs text-white"
              >
                {SPEEDS.map((r) => (
                  <option key={r} value={r} className="text-slate-900">
                    {r}x
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="p-1 transition hover:text-sky-300"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
