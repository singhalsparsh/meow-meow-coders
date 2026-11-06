"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Code,
  Eye,
  Pencil,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChapterLocal } from "@/components/hooks/use-chapter-local";

interface VideoBlogProps {
  chapterId: string;
  /** The lesson/video title shown in the editor header. */
  title?: string;
}

/**
 * Video-wise blog/notes editor. Markdown (with GFM) is stored per-chapter in
 * localStorage — no server calls. Supports a formatting toolbar and a live
 * preview toggle.
 */
export const VideoBlog = ({ chapterId, title }: VideoBlogProps) => {
  const { value: content, set: setContent } = useChapterLocal<string>(
    `${chapterId}:blog`,
    ""
  );
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const before = content.slice(0, selectionStart);
    const sel = content.slice(selectionStart, selectionEnd) || "text";
    const after = content.slice(selectionEnd);
    const next = `${before}${prefix}${sel}${suffix}${after}`;
    setContent(next);
    // Restore focus/selection after the state update.
    requestAnimationFrame(() => {
      el.focus();
      const start = before.length + prefix.length;
      el.setSelectionRange(start, start + sel.length);
    });
  };

  const insertBlock = (block: string) => {
    const el = textareaRef.current;
    const cursor = el ? el.selectionStart : content.length;
    const next =
      content.slice(0, cursor) +
      (cursor > 0 && !content.endsWith("\n\n") ? "\n\n" : "") +
      block +
      "\n\n" +
      content.slice(cursor);
    setContent(next);
    requestAnimationFrame(() => {
      el?.focus();
      const start = cursor + (cursor > 0 && !content.endsWith("\n\n") ? 2 : 0);
      el?.setSelectionRange(start, start + block.length);
    });
  };

  const commitSave = () => setSavedFlash(true);
  if (savedFlash) setTimeout(() => setSavedFlash(false), 1500);

  const toolbarBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Pencil className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-none">
              {title ? `${title}` : "Video Blog"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Write markdown notes for this video &mdash; saved in your browser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Save className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setView("edit")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "edit"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Pencil className="h-3.5 w-3.5" /> Write
            </button>
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "preview"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </div>
      </div>

      {view === "edit" ? (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 border-b border-border/70 bg-muted/30 px-2 py-1.5 flex-wrap">
            <button type="button" className={toolbarBtn} title="Bold" onClick={() => wrapSelection("**")}>
              <Bold className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Italic" onClick={() => wrapSelection("_")}>
              <Italic className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Heading" onClick={() => wrapSelection("## ", "")}>
              <Heading2 className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Link" onClick={() => wrapSelection("[", "](https://)")}>
              <Link2 className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Inline code" onClick={() => wrapSelection("`")}>
              <Code className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" className={toolbarBtn} title="Bullet list" onClick={() => insertBlock("- ")}>
              <List className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Numbered list" onClick={() => insertBlock("1. ")}>
              <ListOrdered className="h-4 w-4" />
            </button>
            <button type="button" className={toolbarBtn} title="Quote" onClick={() => insertBlock("> ")}>
              <Quote className="h-4 w-4" />
            </button>
            <span className="ml-auto text-[11px] text-muted-foreground">Markdown supported</span>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={commitSave}
            placeholder={"Write your blog / notes here…\n\nUse the toolbar for quick formatting, e.g.\n\n# Title\n\n**Bold**, _italic_, `code`\n\n- list item\n- another item\n\n> a quote"}
            className="block w-full min-h-[320px] resize-y bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 font-mono leading-relaxed"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {content.trim() ? (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none px-5 py-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Nothing written yet &mdash; switch to Write and draft your notes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
