"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useCallback } from "react";

import { cn } from "@/lib/utils";

// Monaco reaches for `window` at import time and pulls a few MB of editor
// assets, so it is loaded client-side only.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950/40 text-sm text-muted-foreground">
      Loading editor…
    </div>
  ),
});

// Themes tuned to the LMS slate palette rather than Monaco's defaults.
const DARK_THEME = "lms-dark";
const LIGHT_THEME = "lms-light";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  /** Monaco language id; defaults to C++. */
  language?: string;
  readOnly?: boolean;
  height?: number | string;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "cpp",
  readOnly = false,
  height = "100%",
  className,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleMount = useCallback((editor: any, monaco: any) => {
    monaco.editor.defineTheme(DARK_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "818cf8" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "38bdf8" },
        { token: "function", foreground: "c084fc" },
      ],
      colors: {
        "editor.background": "#02061700",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editor.selectionBackground": "#1e293b",
        "editor.lineHighlightBackground": "#1e293b66",
        "editorCursor.foreground": "#38bdf8",
        "editorIndentGuide.background1": "#1e293b",
        "editorWidget.background": "#0f172a",
        "editorWidget.border": "#1e293b",
        "editorSuggestWidget.background": "#0f172a",
        "editorSuggestWidget.selectedBackground": "#1e293b",
      },
    });

    monaco.editor.defineTheme(LIGHT_THEME, {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
        { token: "keyword", foreground: "4f46e5" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "d97706" },
        { token: "type", foreground: "0284c7" },
        { token: "function", foreground: "7c3aed" },
      ],
      colors: {
        "editor.background": "#ffffff00",
        "editor.foreground": "#0f172a",
        "editorLineNumber.foreground": "#cbd5e1",
        "editorLineNumber.activeForeground": "#64748b",
        "editor.selectionBackground": "#e2e8f0",
        "editor.lineHighlightBackground": "#f1f5f9",
        "editorCursor.foreground": "#0284c7",
        "editorIndentGuide.background1": "#e2e8f0",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#e2e8f0",
      },
    });

    monaco.editor.setTheme(resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME);
    editor.focus();
  }, [resolvedTheme]);

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        theme={resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME}
        onChange={(newValue) => onChange?.(newValue ?? "")}
        onMount={handleMount}
        options={{
          readOnly,
          automaticLayout: true,
          fontSize: 13,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          tabSize: 4,
          insertSpaces: true,
          detectIndentation: false,
          renderWhitespace: "selection",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          wordWrap: "off",
          // C++ has no language service in the browser, so completion is
          // word-based from the open document — still genuinely useful.
          wordBasedSuggestions: "currentDocument",
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          formatOnPaste: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
        }}
      />
    </div>
  );
}
