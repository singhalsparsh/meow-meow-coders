import localFont from "next/font/local";

// Self-hosted Fira Code (latin) for the code editor and inline code. Ligature
// support is enabled per-editor (fontLigatures: true on Monaco). This lives in
// a shared module so the <body> doesn't have to own it — the font is only
// pulled in (and preloaded) when the coding workspace actually renders.
export const firaCode = localFont({
  src: [
    { path: "../public/fonts/fira-code-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/fira-code-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/fira-code-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-fira-code",
});
