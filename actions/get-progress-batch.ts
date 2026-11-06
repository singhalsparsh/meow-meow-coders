import { db } from "@/lib/db";

type ProgressResult = {
  courseId: string;
  progress: number;
};

/**
 * Compute per-course progress for a user across many courses with a small,
 * fixed number of queries — avoiding the N+1 loop that previously issued two
 * round-trips per course (which hammered the DB on every dashboard/search view).
 *
 * This queries: 1) the set of published chapter ids per course, and 2) the set
 * of completed chapter ids for this user across all those chapters. Progress is
 * then derived in memory, so the cost stays flat no matter how many courses are
 * shown.
 */
export const getProgressBatch = async (
  userId: string,
  courseIds: string[],
): Promise<ProgressResult[]> => {
  if (courseIds.length === 0) return [];

  // All published chapters for these courses, grouped by course.
  const publishedChapters = await db.chapter.findMany({
    where: {
      courseId: { in: courseIds },
      isPublished: true,
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  // Map courseId -> published chapter ids.
  const publishedByCourse = new Map<string, string[]>();
  for (const ch of publishedChapters) {
    const list = publishedByCourse.get(ch.courseId) ?? [];
    list.push(ch.id);
    publishedByCourse.set(ch.courseId, list);
  }

  // All chapters the user has completed, scoped to the chapters we care about.
  const completed = await db.userProgress.findMany({
    where: {
      userId,
      isCompleted: true,
      chapterId: { in: publishedChapters.map((c) => c.id) },
    },
    select: { chapterId: true },
  });
  const completedSet = new Set(completed.map((c) => c.chapterId));

  const results: ProgressResult[] = [];
  for (const courseId of courseIds) {
    const chapterIds = publishedByCourse.get(courseId) ?? [];
    if (chapterIds.length === 0) {
      results.push({ courseId, progress: 0 });
      continue;
    }
    const completedCount = chapterIds.filter((id) => completedSet.has(id)).length;
    const pct = (completedCount / chapterIds.length) * 100;
    results.push({ courseId, progress: pct });
  }

  return results;
};
