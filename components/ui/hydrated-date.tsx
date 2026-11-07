"use client";

import { useEffect, useState } from "react";

/**
 * Renders a locale-formatted date only on the client, after hydration.
 * Avoids SSR/client mismatches caused by different timezones/locales
 * (which produce React hydration errors like "text didn't match").
 */
export function HydratedDate({
  value,
  options,
}: {
  value: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a stable placeholder on the server/first paint so the tree
    // matches. It is replaced by the formatted date right after mount.
    return <span aria-hidden>—</span>;
  }

  let formatted: string;
  try {
    formatted = new Date(value).toLocaleString(
      undefined,
      options ?? {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    formatted = "—";
  }

  return <span suppressHydrationWarning>{formatted}</span>;
}
