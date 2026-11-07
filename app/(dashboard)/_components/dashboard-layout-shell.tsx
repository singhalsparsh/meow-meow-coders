"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "./navbar";

/**
 * Client shell for the teacher dashboard layout. Owns the collapsible left
 * sidebar state and lays out the fixed navbar, the floating sidebar and the
 * main content area. The toggle is a shadcn <Button /> rendered into the
 * navbar's leading slot on md+ screens; on mobile the MobileSidebar remains
 * the navigation entry point.
 */
export function DashboardLayoutShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
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

  // Original expanded insets: navbar `md:pl-56` (224px) and main
  // `md:pl-[244px]`. Collapsing clears both so content takes the full width.
  const navbarInset = isMd && !collapsed ? 224 : 0;
  const mainInset = isMd && !collapsed ? 244 : 0;

  const toggle = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={() => setCollapsed((v) => !v)}
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
      className="h-9 w-9 text-muted-foreground hidden md:inline-flex shrink-0"
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="h-full">
      {/* Fixed top navbar */}
      <div
        className="h-[80px] fixed inset-y-0 w-full z-50 transition-[padding-left] duration-300 ease-out"
        style={{ paddingLeft: navbarInset }}
      >
        <Navbar leading={toggle} />
      </div>

      {/* Collapsible left sidebar */}
      {isMd && !collapsed && (
        <div className="hidden md:flex h-[calc(100%-24px)] w-[220px] flex-col fixed top-3 left-3 bottom-3 z-50">
          <div className="h-full rounded-2xl overflow-hidden glass-sidebar border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.3)]">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="h-full bg-page-gradient pt-[80px] transition-[padding-left] duration-300 ease-out"
        style={{ paddingLeft: mainInset }}
      >
        {children}
      </main>
    </div>
  );
}
