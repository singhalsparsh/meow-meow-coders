"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { formatCppSource } from "./cpp-format";
import { FONT_FAMILY, registerEditorThemes } from "./editor-themes";

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
  /** Monaco theme id (see editor-themes.ts). Defaults to LMS dark/light by system. */
  theme?: string;
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
  fontSize = 16,
  tabSize = 4,
  wordWrap = false,
  theme,
  onReady,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const themeRef = useRef<string | undefined>(theme);
  themeRef.current = theme;

  const handleMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register the C++ formatter + all editor themes once.
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
    registerEditorThemes(monaco);

    // Apply the theme immediately on mount (as well as in the effect below) so
    // the correct theme is present even if the effect runs before Monaco is up.
    const resolved =
      themeRef.current || (getSystemTheme() === "dark" ? "lms-dark" : "lms-light");
    monaco.editor.setTheme(resolved);

    onReady?.(editor);
  }, [onReady]);

  // Apply the selected theme when it changes (Monaco themes must be applied
  // after mount, so we do it in an effect that runs both on mount and later).
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const id = themeRef.current;
    // When no explicit theme is given, follow the LMS system theme.
    const resolved = id || (getSystemTheme() === "dark" ? "lms-dark" : "lms-light");
    monaco.editor.setTheme(resolved);
  }, [theme]);

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        // Pass a placeholder theme; the effect above overrides it after mount
        // with the resolved/selected theme.
        theme="lms-dark"
        onChange={(newValue) => onChange?.(newValue ?? "")}
        onMount={handleMount}
        options={{
          readOnly,
          automaticLayout: true,
          fontSize,
          fontFamily: FONT_FAMILY,
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
          guides: { bracketPairs: false, indentation: false },
          // Don't draw the bracket-match outline/underline behind the current
          // bracket pair — it reads as stray underscores under the code.
          matchBrackets: "never",
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

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
