"use client"

import dynamic from "next/dynamic"
import "quill/dist/quill.snow.css"

// Loaded client-only: Quill touches the DOM and must never be evaluated in the
// server bundle. See components/quill.tsx for the React-18-safe implementation.
const QuillEditor = dynamic(
  () => import("./quill").then((mod) => mod.QuillEditor),
  { ssr: false }
)

interface EditorProps {
    onChange: (value: string) => void;
    value: string;
}

export const Editor = ({
    onChange,
    value,
}: EditorProps) => {
    return (
        <div className="bg-white dark:bg-slate-900">
            <QuillEditor
                value={value}
                onChange={onChange}
            />
        </div>
    )
}
