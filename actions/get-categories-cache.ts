import { unstable_cache } from "next/cache";

import { staticCategories } from "@/lib/content";

/**
 * Categories are a small, nearly-static lookup table used by the search page
 * (and the teacher course form). They now ship as static JSON, so we return
 * them directly instead of hitting the Aiven Postgres.
 */
export const getCachedCategories = unstable_cache(
  async () => {
    return staticCategories;
  },
  ["categories-v1"],
  { revalidate: 300, tags: ["categories"] }
);
