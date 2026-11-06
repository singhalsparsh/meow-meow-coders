"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

import {
  SearchModal,
  type SearchResult,
} from "@/components/ui/search-modal";

// The app uses fixed layers up to z-[70] (course sidebar toggle) and the
// navbar at z-50/z-[60]; render the search modal above all of them.
const MODAL_OVERLAY_CLASS =
  "z-[100]";

const NAV_RESULTS: SearchResult[] = [
  { name: "All courses", meta: "Browse the full catalog", href: "/" },
  { name: "Explore / Search", meta: "Filter by category & title", href: "/search" },
  { name: "Teacher dashboard", meta: "Manage your courses", href: "/teacher/courses" },
];

interface SearchModalTriggerProps {
  className?: string;
}

/**
 * Replaces the old inline `SearchInput` with the Vengeance UI Search Modal.
 *
 * The modal is a command-palette overlay (⌘K / Ctrl+K) that:
 *  - offers quick navigation to common pages,
 *  - live-routes the typed query to the existing `/search?title=…` page so the
 *    server-side course filtering keeps working exactly as before.
 */
export function SearchModalTrigger({ className }: SearchModalTriggerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim();
      router.push(q ? `/search?title=${encodeURIComponent(q)}` : "/search");
    }, 250);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        title="Search (⌘K)"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <MagnifyingGlass weight="bold" className="h-4 w-4" />
        <span className="hidden lg:inline">Search…</span>
      </button>

      <SearchModal
        modal
        open={open}
        onOpenChange={setOpen}
        hotkey="k"
        results={NAV_RESULTS}
        quickActions={[]}
        files={[]}
        overlayClassName={MODAL_OVERLAY_CLASS}
        onQueryChange={handleQueryChange}
        onSelectResult={(result) => {
          if (result.href) router.push(result.href);
        }}
      />
    </>
  );
}
