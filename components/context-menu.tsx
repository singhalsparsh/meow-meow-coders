"use client";

import { useCallback, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Copy,
  Clipboard,
  Search,
  Moon,
  Sun,
  Home,
  ExternalLink,
  Download,
  Maximize,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useRouter } from "next/navigation";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ContextMenuItemDef {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
  disabled?: boolean;
}

export const ContextMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Prevent the native context menu from firing on interactable fields so the
  // custom menu's Copy/Paste keep working predictably; the shadcn trigger
  // handles everything else.
  const suppressNativeOnInputs = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable]")) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", suppressNativeOnInputs);
    return () => document.removeEventListener("contextmenu", suppressNativeOnInputs);
  }, [suppressNativeOnInputs]);

  const items: ContextMenuItemDef[] = [
    {
      label: "Back",
      icon: <ArrowLeft className="h-4 w-4" />,
      onClick: () => router.back(),
    },
    {
      label: "Forward",
      icon: <ArrowRight className="h-4 w-4" />,
      onClick: () => router.forward(),
    },
    {
      label: "Reload",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: () => window.location.reload(),
    },
    { label: "", icon: null, onClick: () => {}, divider: true },
    {
      label: "Copy",
      icon: <Copy className="h-4 w-4" />,
      onClick: () => {
        const sel = window.getSelection()?.toString();
        if (sel) navigator.clipboard.writeText(sel);
      },
    },
    {
      label: "Paste",
      icon: <Clipboard className="h-4 w-4" />,
      onClick: () => {
        navigator.clipboard.readText().then((t) => {
          document.execCommand("insertText", false, t);
        }).catch(() => {});
      },
    },
    { label: "", icon: null, onClick: () => {}, divider: true },
    {
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      onClick: () => router.push("/"),
    },
    {
      label: "Search courses",
      icon: <Search className="h-4 w-4" />,
      onClick: () => router.push("/search"),
    },
    {
      label: theme === "dark" ? "Light mode" : "Dark mode",
      icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    { label: "", icon: null, onClick: () => {}, divider: true },
    {
      label: "Open in new tab",
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: () => window.open(window.location.href, "_blank"),
    },
    {
      label: "View page source",
      icon: <Download className="h-4 w-4" />,
      onClick: () => window.open(`view-source:${window.location.href}`, "_blank"),
    },
    {
      label: "Fullscreen",
      icon: <Maximize className="h-4 w-4" />,
      onClick: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      },
    },
  ];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="contents">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[220px]">
        {items.map((item, i) =>
          item.divider ? (
            <ContextMenuSeparator key={`div-${i}`} />
          ) : (
            <ContextMenuItem
              key={item.label}
              disabled={item.disabled}
              onSelect={() => {
                item.onClick();
              }}
            >
              <span className="text-muted-foreground">{item.icon}</span>
              {item.label}
            </ContextMenuItem>
          )
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
