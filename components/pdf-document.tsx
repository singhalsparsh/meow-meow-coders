"use client";

// Client-only react-pdf rendering. Kept in its own module so the underlying
// pdfjs-dist library (which touches the DOM) is imported only in the browser
// via a dynamic ssr:false import — never on the server.

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfDocumentProps {
  url: string;
  scale: number;
  pageNumber: number;
  onLoadSuccess: (info: { numPages: number }) => void;
  onLoadError: () => void;
}

export const PdfDocument = ({
  url,
  scale,
  pageNumber,
  onLoadSuccess,
  onLoadError,
}: PdfDocumentProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  return (
    <Document
      file={url}
      onLoadSuccess={onLoadSuccess}
      onLoadError={onLoadError}
      options={{ cMapUrl: undefined }}
      className="flex flex-col items-center py-4 gap-3"
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        className="shadow-md bg-white rounded-md"
      />
    </Document>
  );
};
