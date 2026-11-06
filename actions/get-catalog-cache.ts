import { unstable_cache } from "next/cache";

import { staticCourses } from "@/lib/content";

/**
 * The published-course catalog (courses + category + published chapters) is
 * shared by every user and changes rarely. It now ships as static, checked-in
 * JSON (see lib/content.ts and scripts/export-content.mjs), so no per-request
 * database read is needed and the Aiven Postgres is only touched for per-user
 * state.
 *
 * We keep the unstable_cache wrapper (same signature as before) so callers are
 * unchanged; the underlying data is static regardless.
 */
export const getCachedCatalog = unstable_cache(
  async () => {
    return staticCourses;
  },
  // Cache key — bump the version when the catalog shape changes.
  ["course-catalog-v1"],
  { revalidate: 60, tags: ["course-catalog"] }
);
