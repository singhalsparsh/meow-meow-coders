"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChapterLocal } from "@/components/hooks/use-chapter-local";

interface PdfNote {
  id: string;
  title: string;
  url: string;
  position: number;
}

interface PdfNotesFormProps {
  initialData: { pdfNotes: PdfNote[] };
  courseId: string;
  chapterId: string;
}

function deriveTitle(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    let last = parts[parts.length - 1] ?? "";
    last = decodeURIComponent(last).replace(/\.(pdf|PDF)$/, "");
    if (last) return last.replace(/[-_]+/g, " ");
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const PdfNotesForm = ({
  initialData,
  courseId: _courseId,
  chapterId,
}: PdfNotesFormProps) => {
  // Client-side only: notes are stored in localStorage keyed by chapterId, so
  // this never hits the server (the old /api/pdf-notes POST returned 401).
  const { value: notes, set: setNotes } = useChapterLocal<PdfNote[]>(
    chapterId,
    initialData.pdfNotes ?? []
  );
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleAdd = () => {
    setIsAdding((cur) => !cur);
    if (!isAdding) setUrl("");
  };

  const onSubmit = () => {
    if (!url.trim()) {
      toast.error("PDF URL is required");
      return;
    }
    const note: PdfNote = {
      id: `local-${Date.now()}`,
      title: deriveTitle(url.trim()),
      url: url.trim(),
      position: notes.length,
    };
    setNotes([...notes, note]);
    setUrl("");
    setIsAdding(false);
    toast.success("PDF note added");
  };

  const onDelete = (noteId: string) => {
    setDeleting(noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
    toast.success("PDF note removed");
    setDeleting(null);
  };

  return (
    <div className="mt-6 glass-card rounded-2xl p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>PDF Notes</span>
        </div>
        <Button onClick={toggleAdd} variant="ghost" size="sm">
          {isAdding ? "Cancel" : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add PDF
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <div className="mt-4 space-y-3 p-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
          <Input
            placeholder="PDF URL (e.g. https://drive.google.com/file/d/...) or any direct PDF link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Just paste the PDF link — a title is picked automatically. Works with
            Google Drive, Dropbox, or any direct PDF URL.
          </p>
          <Button onClick={onSubmit} size="sm">
            Add PDF Note
          </Button>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 hover:shadow-sm transition-all group"
            >
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={note.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline truncate flex items-center gap-1.5 no-animate"
                >
                  {note.title}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              </div>
              <Button
                onClick={() => onDelete(note.id)}
                disabled={deleting === note.id}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                aria-label="Delete PDF note"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : !isAdding ? (
        <p className="text-sm text-muted-foreground mt-4">
          No PDF notes added yet. Click &quot;Add PDF&quot; to attach lecture notes or study materials.
        </p>
      ) : null}
    </div>
  );
};
