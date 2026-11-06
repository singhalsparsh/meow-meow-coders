"use client";

import { useMemo, useState } from "react";
import { FileText, ExternalLink, Download, Loader2, Check } from "lucide-react";
import { useChapterLocal } from "@/components/hooks/use-chapter-local";
import { PdfViewer } from "@/components/pdf-viewer";

interface PdfNote {
  id: string;
  title: string;
  url: string;
  position: number;
}

interface PdfNotesProps {
  notes: PdfNote[];
  /** Optional: when provided, merges client-side notes for this chapter. */
  chapterId?: string;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  // Google Drive file URLs
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  // Google Drive open URLs
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
  }

  // Google Drive direct link
  const driveDirectMatch = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
  if (driveDirectMatch) {
    return `https://drive.google.com/file/d/${driveDirectMatch[1]}/preview`;
  }

  return null;
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf") || url.includes("pdf");
}

function DownloadButton({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleDownload = async () => {
    setState("loading");
    try {
      // Best-effort direct download: fetch as a blob, then save. If the host
      // blocks cross-origin reads, fall back to opening the PDF in a new tab,
      // where the browser's native viewer still offers a download control.
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        setState("done");
        setTimeout(() => setState("idle"), 2000);
        return;
      }
      throw new Error("fetch-failed");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
      disabled={state === "loading"}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Download
    </button>
  );
}

export const PdfNotes = ({ notes, chapterId }: PdfNotesProps) => {
  // Merge server-provided notes with client-side (localStorage) notes so any
  // notes added by the teacher are visible here too, without a server roundtrip.
  const local = useChapterLocal<PdfNote[]>(chapterId ?? "none", []);
  const merged = useMemo(() => {
    if (!chapterId || !local.value.length) return notes;
    const seen = new Set(notes.map((n) => n.id));
    const extra = local.value.filter((n) => !seen.has(n.id));
    return [...notes, ...extra];
  }, [notes, chapterId, local.value]);

  if (!merged.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-none">PDF Notes</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {merged.length} {merged.length === 1 ? "document" : "documents"}
          </p>
        </div>
      </div>

      {merged.map((note) => {
        const driveEmbedUrl = getGoogleDriveEmbedUrl(note.url);
        const canEmbed = driveEmbedUrl || isPdfUrl(note.url);
        const embedUrl = driveEmbedUrl || note.url;

        return (
          <div key={note.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70 bg-muted/30">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{note.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{note.url}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <DownloadButton url={note.url} title={note.title} />
                <a
                  href={note.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </div>
            </div>

            {/* Embedded reader — Google Drive uses its native preview; direct PDFs
                use the styled in-app viewer (react-pdf). */}
            {driveEmbedUrl ? (
              <iframe
                src={driveEmbedUrl}
                className="block w-full h-[440px] border-0 bg-white"
                title={`${note.title} (Google Drive preview)`}
                allow="autoplay; fullscreen"
              />
            ) : isPdfUrl(note.url) ? (
              <PdfViewer url={note.url} title={note.title} />
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  This resource can&rsquo;t be embedded inline.
                </p>
                <a
                  href={note.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
