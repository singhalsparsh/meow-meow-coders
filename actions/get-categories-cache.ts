import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * Categories are a small, nearly-static lookup table used by the search page
 * (and the teacher course form). Fetch once and reuse for a short TTL instead
 * of hitting the Aiven Postgres on every request.
 */
export const getCachedCategories = unstable_cache(
  async () => {
    return db.category.findMany({
      orderBy: { name: "asc" },
    });
  },
  ["categories-v1"],
  { revalidate: 300, tags: ["categories"] }
);
