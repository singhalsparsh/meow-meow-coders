"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Minus,
  Table,
  Braces,
  Superscript,
  Subscript,
  Eraser,
  Eye,
  EyeOff,
} from "lucide-react";

interface MarkdownWriterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolButton {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (ta: HTMLTextAreaElement, value: string) => string;
}

const ARRAY_SNIPPET = [
  "```cpp",
  "// Example input array",
  "vector<int> nums = {1, 2, 3, 4};",
  "// (or) int arr[] = {1, 2, 3, 4};",
  "```",
].join("\n");

function wrapSelection(
  ta: HTMLTextAreaElement,
  value: string,
  prefix: string,
  suffix: string,
  placeholder: string
): string {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  requestAnimationFrame(() => {
    ta.focus();
    try {
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    } catch {
      /* ignore */
    }
  });
  return next;
}

function linePrefix(
  ta: HTMLTextAreaElement,
  value: string,
  prefix: string
): string {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const block = value.slice(start, end) || "text";
  const lines = block
    .split("\n")
    .map((l) => prefix + l)
    .join("\n");
  const next = value.slice(0, start) + lines + value.slice(end);
  requestAnimationFrame(() => {
    ta.focus();
    try {
      ta.setSelectionRange(start, start + lines.length);
    } catch {
      /* ignore */
    }
  });
  return next;
}

export const MarkdownWriter = ({
  value,
  onChange,
  placeholder,
  minHeight = 160,
}: MarkdownWriterProps) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const current = () => taRef.current;

  const tools: ToolButton[] = [
    {
      label: "Bold",
      icon: Bold,
      run: (ta, v) => wrapSelection(ta, v, "**", "**", "bold text"),
    },
    {
      label: "Italic",
      icon: Italic,
      run: (ta, v) => wrapSelection(ta, v, "_", "_", "italic text"),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      run: (ta, v) => wrapSelection(ta, v, "~~", "~~", "text"),
    },
    {
      label: "Inline code",
      icon: Code,
      run: (ta, v) => wrapSelection(ta, v, "`", "`", "code"),
    },
    {
      label: "Heading 1",
      icon: Heading1,
      run: (ta, v) => linePrefix(ta, v, "# "),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      run: (ta, v) => linePrefix(ta, v, "## "),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      run: (ta, v) => linePrefix(ta, v, "### "),
    },
    {
      label: "Bullet list",
      icon: List,
      run: (ta, v) => linePrefix(ta, v, "- "),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      run: (ta, v) => linePrefix(ta, v, "1. "),
    },
    {
      label: "Quote",
      icon: Quote,
      run: (ta, v) => linePrefix(ta, v, "> "),
    },
    {
      label: "Horizontal rule",
      icon: Minus,
      run: (ta, v) => {
        const start = ta.selectionStart;
        const next = v.slice(0, start) + "\n\n---\n\n" + v.slice(start);
        return next;
      },
    },
    {
      label: "Link",
      icon: LinkIcon,
      run: (ta, v) => wrapSelection(ta, v, "[", "](https://", "link text"),
    },
    {
      label: "Image",
      icon: ImageIcon,
      run: (ta, v) => {
        const url = window.prompt("Image URL (https://…):");
        if (!url) return v;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const alt = v.slice(start, end) || "image";
        const snippet = `![${alt}](${url})`;
        const next = v.slice(0, start) + snippet + v.slice(end);
        return next;
      },
    },
    {
      label: "Code block",
      icon: Code,
      run: (ta, v) => {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = v.slice(start, end) || "// your code";
        const snippet = "```cpp\n" + selected + "\n```";
        const next = v.slice(0, start) + snippet + v.slice(end);
        requestAnimationFrame(() => {
          ta.focus();
          try {
            ta.setSelectionRange(start, start + snippet.length);
          } catch {
            /* ignore */
          }
        });
        return next;
      },
    },
    {
      label: "Insert example array",
      icon: Braces,
      run: (ta, v) => {
        const start = ta.selectionStart;
        const next =
          v.slice(0, start) + "\n" + ARRAY_SNIPPET + "\n" + v.slice(start);
        return next;
      },
    },
    {
      label: "Superscript (power)",
      icon: Superscript,
      run: (ta, v) => wrapSelection(ta, v, "^", "", "2"),
    },
    {
      label: "Subscript",
      icon: Subscript,
      run: (ta, v) => wrapSelection(ta, v, "_", "", "i"),
    },
    {
      label: "Table",
      icon: Table,
      run: (ta, v) => {
        const snippet = [
          "| Input | Output |",
          "| ----- | ------ |",
          "| [1,2] | 3 |",
        ].join("\n");
        const start = ta.selectionStart;
        const next = v.slice(0, start) + "\n" + snippet + "\n" + v.slice(start);
        return next;
      },
    },
    {
      label: "Clear formatting",
      icon: Eraser,
      run: (ta, v) => {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = (v.slice(start, end) || "text")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/(^|\W)_(.*?)_(?=\W|$)/g, "$1$2");
        const next = v.slice(0, start) + selected + v.slice(end);
        return next;
      },
    },
  ];

  const runTool = (tool: ToolButton) => {
    const ta = current();
    if (!ta) return;
    const next = tool.run(ta, value);
    if (next !== value) onChange(next);
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-zinc-700">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => runTool(tool)}
            title={tool.label}
            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          title={preview ? "Edit" : "Preview"}
          className={cn(
            "ml-auto rounded p-1.5 transition-colors",
            preview
              ? "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-white"
              : "text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          )}
        >
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {preview ? (
        <div className="min-h-[120px] rounded-b-md bg-white/60 p-3 text-sm text-slate-700 dark:bg-zinc-900/50 dark:text-slate-200">
          <pre className="whitespace-pre-wrap font-mono text-xs">{value || "Nothing to preview yet."}</pre>
        </div>
      ) : (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          style={{ minHeight: `${minHeight}px` }}
          className="block w-full resize-y bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:bg-zinc-950 dark:text-slate-200 dark:placeholder:text-slate-600"
        />
      )}
    </div>
  );
};
