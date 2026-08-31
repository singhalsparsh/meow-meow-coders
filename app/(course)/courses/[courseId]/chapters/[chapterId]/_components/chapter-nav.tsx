"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterNavProps {
  courseId: string;
  previousChapter: { id: string; title: string } | null;
  nextChapter: { id: string; title: string } | null;
}

export const ChapterNav = ({
  courseId,
  previousChapter,
  nextChapter,
}: ChapterNavProps) => {
  if (!previousChapter && !nextChapter) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 md:px-6 mt-6">
      {previousChapter ? (
        <Link
          href={`/courses/${courseId}/chapters/${previousChapter.id}`}
          className={cn(
            "group flex items-center gap-3 flex-1 min-w-0",
            "glass-card rounded-2xl p-4 no-animate",
            "transition-all duration-300",
            "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
            "hover:border-slate-300 dark:hover:border-slate-600"
          )}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] group-hover:bg-sky-100 dark:group-hover:bg-sky-500/15 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
            <ChevronLeft className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Previous
            </p>
            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
              {previousChapter.title}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {nextChapter ? (
        <Link
          href={`/courses/${courseId}/chapters/${nextChapter.id}`}
          className={cn(
            "group flex items-center gap-3 flex-1 min-w-0 justify-end text-right",
            "glass-card rounded-2xl p-4 no-animate",
            "transition-all duration-300",
            "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
            "hover:border-slate-300 dark:hover:border-slate-600"
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Next
            </p>
            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
              {nextChapter.title}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] group-hover:bg-sky-100 dark:group-hover:bg-sky-500/15 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
            <ChevronRight className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
};
