import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";

// Self-hosted DM Sans (Next 16 / Turbopack cannot resolve the Google-hosted
// `next/font/google` module at build time, so we bundle the TTF files and use
// `next/font/local` instead).
const dmSans = localFont({
  src: [
    { path: "../public/fonts/dm-sans-400.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/dm-sans-500.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/dm-sans-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-dm-sans",
});
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toaster-provider";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { ContextMenuProvider } from "@/components/context-menu";
import { enUS } from "@clerk/localizations";

export const metadata: Metadata = {
  title: "Course Crafter",
  description: "Online courses: learn what you want, at your own pace | Course Crafter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={enUS}>
      {/* lang="en" + translate="no": the UI is English now, and this stops the
          browser's auto-translate from rewriting the DOM (which previously broke
          React hydration and caused "removeChild is not a child of this node"). */}
      <html lang="en" translate="no" suppressHydrationWarning>
        <body className={`${dmSans.variable} ${dmSans.className}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConfettiProvider />
            <ToastProvider />
            <ContextMenuProvider>
              {children}
            </ContextMenuProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
