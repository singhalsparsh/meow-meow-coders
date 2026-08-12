"use client";

import dynamic from "next/dynamic";
import "quill/dist/quill.bubble.css";

// Loaded client-only: Quill touches the DOM and must never be evaluated in the
// server bundle. See components/quill.tsx for the React-18-safe implementation.
const QuillPreview = dynamic(
  () => import("./quill").then((mod) => mod.QuillPreview),
  { ssr: false }
);

interface PreviewProps {
    value: string;
};

export const Preview = ({
    value,
}: PreviewProps) => {
    return (
        <QuillPreview value={value} />
    );
};
