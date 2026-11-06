"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

import {
  SearchModal,
  type SearchResult,
} from "@/components/ui/search-modal";

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
          "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <MagnifyingGlass weight="bold" className="h-4 w-4" />
      </button>

      <SearchModal
        modal
        open={open}
        onOpenChange={setOpen}
        hotkey="k"
        results={NAV_RESULTS}
        quickActions={[]}
        files={[]}
        onQueryChange={handleQueryChange}
        onSelectResult={(result) => {
          if (result.href) router.push(result.href);
        }}
      />
    </>
  );
}
