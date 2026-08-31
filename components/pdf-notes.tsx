"use client";

import { FileText, ExternalLink, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfNote {
  id: string;
  title: string;
  url: string;
  position: number;
}

interface PdfNotesProps {
  notes: PdfNote[];
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

export const PdfNotes = ({ notes }: PdfNotesProps) => {
  if (!notes.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          PDF Notes ({notes.length})
        </h3>
      </div>
      {notes.map((note, i) => {
        const driveEmbedUrl = getGoogleDriveEmbedUrl(note.url);
        const canEmbed = driveEmbedUrl || isPdfUrl(note.url);
        const embedUrl = driveEmbedUrl || note.url;

        return (
          <div key={note.id} className="space-y-3">
            <div className="flex items-center gap-3 p-4 glass-card rounded-2xl group">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex-shrink-0">
                <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{note.title}</span>
                </div>
              </div>
              <a
                href={note.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors no-animate"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </div>
            {canEmbed && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <iframe
                  src={embedUrl}
                  className="w-full h-[500px] border-0"
                  title={note.title}
                  allow="autoplay"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
