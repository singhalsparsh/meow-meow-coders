"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { useConfettiStore } from "@/hooks/use-confetti-store";
import { VideoPlayer as LimeplayVideoPlayer } from "@/components/video-player";
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

    const hasVideo = !!playbackId || !!videoUrl || (videoSources?.length ?? 0) > 0;

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
        <div className="relative aspect-video">
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
                    <Lock className="h-8 w-8" />
                    <p className="text-sm">
                        This chapter is locked
                    </p>
                </div>
            )}
            {!isLocked && hasVideo && (
                <LimeplayVideoPlayer
                    title={title}
                    playbackId={playbackId}
                    videoUrl={videoUrl}
                    videoSources={videoSources}
                    onEnded={onEnd}
                    autoPlay
                    playsInline
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
