"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
  disabled?: boolean;
}

export const ContextMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const onContextMenu = useCallback((e: MouseEvent) => {
    // Don't override default context menu on inputs/textareas
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [onContextMenu, close]);

  // Keep menu within viewport
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let { x, y } = pos;
    if (x + rect.width > window.innerWidth - pad) x = window.innerWidth - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad) y = window.innerHeight - rect.height - pad;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    setPos({ x, y });
  }, [open, pos]);

  const items: ContextMenuItem[] = [
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
    <>
      {children}
      {open && (
        <div className="fixed inset-0 z-[9999]" onContextMenu={(e) => e.preventDefault()}>
          <div
            ref={menuRef}
            className={cn(
              "fixed min-w-[220px] py-2 rounded-2xl",
              "bg-white/70 dark:bg-[#0f1423]/70",
              "backdrop-blur-2xl",
              "border border-white/30 dark:border-white/[0.08]",
              "shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.05)]",
              "animate-in fade-in zoom-in-95 duration-150"
            )}
            style={{ left: pos.x, top: pos.y }}
          >
            {items.map((item, i) =>
              item.divider ? (
                <div
                  key={`div-${i}`}
                  className="my-1 mx-3 h-px bg-black/[0.06] dark:bg-white/[0.06]"
                />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2 text-sm",
                    "text-slate-700 dark:text-slate-200",
                    "rounded-xl mx-1",
                    "transition-all duration-150",
                    "hover:bg-black/[0.06] dark:hover:bg-white/[0.06]",
                    "active:scale-[0.98]",
                    item.disabled && "opacity-40 pointer-events-none"
                  )}
                >
                  <span className="text-slate-500 dark:text-slate-400">{item.icon}</span>
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};
