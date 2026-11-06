import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { getSnapshotVersion } from "@/lib/content";

/**
 * Checks whether the static snapshot for a course is up to date with the live
 * database. The snapshot records the newest updatedAt across the course and all
 * its nested content at export time. If the DB has anything newer (a teacher
 * edited content since the last export), this returns false so the server falls
 * back to reading from the database — making the edit appear to every student
 * without a redeploy. When it returns true, the static snapshot is safe to use.
 *
 * The check is a set of small, indexed aggregates; the result is cached briefly
 * (15s) to keep DB load negligible while still propagating edits quickly.
 */
async function computeCourseFresh(courseId: string): Promise<boolean> {
  const snap = getSnapshotVersion(courseId);
  if (!snap) return false; // not in the snapshot -> fall back to the DB

  const [course, chMax, attMax, vsMax, pnMax, lqMax, cpMax] =
    await Promise.all([
      db.course.findUnique({
        where: { id: courseId },
        select: { updatedAt: true },
      }),
      db.chapter.aggregate({
        where: { courseId },
        _max: { updatedAt: true },
      }),
      db.attachment.aggregate({
        where: { courseId },
        _max: { updatedAt: true },
      }),
      db.videoSource.aggregate({
        where: { chapter: { courseId } },
        _max: { updatedAt: true },
      }),
      db.pdfNote.aggregate({
        where: { chapter: { courseId } },
        _max: { updatedAt: true },
      }),
      db.leetCodeQuestion.aggregate({
        where: { chapter: { courseId } },
        _max: { updatedAt: true },
      }),
      db.codingProblem.aggregate({
        where: { chapter: { courseId } },
        _max: { updatedAt: true },
      }),
    ]);

  const times = [
    course?.updatedAt?.getTime(),
    chMax._max.updatedAt?.getTime(),
    attMax._max.updatedAt?.getTime(),
    vsMax._max.updatedAt?.getTime(),
    pnMax._max.updatedAt?.getTime(),
    lqMax._max.updatedAt?.getTime(),
    cpMax._max.updatedAt?.getTime(),
  ].filter((t): t is number => typeof t === "number");

  const latest = times.length ? Math.max(...times) : 0;
  return latest <= snap.getTime();
}

export const isCourseFresh = unstable_cache(
  (courseId: string) => computeCourseFresh(courseId),
  ["course-freshness-v1"],
  { revalidate: 15 },
);
