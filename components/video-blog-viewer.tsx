"use client";

// Read-only rendering of a chapter's blog. Blogs are authored exclusively in
// the course editor (see video-blog-form) and are simply displayed here.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, FileText } from "lucide-react";
import { useChapterLocal } from "@/components/hooks/use-chapter-local";

interface VideoBlogViewerProps {
  chapterId: string;
  /** The lesson/video title shown in the header. */
  title?: string;
}

export const VideoBlogViewer = ({ chapterId, title }: VideoBlogViewerProps) => {
  // Same localStorage key that the course-editor form writes to.
  const { value: content } = useChapterLocal<string>(`${chapterId}:blog`, "");

  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Eye className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No blog written for this video yet.</p>
        <p className="text-xs text-muted-foreground/70">
          A blog is published from the course editor.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-3.5 w-3.5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-foreground leading-none">
          {title || "Blog"}
        </h3>
      </div>
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
