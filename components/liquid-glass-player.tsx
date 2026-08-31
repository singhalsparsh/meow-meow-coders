"use client";

// Limeplay-inspired video player with shadcn/ui polish.
// Supports HLS, direct media, multiple sources, and a settings menu.

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
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { isHlsUrl } from "@/lib/video";

export interface PlayerSource {
  id: string;
  src: string;
  title: string;
  hls?: boolean;
}

interface LiquidGlassPlayerProps {
  sources: PlayerSource[];
  title?: string;
  autoPlay?: boolean;
  playsInline?: boolean;
  onEnded?: () => void;
  className?: string;
  layout?: "aspect" | "fill";
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
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
  const [menu, setMenu] = useState<null | "streams" | "speed" | "settings">(null);
  const [error, setError] = useState<string | null>(null);
  const [isMutedSetting, setIsMutedSetting] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(autoPlay);

  const activeSource = sources[activeIndex] ?? sources[0];

  // Reset per-stream state
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setIsReady(false);
    setIsPlaying(false);
    setError(null);
  }, [activeIndex]);

  // Load the active stream
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
      video.src = url;
    } else {
      video.src = url;
    }

    return cleanup;
  }, [activeSource]);

  const video = videoRef.current;

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

  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, 3000);
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
    if (v.paused) v.play().catch(() => { });
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
      document.exitFullscreen().catch(() => { });
    } else {
      el.requestFullscreen().catch(() => { });
    }
  }, []);

  const togglePip = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => { });
    } else if (document.pictureInPictureEnabled) {
      v.requestPictureInPicture().catch(() => { });
    }
  }, []);

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
        "group relative w-full select-none overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-900 outline-none",
        !isFullscreen && "rounded-2xl ring-1 ring-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
        layout === "aspect" && "aspect-video",
        layout === "fill" && "h-full w-full",
        className
      )}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay={isAutoplay}
        playsInline={playsInline}
        controlsList="nodownload noremoteplayback"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
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

      {/* Gradient overlays */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 transition-opacity duration-300",
          !controlsVisible && !isScrubbing && "opacity-0"
        )}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent"
      />

      {/* Title */}
      {(title || hasMultiple) && showChrome && (
        <div
          className={cn(
            "absolute left-4 top-4 z-20 flex items-center gap-2 transition-opacity duration-300",
            !controlsVisible && !isScrubbing && "opacity-0"
          )}
        >
          {title && (
            <span className="max-w-[70%] truncate rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {title}
            </span>
          )}
          {hasMultiple && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              <Layers className="h-3 w-3" />
              {activeSource?.title || `Source ${activeIndex + 1}`}
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {!isReady && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6 text-center text-sm text-white/80 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Center play button */}
      {showChrome && !isPlaying && !isWaiting && !isScrubbing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 z-10 flex items-center justify-center transition hover:bg-black/10"
        >              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-110 hover:bg-white/20 hover:ring-white/30">
                <Play className="h-7 w-7 translate-x-0.5 text-white drop-shadow-lg" fill="currentColor" />
              </span>
        </button>
      )}

      {/* Buffering */}
      {showChrome && isWaiting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/80" />
        </div>
      )}

      {/* Control bar - shadcn/ui style */}
      {showChrome && (
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 z-20 select-none rounded-xl bg-black/50 px-3 pb-2 pt-1.5 backdrop-blur-xl border border-white/5 transition-all duration-300",
            !controlsVisible && !isScrubbing && "pointer-events-none translate-y-2 opacity-0"
          )}
        >
          {/* Seek bar */}
          <div
            ref={trackRef}
            className="group/seek relative -top-0.5 mx-1 mb-1 h-4 cursor-pointer"
            onPointerDown={handleSeekDown}
            onPointerMove={handleSeekMove}
            onPointerUp={handleSeekUp}
            onPointerCancel={handleSeekUp}
            onPointerLeave={handleSeekLeave}
          >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all duration-150"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)] opacity-0 transition-all duration-200 group-hover/seek:opacity-100 group-hover/seek:scale-110"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {hoverTime !== null && !isScrubbing && (
              <div
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
                style={{ left: `${hoverPct}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1 text-white">
            <IconButton label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </IconButton>
            <IconButton label="Back 10s" onClick={() => skip(-10)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Forward 10s" onClick={() => skip(10)}>
              <RotateCw className="h-3.5 w-3.5" />
            </IconButton>
            <span className="ml-1 px-1 text-xs font-medium tabular-nums text-white/90">
              {formatTime(isScrubbing ? scrubTime : currentTime)} <span className="text-white/30">/</span> {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {/* Settings Menu */}
              <IconButton
                label="Settings"
                active={menu === "settings"}
                onClick={() => setMenu(menu === "settings" ? null : "settings")}
              >
                <Settings className="h-4 w-4" />
              </IconButton>

              {hasMultiple && (
                <IconButton
                  label="Streams"
                  active={menu === "streams"}
                  onClick={() => setMenu(menu === "streams" ? null : "streams")}
                >
                  <Layers className="h-4 w-4" />
                </IconButton>
              )}

              <IconButton
                label="Speed"
                active={menu === "speed"}
                onClick={() => setMenu(menu === "speed" ? null : "speed")}
              >
                <span className="text-xs font-semibold">{rate}x</span>
              </IconButton>

              <IconButton label="Picture in picture" onClick={togglePip}>
                <PictureInPicture2 className={cn("h-4 w-4", isPip && "text-blue-400")} />
              </IconButton>

              {/* Volume control - shadcn slider style */}
              <div className="flex items-center gap-1 group/vol">
                <IconButton label={isMuted || volume === 0 ? "Unmute" : "Mute"} onClick={toggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </IconButton>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVol(Number(e.target.value))}
                    aria-label="Volume"
                    className="h-1.5 w-0 cursor-pointer appearance-none rounded-full bg-white/20 transition-all duration-200 group-hover/vol:w-20 focus:w-20 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    style={{
                      background: `linear-gradient(to right, #60a5fa ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
              </div>

              <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </IconButton>
            </div>
          </div>

          {/* Settings Menu */}
          {menu === "settings" && (
            <GlassMenu onClose={() => setMenu(null)} className="bottom-full right-0 mb-2 w-52">
              <div className="space-y-1 p-1">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Media Settings
                </div>

                <SettingToggle
                  label="Muted"
                  value={isMutedSetting}
                  onChange={() => {
                    setIsMutedSetting(!isMutedSetting);
                    toggleMute();
                  }}
                />

                <SettingToggle
                  label="Autoplay"
                  value={isAutoplay}
                  onChange={() => {
                    setIsAutoplay(!isAutoplay);
                    if (!isAutoplay) {
                      const v = videoRef.current;
                      if (v) v.play().catch(() => { });
                    }
                  }}
                />

                <div className="border-t border-white/10 my-1" />

                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Presets
                </div>

                <button
                  type="button"
                  onClick={() => setMenu(null)}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                >
                  {activeSource?.title || "Current Stream"}
                </button>

                <div className="border-t border-white/10 my-1" />

                <button
                  type="button"
                  onClick={() => setMenu(null)}
                  className="flex w-full items-center rounded-md px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
                >
                  + Add a custom stream
                </button>
              </div>
            </GlassMenu>
          )}

          {/* Streams Menu */}
          {menu === "streams" && (
            <GlassMenu onClose={() => setMenu(null)} className="bottom-full right-0 mb-2 w-44">
              {sources.map((source, index) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => selectSource(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-md px-3 py-1.5 text-left text-xs transition hover:bg-white/10",
                    index === activeIndex ? "text-blue-400" : "text-white/80"
                  )}
                >
                  <span className="truncate">{source.title || `Source ${index + 1}`}</span>
                  {index === activeIndex && <span className="text-blue-400">●</span>}
                </button>
              ))}
            </GlassMenu>
          )}

          {/* Speed Menu */}
          {menu === "speed" && (
            <GlassMenu onClose={() => setMenu(null)} className="bottom-full right-0 mb-2 w-32">
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
                    "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition hover:bg-white/10",
                    s === rate ? "text-blue-400" : "text-white/80"
                  )}
                >
                  <span>{s}x</span>
                  {s === rate && <span className="text-blue-400">●</span>}
                </button>
              ))}
            </GlassMenu>
          )}
        </div>
      )}
    </div>
  );
};

// Toggle component for settings menu (shadcn switch style)
const SettingToggle = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
  >
    <span>{label}</span>
    <span
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        value ? "bg-blue-500" : "bg-white/20"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          value ? "translate-x-4" : "translate-x-0"
        )}
      />
    </span>
  </button>
);

const GlassMenu = ({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) => (
  <>
    <button
      type="button"
      aria-label="Close menu"
      onClick={onClose}
      className="fixed inset-0 z-40 cursor-default"
    />
    <div className={cn(
      "absolute z-50 overflow-hidden rounded-xl bg-black/70 p-1.5 backdrop-blur-2xl border border-white/10 shadow-2xl",
      className
    )}>
      {children}
    </div>
  </>
);

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
      "flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white",
      active && "bg-white/10 text-white"
    )}
  >
    {children}
  </button>
);