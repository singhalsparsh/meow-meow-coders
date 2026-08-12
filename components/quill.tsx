"use client"

// React-18-safe wrappers around Quill. This replaces react-quill (2.0.0) whose
// React integration throws "Failed to execute 'removeChild' on 'Node'" when the
// editor mounts/unmounts in Next.js 13 + React 18.
//
// Key difference: Quill is created ONCE inside useEffect and its DOM subtree is
// owned entirely by Quill. React only owns the outer <div> (via ref) and never
// renders children into it, so React's reconciler and Quill's DOM never fight.
// On unmount we call destroy() then let React remove the (now empty) div.

import Quill from "quill"
import { useEffect, useRef } from "react"

interface QuillEditorProps {
  value: string
  onChange: (value: string) => void
}

export const QuillEditor = ({ value, onChange }: QuillEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)

  // Keep the latest onChange without recreating Quill.
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container || quillRef.current) return

    const quill = new Quill(container, {
      theme: "snow",
      placeholder: "Write here…",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "blockquote", "code-block"],
          ["clean"],
        ],
      },
    })

    quillRef.current = quill

    // Push the initial value in without triggering a text-change loop.
    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value)
    }

    quill.on("text-change", () => {
      onChangeRef.current(quill.root.innerHTML)
    })

    return () => {
      // Quill 1.x has no public destroy(). The container div owns ALL of
      // quill's DOM (editor + toolbar), and React removes that div (and
      // everything inside it) as part of normal unmount — so we must NOT touch
      // the DOM here, or we risk the exact "removeChild is not a child of this
      // node" error. Just drop the reference.
      quillRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value changes (e.g. after a save + router.refresh) but never
  // overwrite what the user is typing.
  useEffect(() => {
    const quill = quillRef.current
    if (!quill || value === quill.root.innerHTML) return
    quill.clipboard.dangerouslyPasteHTML(value || "")
  }, [value])

  return <div ref={containerRef} />
}

interface QuillPreviewProps {
  value: string
}

export const QuillPreview = ({ value }: QuillPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || quillRef.current) return

    const quill = new Quill(container, {
      theme: "bubble",
      readOnly: true,
      modules: {
        toolbar: false,
      },
    })

    quillRef.current = quill
    quill.clipboard.dangerouslyPasteHTML(value || "")

    return () => {
      // Quill 1.x has no public destroy(). React removes the container div
      // (and quill's DOM inside it) on unmount — don't touch the DOM here.
      quillRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill || value === quill.root.innerHTML) return
    quill.clipboard.dangerouslyPasteHTML(value || "")
  }, [value])

  return <div ref={containerRef} />
}
