"use client";

// Custom video player with a liquid-glass control bar.
//
// Plays direct media files (.mp4, .webm, ...) with a native <video> and HLS
// streams (.m3u8, e.g. Mux playback URLs) with hls.js, falling back to the
// browser's native HLS (Safari) when hls.js is not needed.
//
// When more than one source is given, a "Streams" menu lets the viewer switch
// between them (e.g. different quality streams of the same video).
//
// The whole UI is custom and framed in frosted glass (backdrop-blur, soft
// translucency, thin light borders) so the browser's default controls and the
// platform's branding are never shown.

import Hls from "hls.js";
import {
  Layers,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { isHlsUrl } from "@/lib/video";

export interface PlayerSource {
  id: string;
  src: string;
  title: string;
  /** True when the upstream stream is HLS; needed because the proxied URL hides it. */
  hls?: boolean;
}

interface LiquidGlassPlayerProps {
  sources: PlayerSource[];
  title?: string;
  autoPlay?: boolean;
  playsInline?: boolean;
  /** Called when playback reaches the end of the current stream. */
  onEnded?: () => void;
  className?: string;
  /** "aspect" keeps a 16:9 box, "fill" stretches to the parent. */
  layout?: "aspect" | "fill";
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0
    ? `${h}:${pad(m)}:${pad(s)}`
    : `${m}:${pad(s)}`;
};

export const LiquidGlassPlayer = ({
  sources,
  title,
  autoPlay = false,
  playsInline = true,
  onEnded,
  className,
  layout = "aspect",
}: LiquidGlassPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<null | "streams" | "speed">(null);
  const [error, setError] = useState<string | null>(null);

  const activeSource = sources[activeIndex] ?? sources[0];

  // Reset per-stream state whenever the active stream changes.
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsReady(false);
    setIsPlaying(false);
    setError(null);
  }, [activeIndex]);

  // (Re)load the active stream: hls.js for HLS, native <video> otherwise.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;
    let cancelled = false;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const cleanup = () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };

    const url = activeSource.src;
    video.pause();

    if (activeSource.hls || isHlsUrl(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) setIsReady(true);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled || !data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError("Unable to load this stream.");
          }
        });
        return cleanup;
      }
      // Safari / native HLS support.
      video.src = url;
    } else {
      video.src = url;
    }

    return cleanup;
  }, [activeSource]);

  const video = videoRef.current;

  // Sync UI with the media element's live state.
  const sync = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!isScrubbing) setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);
    setVolume(v.volume);
    setIsMuted(v.muted);
  }, [isScrubbing]);

  const updateBuffered = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.buffered.length || !v.duration) return;
    const end = v.buffered.end(v.buffered.length - 1);
    setBuffered(Math.min(end, v.duration));
  }, []);

  // Reveal controls on any interaction, auto-hide them while playing.
  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  useEffect(() => {
    pokeControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pokeControls, activeIndex]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration || 0);
    },
    []
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const setVol = useCallback(
    (value: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.volume = value;
      v.muted = value === 0;
    },
    []
  );

  const selectSource = useCallback((index: number) => {
    setActiveIndex(index);
    setMenu(null);
    const v = videoRef.current;
    if (v) v.currentTime = 0;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const togglePip = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled) {
      v.requestPictureInPicture().catch(() => {});
    }
  }, []);

  // ---- Seek bar pointer handling -------------------------------

  const ratioFromEvent = (e: React.PointerEvent<HTMLDivElement>): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromEvent(e);
    const dur = videoRef.current?.duration || 0;
    setHoverTime(dur * ratio);
    setHoverPct(ratio * 100);
    if (isScrubbing) {
      setScrubTime(dur * ratio);
    }
  };

  const handleSeekDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    setScrubTime((videoRef.current?.duration || 0) * ratioFromEvent(e));
  };

  const handleSeekUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (v) v.currentTime = scrubTime;
    setIsScrubbing(false);
    setCurrentTime(scrubTime);
    pokeControls();
  };

  const handleSeekLeave = () => {
    setHoverTime(null);
  };

  // ---- Keyboard shortcuts ---------------------------------------

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowLeft") {
      skip(-10);
    } else if (e.key === "ArrowRight") {
      skip(10);
    } else if (e.key.toLowerCase() === "m") {
      toggleMute();
    }
  };

  // Fullscreen + PiP state tracking.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    const onPip = () => setIsPip(!!document.pictureInPictureElement);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("enterpictureinpicture", onPip);
    document.addEventListener("leavepictureinpicture", onPip);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("enterpictureinpicture", onPip);
      document.removeEventListener("leavepictureinpicture", onPip);
    };
  }, []);

  const progressPct = duration ? (isScrubbing ? scrubTime : currentTime) / duration * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const hasMultiple = sources.length > 1;
  const showChrome = !error && isReady;

  // Prevent seek bar from being clipped by the glass panel while scrubbing.
  const progress = isScrubbing ? scrubTime : currentTime;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={pokeControls}
      onTouchStart={pokeControls}
      onClick={pokeControls}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "group relative w-full select-none overflow-hidden bg-black outline-none",
        !isFullscreen && "rounded-2xl ring-1 ring-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]",
        layout === "aspect" && "aspect-video",
        layout === "fill" && "h-full w-full",
        className
      )}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay={autoPlay}
        playsInline={playsInline}
        controlsList="nodownload noremoteplayback"
        draggable={false}
        preload="metadata"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onCanPlay={() => setIsReady(true)}
        onWaiting={() => setIsWaiting(true)}
        onPlaying={() => {
          setIsWaiting(false);
          setIsPlaying(true);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => onEndedRef.current?.()}
        onError={() =>
          setError(
            "Unable to play this video. Check that the link points directly to a video file (.mp4, .webm) or an HLS stream."
          )
        }
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setIsReady(true);
        }}
        onTimeUpdate={(e) => {
          if (!isScrubbing) setCurrentTime(e.currentTarget.currentTime);
        }}
        onProgress={updateBuffered}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setIsMuted(e.currentTarget.muted);
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
      />

      {/* Gradient scrims */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-300",
          !controlsVisible && !isScrubbing && "opacity-0"
        )}
      />

      {/* Title chip */}
      {(title || hasMultiple) && showChrome && (
        <div
          className={cn(
            "absolute left-4 top-4 z-20 flex items-center gap-2 transition-opacity duration-300",
            !controlsVisible && !isScrubbing && "opacity-0"
          )}
        >
          {title && (
            <span className="max-w-[70%] truncate rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-xl">
              {title}
            </span>
          )}
          {hasMultiple && (
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-xl">
              <Layers className="h-3 w-3" />
              {activeSource?.title || `Server ${activeIndex + 1}`}
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {!isReady && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-xl">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white/80 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Center play button */}
      {showChrome && !isPlaying && !isWaiting && !isScrubbing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition hover:bg-black/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition hover:scale-105 hover:bg-white/25">
            <Play className="h-7 w-7 translate-x-0.5 text-white" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Buffering spinner */}
      {showChrome && isWaiting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80 drop-shadow" />
        </div>
      )}

      {/* Control bar */}
      {showChrome && (
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 z-20 select-none rounded-2xl border border-white/15 bg-white/10 px-3 pb-2.5 pt-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-300",
            !controlsVisible && !isScrubbing && "pointer-events-none -translate-y-2 opacity-0"
          )}
        >
          {/* Seek bar */}
          <div
            ref={trackRef}
            className="group/seek relative -top-1 mx-1 mb-1 h-4 cursor-pointer"
            onPointerDown={handleSeekDown}
            onPointerMove={handleSeekMove}
            onPointerUp={handleSeekUp}
            onPointerCancel={handleSeekUp}
            onPointerLeave={handleSeekLeave}
          >
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400"
                style={{ width: `${progressPct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white opacity-0 shadow ring-4 ring-white/20 transition-opacity group-hover/seek:opacity-100"
                style={{ left: `calc(${progressPct}% - 7px)` }}
              />
            </div>

            {/* Hover tooltip */}
            {hoverTime !== null && !isScrubbing && (
              <div
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-lg border border-white/15 bg-black/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-xl"
                style={{ left: `${hoverPct}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-0.5 text-white">
            <IconButton label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </IconButton>
            <IconButton label="Back 10 seconds" onClick={() => skip(-10)}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
            <IconButton label="Forward 10 seconds" onClick={() => skip(10)}>
              <RotateCw className="h-4 w-4" />
            </IconButton>
            <span className="ml-1 px-1 text-xs font-medium tabular-nums text-white/90">
              {formatTime(progress)} <span className="text-white/50">/</span> {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-0.5">
              {/* Streams menu */}
              {hasMultiple && (
                <IconButton
                  label="Streams"
                  active={menu === "streams"}
                  onClick={() => setMenu(menu === "streams" ? null : "streams")}
                >
                  <Layers className="h-4 w-4" />
                </IconButton>
              )}

              {/* Speed menu */}
              <IconButton
                label="Playback speed"
                active={menu === "speed"}
                onClick={() => setMenu(menu === "speed" ? null : "speed")}
              >
                <span className="text-xs font-semibold">{rate}x</span>
              </IconButton>

              {/* PiP */}
              <IconButton label="Picture in picture" onClick={togglePip}>
                <PictureInPicture2 className={cn("h-4 w-4", isPip && "text-sky-300")} />
              </IconButton>

              {/* Volume */}
              <div className="group/vol flex items-center">
                <IconButton label={isMuted || volume === 0 ? "Unmute" : "Mute"} onClick={toggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </IconButton>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVol(Number(e.target.value))}
                  aria-label="Volume"
                  className="h-1 w-0 cursor-pointer accent-sky-400 transition-all duration-300 group-hover/vol:w-16"
                />
              </div>

              <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </IconButton>
            </div>
          </div>

          {/* Dropdown menus */}
          {menu === "streams" && (
            <GlassMenu onClose={() => setMenu(null)}>
              {sources.map((source, index) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => selectSource(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-white/10",
                    index === activeIndex ? "text-sky-300" : "text-white/85"
                  )}
                >
                  <span className="truncate">{source.title || `Server ${index + 1}`}</span>
                  {index === activeIndex && <span className="text-sky-300">●</span>}
                </button>
              ))}
            </GlassMenu>
          )}

          {menu === "speed" && (
            <GlassMenu onClose={() => setMenu(null)}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setRate(s);
                    const v = videoRef.current;
                    if (v) v.playbackRate = s;
                    setMenu(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-white/10",
                    s === rate ? "text-sky-300" : "text-white/85"
                  )}
                >
                  <span>{s}x</span>
                  {s === rate && <span className="text-sky-300">●</span>}
                </button>
              ))}
            </GlassMenu>
          )}
        </div>
      )}
    </div>
  );
};

/** A small frosted-glass popover used for the dropdown menus. */
const GlassMenu = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <>
    <button
      type="button"
      aria-label="Close menu"
      onClick={onClose}
      className="fixed inset-0 z-40 cursor-default"
    />
    <div className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-white/15 bg-black/70 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
      {children}
    </div>
  </>
);

/** A round glass control button. */
const IconButton = ({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/15 hover:text-white",
      active && "bg-white/15 text-white"
    )}
  >
    {children}
  </button>
);
