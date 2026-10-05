"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Chapter pages are tall (video, description, problems), and client-side
// sidebar navigation reuses the same layout, so the browser keeps the previous
// scroll offset and the lesson opens partway down. Reset to the top on every
// route change.
export const ScrollToTop = () => {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};
