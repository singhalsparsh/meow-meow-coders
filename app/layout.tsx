import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toaster-provider";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { ContextMenuProvider } from "@/components/context-menu";
import { enUS } from "@clerk/localizations";

const inter = Inter({ subsets: ["latin"] });

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
        <body className={inter.className}>
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
