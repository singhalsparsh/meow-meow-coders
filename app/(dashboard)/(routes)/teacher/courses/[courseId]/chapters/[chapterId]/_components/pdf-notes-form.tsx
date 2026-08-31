"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export const PdfNotesForm = ({
  initialData,
  courseId,
  chapterId,
}: PdfNotesFormProps) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [notes, setNotes] = useState(initialData.pdfNotes);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleAdd = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setTitle("");
      setUrl("");
    }
  };

  const onSubmit = async () => {
    try {
      if (!title.trim() || !url.trim()) {
        toast.error("Title and URL are required");
        return;
      }

      const res = await axios.post("/api/pdf-notes", {
        chapterId,
        title: title.trim(),
        url: url.trim(),
      });

      setNotes([...notes, res.data]);
      setTitle("");
      setUrl("");
      setIsAdding(false);
      toast.success("PDF note added");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onDelete = async (noteId: string) => {
    try {
      setDeleting(noteId);
      await axios.delete(`/api/pdf-notes/${noteId}`);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast.success("PDF note removed");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(null);
    }
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
        <div className="mt-4 space-y-3 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <Input
            placeholder="Title (e.g. Week 1 Lecture Notes)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="PDF URL (e.g. https://drive.google.com/file/d/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste a direct link to a PDF file. Works with Google Drive, Dropbox, or any direct PDF URL.
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
              className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:shadow-sm transition-all group"
            >
              <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
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
