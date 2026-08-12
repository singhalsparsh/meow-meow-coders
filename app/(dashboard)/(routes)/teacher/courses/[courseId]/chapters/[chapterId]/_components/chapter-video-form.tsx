"use client";

import axios from "axios";
import { Link2, Pencil, Plus, PlusCircle, Save, Trash2, Video } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Chapter, MuxData, VideoSource } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { isPlayableVideoUrl } from "@/lib/video";
import { VideoPlayer as LimeplayVideoPlayer } from "@/components/video-player";
import type { PlayerSource } from "@/components/liquid-glass-player";

interface ChapterVideoProps {
  initialData: Chapter & {
    muxData?: MuxData | null;
    videoSources?: VideoSource[];
  };
  /** Server-assembled, proxy-signed playable streams for the preview. */
  playerSources?: PlayerSource[];
  courseId: string;
  chapterId: string;
};

interface StreamRow {
  /** Present for streams already stored in the DB. */
  id?: string;
  src: string;
  title?: string | null;
}

export const ChapterVideoForm = ({
  initialData,
  playerSources,
  courseId,
  chapterId
}: ChapterVideoProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [embedUrl, setEmbedUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Streaming URLs (the multiple-playable-options feature).
  const [streams, setStreams] = useState<StreamRow[]>(
    () => (initialData.videoSources ?? []).map((s) => ({
      id: s.id,
      src: s.src,
      title: s.title,
    }))
  );

  const router = useRouter();

  const toggleEdit = () => {
    // Reset the sub-mode whenever the form is (re)opened.
    setEmbedUrl("");
    setMode("upload");
    setIsEditing((current) => !current);
  };

  const save = async (values: { videoUrl: string }) => {
    try {
      setIsSaving(true);
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, values);
      toast.success("Chapter updated");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  const addStream = () => {
    setStreams((current) => [...current, { src: "" }]);
  };

  const updateStream = (index: number, patch: Partial<StreamRow>) => {
    setStreams((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeStream = (index: number) => {
    setStreams((current) => current.filter((_, i) => i !== index));
  };

  const saveStreams = async () => {
    const valid = streams
      .map((row) => row.src.trim())
      .filter(Boolean);
    try {
      setIsSaving(true);
      await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/video-sources`, {
        sources: valid.map((src, index) => ({
          src,
          title: streams[index]?.title?.trim() || null,
        })),
      });
      toast.success("Streaming options updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Video
        <Button onClick={toggleEdit} variant="ghost" disabled={isSaving}>
          {isEditing && (
            <>Cancel</>
          )}
          {!isEditing && !initialData.videoUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add a video
            </>
          )}
          {!isEditing && initialData.videoUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit video
            </>
          )}
        </Button>
      </div>

      {/* Display mode */}
      {!isEditing && (
        !playerSources || playerSources.length === 0 ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <Video className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            <LimeplayVideoPlayer
              title={initialData.title}
              videoSources={playerSources}
              layout="fill"
            />
          </div>
        )
      )}

      {/* Edit mode */}
      {isEditing && (
        <div>
          <div className="flex items-center gap-x-2">
            <Button
              type="button"
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("upload")}
            >
              Upload
            </Button>
            <Button
              type="button"
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("url")}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Video URL
            </Button>
          </div>

          {mode === "upload" && (
            <>
              <FileUpload
                endpoint="chapterVideo"
                onChange={(url) => {
                  if (url) {
                    save({ videoUrl: url });
                  }
                }}
              />
              <div className="text-xs text-muted-foreground mt-4">
                Upload the video for this chapter.
              </div>
            </>
          )}

          {mode === "url" && (
            <div className="mt-4 space-y-4">
              <Input
                placeholder="https://example.com/video.mp4 or a YouTube link"
                value={embedUrl}
                disabled={isSaving}
                onChange={(e) => setEmbedUrl(e.target.value)}
              />
              <div className="flex items-center gap-x-2">
                <Button
                  type="button"
                  disabled={!isPlayableVideoUrl(embedUrl) || isSaving}
                  onClick={() => save({ videoUrl: embedUrl })}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a direct link to a video file (.mp4, .webm) or a YouTube link.
                It is played with the built-in player — no ads, no external embeds.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Streaming URLs — multiple playable options for the same video */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Streaming URLs
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Add alternative streams (quality, mirror, HLS/MP4) — viewers can switch between them
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStream}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add stream
          </Button>
        </div>

        {streams.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-3">
            No streaming URLs added yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {streams.map((row, index) => (
              <div key={row.id ?? `new-${index}`} className="flex items-center gap-x-2">
                <Input
                  placeholder="https://example.com/video.m3u8 or .mp4"
                  value={row.src}
                  disabled={isSaving}
                  onChange={(e) => updateStream(index, { src: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Label (optional)"
                  value={row.title ?? ""}
                  disabled={isSaving}
                  onChange={(e) => updateStream(index, { title: e.target.value })}
                  className="w-40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStream(index)}
                  disabled={isSaving}
                  aria-label="Remove stream"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            onClick={saveStreams}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save streaming options
          </Button>
        </div>
      </div>

      {initialData.videoUrl && !isEditing && (
        <div className="text-xs text-muted-foreground mt-2">
          The video may take a few minutes to be processed. Refresh the page if the video does not appear.
        </div>
      )}
    </div>
  )
}
