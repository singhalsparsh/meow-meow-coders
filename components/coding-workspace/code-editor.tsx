"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { formatCppSource } from "./cpp-format";

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
  /** Editor font size in px. */
  fontSize?: number;
  /** Indentation width in spaces. */
  tabSize?: number;
  /** Soft-wrap long lines. */
  wordWrap?: boolean;
  /** Expose the raw Monaco editor instance (used for formatting etc.). */
  onReady?: (editor: any) => void;
}

export function CodeEditor({
  value,
  onChange,
  language = "cpp",
  readOnly = false,
  height = "100%",
  className,
  fontSize = 13,
  tabSize = 4,
  wordWrap = false,
  onReady,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleMount = useCallback(
    (editor: any, monaco: any) => {
      // Register a lightweight C++ formatter once. Monaco has no C++ language
      // service, so without this the "Format" action silently does nothing.
      if (!(monaco as any).__cppFormatterRegistered) {
        (monaco as any).__cppFormatterRegistered = true;
        monaco.languages.registerDocumentFormattingEditProvider("cpp", {
          provideDocumentFormattingEdits(model: any) {
            const range = model.getFullModelRange();
            const formatted = formatCppSource(model.getValue());
            return [{ range, text: formatted }];
          },
        });
      }

    // LeetCode-style neutral dark theme (VS Code "Dark+"-inspired).
    monaco.editor.defineTheme(DARK_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569cd6" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "type", foreground: "4ec9b0" },
        { token: "function", foreground: "dcdcaa" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#6e6e6e",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editor.selectionBackground": "#264f78",
        "editor.lineHighlightBackground": "#2a2d2e",
        "editorCursor.foreground": "#aeafad",
        "editorIndentGuide.background1": "#404040",
        "editorWidget.background": "#252526",
        "editorWidget.border": "#454545",
        "editorSuggestWidget.background": "#252526",
        "editorSuggestWidget.selectedBackground": "#04395e",
      },
    });

    monaco.editor.defineTheme(LIGHT_THEME, {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a737d", fontStyle: "italic" },
        { token: "keyword", foreground: "d73a49" },
        { token: "string", foreground: "032f62" },
        { token: "number", foreground: "005cc5" },
        { token: "type", foreground: "6f42c1" },
        { token: "function", foreground: "005cc5" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#24292e",
        "editorLineNumber.foreground": "#b0b6bc",
        "editorLineNumber.activeForeground": "#586069",
        "editor.selectionBackground": "#c8e1ff",
        "editor.lineHighlightBackground": "#f6f8fa",
        "editorCursor.foreground": "#044289",
        "editorIndentGuide.background1": "#e1e4e8",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#e1e4e8",
      },
    });

    monaco.editor.setTheme(resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME);
    editor.focus();
    onReady?.(editor);
  }, [resolvedTheme, onReady]);

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
          fontSize,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          tabSize,
          insertSpaces: true,
          detectIndentation: false,
          renderWhitespace: "selection",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          wordWrap: wordWrap ? "on" : "off",
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
