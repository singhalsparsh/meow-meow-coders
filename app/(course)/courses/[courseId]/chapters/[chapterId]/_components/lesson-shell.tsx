"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Play,
  Code2,
  Terminal,
  FileText,
  Paperclip,
  LayoutGrid,
  X,
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { VideoPlayer } from "./video-player";
import { CourseProgressButton } from "./course-progress-button";
import { ChapterNav } from "./chapter-nav";
import { Preview } from "@/components/preview";
import { LeetcodeQuestions } from "@/components/leetcode-questions";
import { PdfNotes } from "@/components/pdf-notes";
import { VideoBlogViewer } from "@/components/video-blog-viewer";
import { DifficultyBadge } from "@/components/coding-workspace/badges";

type ViewMode = "video" | "coding" | "practice" | "pdf" | "blog";

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
  /** Used to keep the browser-side progress cache keyed per user. */
  userId?: string;
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

const VALID_TABS: ViewMode[] = ["video", "coding", "practice", "pdf", "blog"];

function LessonShellContent({
  courseTitle,
  chapterTitle,
  description,
  courseId,
  chapterId,
  nextChapterId,
  previousChapter,
  nextChapter,
  isOwner,
  userId,
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
}: LessonShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Allow deep-linking to a specific tab (e.g. `?tab=coding` from the "Back
  // to questions" link on the problem page).
  const tabParam = searchParams.get("tab");
  const [mode, setMode] = useState<ViewMode>(() =>
    VALID_TABS.includes(tabParam as ViewMode) ? (tabParam as ViewMode) : "video"
  );
  const [dockOpen, setDockOpen] = useState(false);

  const modes = [
    { id: "video" as const, label: "Video", icon: Play, count: null },
    { id: "coding" as const, label: "Coding Questions", icon: Code2, count: codingProblems.length },
    { id: "practice" as const, label: "Extra Practice", icon: BrainCircuit, count: leetcodeQuestions.length },
    { id: "pdf" as const, label: "PDF Notes", icon: FileText, count: pdfNotes.length },
    { id: "blog" as const, label: "Blog", icon: BookOpen, count: null },
  ];

  const selectMode = (id: ViewMode) => {
    setMode(id);
    setDockOpen(false);
    // Keep the active tab in the URL so back/forward and deep links (from the
    // problem page) land on the right section.
    const params = new URLSearchParams(searchParams.toString());
    if (id === "video") params.delete("tab");
    else params.set("tab", id);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="truncate">{courseTitle}</span>
          </Link>
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
            userId={userId}
          />
        )}
      </div>

      {/* Back to lesson (visible whenever a non-video tab is open) */}
      {mode !== "video" && (
        <button
          type="button"
          onClick={() => selectMode("video")}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to lesson
        </button>
      )}

      {/* Main stage */}
      <div className="min-w-0">
        {mode === "video" && (
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
        )}

        {mode === "coding" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {codingProblems.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptyState
                  icon={Terminal}
                  title="No coding questions yet"
                  hint="Coding challenges for this chapter will appear here."
                />
              </div>
            ) : (
              codingProblems.map((problem) => (
                <Link
                  key={problem.id}
                  href={`/courses/${courseId}/chapters/${chapterId}/problems/${problem.id}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Code2 className="h-4 w-4 text-primary" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground leading-snug">
                    {problem.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <span className="text-xs text-muted-foreground">
                      {problem.timeLimitMs} ms
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Open in the full-screen editor with resizable panes
                  </p>
                </Link>
              ))
            )}
          </div>
        )}

        {mode === "practice" && (
          <div className="space-y-6">
            {leetcodeQuestions.length === 0 ? (
              <EmptyState
                icon={BrainCircuit}
                title="No extra practice yet"
                hint="Extra practice questions for this chapter will appear here."
              />
            ) : (
              <LeetcodeQuestions questions={leetcodeQuestions} />
            )}
          </div>
        )}

        {mode === "pdf" && (
          <div className="space-y-6">
            {pdfNotes.length === 0 && !chapterId ? (
              <EmptyState
                icon={FileText}
                title="No PDF notes yet"
                hint="Reading material for this chapter will appear here."
              />
            ) : (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <PdfNotes notes={pdfNotes} chapterId={chapterId} />
              </section>
            )}
          </div>
        )}

        {mode === "blog" && (
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <VideoBlogViewer chapterId={chapterId} title={chapterTitle} />
          </section>
        )}
      </div>

      <ChapterNav
        courseId={courseId}
        previousChapter={previousChapter}
        nextChapter={nextChapter}
      />

      {/* Floating dock: pinned to the right-middle of the viewer content area
          (below the 80px navbar, so centered on it = viewport half + 40px) */}
      <div className="fixed right-0 top-[calc(50%+40px)] z-40 -translate-y-1/2 flex items-stretch">
        {!dockOpen && (
          <button
            type="button"
            onClick={() => setDockOpen(true)}
            aria-label="Open lesson menu"
            title="Open lesson menu"
            className="flex h-12 w-12 items-center justify-center rounded-l-xl border border-r-0 border-border bg-card text-muted-foreground shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-colors hover:text-foreground hover:bg-accent"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
        )}

        {dockOpen && (
          <div className="mr-3 w-72 rounded-2xl border border-border bg-card p-3 shadow-[0_12px_40px_rgba(0,0,0,0.18)] animate-in slide-in-from-right-4 fade-in duration-200">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-sm font-semibold text-foreground">Lesson content</p>
              <button
                type="button"
                onClick={() => setDockOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close lesson menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMode(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    mode === m.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <m.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{m.label}</span>
                  {m.count !== null && m.count > 0 && (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                        mode === m.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!!attachments.length && (
              <>
                <div className="my-3 h-px bg-border" />
                <p className="flex items-center gap-2 px-2 pb-2 text-xs font-medium text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments
                </p>
                <div className="space-y-1.5">
                  {attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const LessonShell = (props: LessonShellProps) => (
  <Suspense fallback={null}>
    <LessonShellContent {...props} />
  </Suspense>
);

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Play;
  title: string;
  hint: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{hint}</p>
    </section>
  );
}
