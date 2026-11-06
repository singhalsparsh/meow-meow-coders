import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * The published-course catalog (courses + category + published chapters) is
 * shared by every user and changes rarely. Fetching it on every dashboard or
 * search pageview means a multi-join scan against the Aiven Postgres each time.
 *
 * We cache this full catalog server-side for a short TTL (60s) so repeated
 * pageviews hit the Next.js cache instead of the database. Per-user progress is
 * NOT cached here — it's computed separately per request to stay fresh.
 */
export const getCachedCatalog = unstable_cache(
  async () => {
    return db.course.findMany({
      where: { isPublished: true },
      include: {
        category: true,
        chapters: {
          where: { isPublished: true },
          orderBy: { position: "asc" },
        },
      },
    });
  },
  // Cache key — bump the version when the catalog shape changes.
  ["course-catalog-v1"],
  { revalidate: 60, tags: ["course-catalog"] }
);
