"use client";

// Reliable native HTML5 player for progressive MP4 files.
//
// Limeplay (Shaka) fetches media programmatically and therefore requires CORS
// on the hosting server. Plain MP4 links often lack that, so we fall back to
// the native <video> element here — it plays any MP4 regardless of CORS — while
// keeping a modern glass control overlay (play/pause, seek, volume, fullscreen)
// for a consistent feel.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  id: string;
  src: string;
  title?: string;
}

interface Mp4PlayerProps {
  sources: Source[];
  layout?: "aspect" | "fill";
  className?: string;
  playsInline?: boolean;
  onEnded?: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const Mp4Player = ({
  sources,
  layout = "aspect",
  className,
  playsInline = true,
  onEnded,
}: Mp4PlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const src = sources[index]?.src;

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2600);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const onPlaying = () => {
    setPlaying(true);
    setLoading(false);
    scheduleHide();
  };
  const onPause = () => {
    setPlaying(false);
    setLoading(false);
    setShowControls(true);
  };
  const onWaiting = () => setLoading(true);
  const onLoaded = () => {
    setLoading(false);
    const v = videoRef.current;
    if (v) setDuration(v.duration || 0);
  };
  const onTime = () => {
    const v = videoRef.current;
    if (v) {
      setProgress(v.currentTime);
      setDuration(v.duration || duration);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const seek = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setProgress(value);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = false;
    setVolume(value);
    setMuted(false);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-black",
        layout === "aspect" ? "aspect-video" : "h-full w-full",
        className
      )}
      onMouseMove={() => {
        setShowControls(true);
        if (playing) scheduleHide();
      }}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        key={src}
        className="h-full w-full object-contain"
        src={src}
        playsInline={playsInline}
        preload="auto"
        onPlay={onPlaying}
        onPause={onPause}
        onWaiting={onWaiting}
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTime}
        onEnded={() => onEnded?.()}
        onClick={(e) => e.stopPropagation()}
      />

      {/* loading spinner */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      )}

      {/* source picker (only when multiple sources) */}
      {sources.length > 1 && (
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1">
          {sources.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
                setPlaying(false);
                setProgress(0);
                setDuration(0);
                setLoading(true);
              }}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"
              )}
              title={s.title || `Source ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* control overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10",
          showControls || !playing ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* seek */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-white"
          aria-label="Seek"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </button>

          <div className="flex items-center gap-1.5 text-xs text-white/90">
            <span className="tabular-nums">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="grid h-8 w-8 place-items-center rounded-md text-white/90 hover:bg-white/15"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-16 accent-white"
              aria-label="Volume"
            />
            <button
              type="button"
              onClick={toggleFullscreen}
              className="grid h-8 w-8 place-items-center rounded-md text-white/90 hover:bg-white/15"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
