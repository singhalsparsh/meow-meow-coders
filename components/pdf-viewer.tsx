"use client";

// A proper in-app PDF viewer (react-pdf / pdf.js) instead of the browser's
// default built-in PDF chrome. The actual rendering lives in ./pdf-document,
// which is loaded client-only (ssr:false) because pdfjs-dist touches the DOM.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const PdfDocument = dynamic(
  () => import("./pdf-document").then((m) => m.PdfDocument),
  { ssr: false, loading: () => <PdfLoading /> }
);

function PdfLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface PdfViewerProps {
  url: string;
  title: string;
}

export const PdfViewer = ({ url, title }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    setNumPages(null);
    setPage(1);
    setScale(1);
    setError(false);
  }, [url]);

  const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) =>
    setNumPages(n);

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/70 bg-muted/30">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <FileText className="h-3.5 w-3.5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-foreground">{title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
            disabled={scale <= 0.5}
            aria-label="Zoom out"
          >
            <span className="text-sm font-semibold leading-none">−</span>
          </button>
          <span className="w-12 text-center text-xs font-medium text-muted-foreground tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
            disabled={scale >= 3}
            aria-label="Zoom in"
          >
            <span className="text-sm font-semibold leading-none">+</span>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </div>
      </div>

      {/* Document body */}
      <div className="relative bg-slate-100 dark:bg-zinc-900/60 max-h-[560px] overflow-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-6">
            <p className="text-sm text-muted-foreground">
              This PDF can&rsquo;t be rendered inline (the host may block loading).
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>
          </div>
        ) : (
          <PdfDocument
            url={url}
            scale={scale}
            pageNumber={page}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setError(true)}
          />
        )}
      </div>

      {/* Page nav footer */}
      {numPages && !error && (
        <div className="flex items-center justify-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40"
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} / {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40"
            disabled={page >= numPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
