"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { useConfettiStore } from "@/hooks/use-confetti-store";
import { VideoPlayer as LimeplayVideoPlayer } from "@/components/video-player/player";
import { CustomVideoPlayer } from "@/components/custom-video-player";
import { getMuxPlaybackUrl, getVideoUrlInfo, isHlsUrl, toLimeplayAssets } from "@/lib/video";
import type { PlayerSource } from "@/components/liquid-glass-player";

interface VideoPlayerProps {
    playbackId?: string;
    videoUrl?: string;
    videoSources?: PlayerSource[];
    courseId: string;
    chapterId: string;
    nextChapterId?: string;
    isLocked: boolean;
    completeOnEnd: boolean;
    title: string;
};

export const VideoPlayer = ({
    playbackId,
    videoUrl,
    videoSources,
    courseId,
    chapterId,
    nextChapterId,
    isLocked,
    completeOnEnd,
    title,
}: VideoPlayerProps) => {
    const router = useRouter();
    const confetti = useConfettiStore();

    // Assemble the Limeplay source list. Prefer the server-assembled
    // `videoSources` array (which already includes Mux HLS + any entered
    // stream URLs + the legacy videoUrl); fall back to a plain videoUrl or
    // playbackId when no list is present.
    const playerSources = (() => {
      if (videoSources && videoSources.length > 0) {
        return toLimeplayAssets(
          videoSources.map((s) => ({ id: s.id, src: s.src, title: s.title })),
          title
        );
      }
      if (videoUrl) {
        return toLimeplayAssets([{ id: "video-url", src: videoUrl, title }], title);
      }
      if (playbackId) {
        const muxUrl = getMuxPlaybackUrl(playbackId);
        if (muxUrl) {
          return toLimeplayAssets([{ id: "mux", src: muxUrl, title }], title);
        }
      }
      return [];
    })();

    const hasVideo = playerSources.length > 0;

    // Direct progressive files (MP4/WebM/OGG) play cross-origin with a native
    // <video> element — no CORS needed. HLS streams (Mux) require the Limeplay
    // (Shaka) player instead, since Shaka fetches via XHR and needs CORS.
    const nativeSource = hasVideo
      ? playerSources.find(
          (source) => !isHlsUrl(source.src) &&
            getVideoUrlInfo(source.src).kind !== "youtube"
        )
      : undefined;

    const onEnd = async () => {
        try {
            if (completeOnEnd) {
                await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
                    isCompleted: true
                })

                if (!nextChapterId) {
                    confetti.onOpen()
                }

                toast.success("Progress updated")
                router.refresh()

                if (nextChapterId) {
                    router.push(`/courses/${courseId}/chapters/${nextChapterId}`)
                }
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    return (
        <div className="relative aspect-video overflow-hidden bg-black">
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
                    <Lock className="h-8 w-8" />
                    <p className="text-sm">
                        This chapter is locked
                    </p>
                </div>
            )}
            {!isLocked && nativeSource && (
                <CustomVideoPlayer
                    src={nativeSource.src}
                    autoPlay
                    onEnded={onEnd}
                    className="absolute inset-0 h-full w-full border-0 rounded-none"
                />
            )}
            {!isLocked && hasVideo && !nativeSource && (
                <LimeplayVideoPlayer
                    source={playerSources}
                    mediaProps={{ autoPlay: true, playsInline: true, onEnded: onEnd }}
                    layout="fill"
                />
            )}
            {!isLocked && !hasVideo && (
                <div className="h-full w-full flex items-center justify-center bg-slate-800 text-sm text-secondary">
                    No video for this chapter
                </div>
            )}
        </div>
    )
}
