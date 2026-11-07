// Monaco theme registry. The LMS ships a default light/dark pair tuned to the
// slate palette, plus a set of popular editor themes (VS Code‑style presets)
// selectable from the settings panel. Each theme is defined once here and
// registered lazily on the client (Monaco is browser-only).

export const FONT_FAMILY =
  "var(--font-fira-code), 'Fira Code', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface EditorThemeDef {
  id: string;
  label: string;
}

export const EDITOR_THEMES: EditorThemeDef[] = [
  { id: "lms-dark", label: "LMS Dark" },
  { id: "lms-light", label: "LMS Light" },
  { id: "vs-dark", label: "VS Dark" },
  { id: "vs", label: "VS Light" },
  { id: "one-dark-pro", label: "One Dark Pro" },
  { id: "dracula", label: "Dracula" },
  { id: "github-dark", label: "GitHub Dark" },
  { id: "github-light", label: "GitHub Light" },
  { id: "monokai", label: "Monokai" },
  { id: "solarized-dark", label: "Solarized Dark" },
  { id: "night-owl", label: "Night Owl" },
  { id: "hc-black", label: "High Contrast" },
];

/** Apply every custom theme to the Monaco instance. Built-in themes (vs,
 *  vs-dark, hc-black) are referenced directly and need no registration. */
export function registerEditorThemes(monaco: any) {
  if (!monaco?.editor?.defineTheme) return;

  monaco.editor.defineTheme("lms-dark", {
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
      "editor.background": "#0a0a0d",
      "editor.foreground": "#d4d4d4",
      "editorLineNumber.foreground": "#5b5b63",
      "editorLineNumber.activeForeground": "#c6c6c6",
      "editor.selectionBackground": "#264f78",
      "editor.lineHighlightBackground": "#17171c",
      "editorCursor.foreground": "#aeafad",
      "editorIndentGuide.background1": "#2a2a32",
      "editorWidget.background": "#1a1a24",
      "editorWidget.border": "#2a2a32",
      "editorSuggestWidget.background": "#1a1a24",
      "editorSuggestWidget.selectedBackground": "#3b2f73",
    },
  });

  monaco.editor.defineTheme("lms-light", {
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

  monaco.editor.defineTheme("one-dark-pro", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7f848e", fontStyle: "italic" },
      { token: "keyword", foreground: "c678dd" },
      { token: "string", foreground: "98c379" },
      { token: "number", foreground: "d19a66" },
      { token: "type", foreground: "e5c07b" },
      { token: "function", foreground: "61afef" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorLineNumber.foreground": "#4b5263",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editor.selectionBackground": "#3e4451",
      "editor.lineHighlightBackground": "#2c313a",
      "editorCursor.foreground": "#528bff",
      "editorIndentGuide.background1": "#3b4048",
    },
  });

  monaco.editor.defineTheme("dracula", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "keyword", foreground: "ff79c6" },
      { token: "string", foreground: "f1fa8c" },
      { token: "number", foreground: "bd93f9" },
      { token: "type", foreground: "8be9fd" },
      { token: "function", foreground: "50fa7b" },
    ],
    colors: {
      "editor.background": "#282a36",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#5a5b74",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#44475a",
      "editor.lineHighlightBackground": "#2f313f",
      "editorCursor.foreground": "#f8f8f0",
    },
  });

  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editor.selectionBackground": "#264f78",
      "editor.lineHighlightBackground": "#11161d",
      "editorCursor.foreground": "#58a6ff",
    },
  });

  monaco.editor.defineTheme("github-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7781", fontStyle: "italic" },
      { token: "keyword", foreground: "cf222e" },
      { token: "string", foreground: "0a3069" },
      { token: "number", foreground: "0550ae" },
      { token: "type", foreground: "953800" },
      { token: "function", foreground: "8250df" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1f2328",
      "editorLineNumber.foreground": "#afb8c1",
      "editorLineNumber.activeForeground": "#1f2328",
      "editor.selectionBackground": "#c8e1ff",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorCursor.foreground": "#044289",
    },
  });

  monaco.editor.defineTheme("monokai", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "keyword", foreground: "f92672" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef" },
      { token: "function", foreground: "a6e22e" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#49483e",
      "editor.lineHighlightBackground": "#2e2e29",
      "editorCursor.foreground": "#f8f8f0",
    },
  });

  monaco.editor.defineTheme("solarized-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "586e75", fontStyle: "italic" },
      { token: "keyword", foreground: "859900" },
      { token: "string", foreground: "2aa198" },
      { token: "number", foreground: "d33682" },
      { token: "type", foreground: "b58900" },
      { token: "function", foreground: "268bd2" },
    ],
    colors: {
      "editor.background": "#002b36",
      "editor.foreground": "#839496",
      "editorLineNumber.foreground": "#586e75",
      "editorLineNumber.activeForeground": "#93a1a1",
      "editor.selectionBackground": "#073642",
      "editor.lineHighlightBackground": "#073642",
      "editorCursor.foreground": "#839496",
    },
  });

  monaco.editor.defineTheme("night-owl", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "637777", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ea" },
      { token: "string", foreground: "ecc48d" },
      { token: "number", foreground: "f78c6c" },
      { token: "type", foreground: "82aaff" },
      { token: "function", foreground: "82aaff" },
    ],
    colors: {
      "editor.background": "#011627",
      "editor.foreground": "#d6deeb",
      "editorLineNumber.foreground": "#2d4052",
      "editorLineNumber.activeForeground": "#d6deeb",
      "editor.selectionBackground": "#1f3b5c",
      "editor.lineHighlightBackground": "#0b2942",
      "editorCursor.foreground": "#80a4c2",
    },
  });
}
