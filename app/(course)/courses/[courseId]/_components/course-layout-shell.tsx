"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface CourseLayoutShellProps {
  navbar: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Client shell for the course pages. Owns the collapsible left sidebar state
 * and lays out the fixed navbar, the floating ` and the main content area.
 * The navbar / sidebar are composed by the server layout and passed in as
 * React nodes, so this shell only controls geometry — it needs no data.
 */
export function CourseLayoutShell({ navbar, sidebar, children }: CourseLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  // Only apply the sidebar inset on md+ screens; on portrait phones the sidebar
  // is hidden, so content must use the full width.
  const [isMd, setIsMd] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMd(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Sidebar is w-72 (288px) anchored at left-3 (12px), so its right edge sits
  // at 300px. When collapsed, we keep a thin rail so the toggle stays reachable.
  const sidebarWidth = collapsed ? 24 : 288; // px
  const contentInset = isMd ? (collapsed ? 48 : 316) : 0; // px (sidebar right edge + gutter)

  return (
    <div className="h-full">
      {/* Fixed top navbar */}
      <div
        className="z-[60] h-[80px] w-full fixed inset-y-0 transition-[padding-left] duration-300 ease-out"
        style={{ paddingLeft: contentInset }}
      >
        {navbar}
      </div>

      {/* Collapsible left sidebar */}
      <div
        className="z-50 hidden md:flex flex-col fixed left-3 top-3 bottom-3 overflow-hidden transition-[width] duration-300 ease-out"
        style={{ width: sidebarWidth }}
      >
        <div className="h-full overflow-hidden rounded-2xl glass-sidebar border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.3)]">
          <div className={collapsed ? "opacity-0" : "opacity-100 h-full transition-opacity duration-200"}>
            {sidebar}
          </div>
        </div>
      </div>

      {/* Toggle pinned to the sidebar's inner edge, vertically centered */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="z-[70] hidden md:inline-flex items-center justify-center w-6 h-9 rounded-r-md border border-l-0 border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:bg-accent fixed top-1/2 -translate-y-1/2"
        style={{ left: sidebarWidth + 12 }}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      {/* Main content */}
      <main
        className="h-full bg-page-gradient pt-[80px] transition-[padding-left] duration-300 ease-out"
        style={{ paddingLeft: contentInset }}
      >
        {children}
      </main>
    </div>
  );
}
