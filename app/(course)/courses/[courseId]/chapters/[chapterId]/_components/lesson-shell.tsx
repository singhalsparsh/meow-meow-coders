"use client";

import { useState } from "react";
import { Play, Code2, Paperclip, FileText, MonitorPlay, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

import { VideoPlayer } from "./video-player";
import { CourseProgressButton } from "./course-progress-button";
import { ChapterNav } from "./chapter-nav";
import { Preview } from "@/components/preview";
import { LeetcodeQuestions } from "@/components/leetcode-questions";
import { PdfNotes } from "@/components/pdf-notes";
import { CodingWorkspace } from "@/components/coding-workspace/coding-workspace";

type ViewMode = "video" | "practice";

interface Attachment {
  id: string;
  name: string;
  url: string;
}

interface LessonShellProps {
  courseTitle: string;
  chapterTitle: string;
  description: string | null;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  previousChapter: { id: string; title: string } | null;
  nextChapter: { id: string; title: string } | null;
  isOwner: boolean;
  isCompleted: boolean;
  playbackId: string;
  videoUrl?: string;
  videoSources: any[];
  isLocked: boolean;
  completeOnEnd: boolean;
  attachments: Attachment[];
  pdfNotes: any[];
  leetcodeQuestions: any[];
  codingProblems: any[];
}

export const LessonShell = ({
  courseTitle,
  chapterTitle,
  description,
  courseId,
  chapterId,
  nextChapterId,
  previousChapter,
  nextChapter,
  isOwner,
  isCompleted,
  playbackId,
  videoUrl,
  videoSources,
  isLocked,
  completeOnEnd,
  attachments,
  pdfNotes,
  leetcodeQuestions,
  codingProblems,
}: LessonShellProps) => {
  const [mode, setMode] = useState<ViewMode>("video");

  const practiceCount = codingProblems.length + leetcodeQuestions.length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {courseTitle}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
            {chapterTitle}
          </h1>
        </div>
        {!isOwner && (
          <CourseProgressButton
            chapterId={chapterId}
            courseId={courseId}
            nextChapterId={nextChapterId}
            isCompleted={isCompleted}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main stage */}
        <div className="min-w-0">
          {mode === "video" ? (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-12px_rgba(0,0,0,0.2)]">
                <VideoPlayer
                  chapterId={chapterId}
                  title={chapterTitle}
                  courseId={courseId}
                  nextChapterId={nextChapterId}
                  playbackId={playbackId}
                  videoUrl={videoUrl}
                  videoSources={videoSources}
                  isLocked={isLocked}
                  completeOnEnd={completeOnEnd}
                />
              </div>

              {description && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-lg font-semibold tracking-tight mb-3">About this lesson</h2>
                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                    <Preview value={description} />
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {practiceCount === 0 ? (
                <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
                  <Terminal className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No practice questions have been added to this lesson yet.
                  </p>
                </section>
              ) : (
                <>
                  {!!leetcodeQuestions.length && (
                    <LeetcodeQuestions questions={leetcodeQuestions} />
                  )}
                  {codingProblems.map((problem, index) => (
                    <section
                      key={problem.id}
                      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Code2 className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {"Coding Challenge" + (codingProblems.length > 1 ? " " + (index + 1) : "")}
                        </h3>
                      </div>
                      <CodingWorkspace
                        problem={problem}
                        submissions={problem.submissions}
                        apiBase={`/api/courses/${courseId}/chapters/${chapterId}`}
                      />
                    </section>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="min-w-0 space-y-6">
          {/* View switcher */}
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("video")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  mode === "video"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Play className="h-4 w-4" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setMode("practice")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  mode === "practice"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code2 className="h-4 w-4" />
                Practice
                {practiceCount > 0 && (
                  <span className="rounded-full bg-primary/10 text-primary px-1.5 text-[11px] font-semibold">
                    {practiceCount}
                  </span>
                )}
              </button>
            </div>
            <p className="px-2 pt-3 pb-1 text-xs text-muted-foreground">
              {mode === "video"
                ? "Watch the lesson video for this chapter."
                : "Work through the practice questions for this chapter."}
            </p>
          </div>

          {/* PDF notes */}
          {!!pdfNotes.length && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 px-1 pt-1 pb-3">
                <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Reading material</h3>
              </div>
              <PdfNotes notes={pdfNotes} />
            </div>
          )}

          {/* Attachments */}
          {!!attachments.length && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 px-1 pt-1">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Attachments
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                  {attachments.length}
                </span>
              </h3>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 w-full rounded-xl border border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{attachment.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <ChapterNav
        courseId={courseId}
        previousChapter={previousChapter}
        nextChapter={nextChapter}
      />
    </div>
  );
};
