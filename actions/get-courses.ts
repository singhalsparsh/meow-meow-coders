import { Category, Course } from "@prisma/client";

import { getProgressBatch } from "@/actions/get-progress-batch";
import { getCachedCatalog } from "@/actions/get-catalog-cache";

type CourseWithProgressWithCategory = Course & {
  category: Category | null;
  chapters: { id: string }[];
  progress: number | null;
};

type GetCourses = {
  userId: string;
  title?: string;
  categoryId?: string;
};

export const getCourses = async ({
  userId,
  title,
  categoryId
}: GetCourses): Promise<CourseWithProgressWithCategory[]> => {
  try {
    // The catalog is cached server-side (60s TTL). Filter the published course
    // set in memory rather than hitting the Aiven Postgres per search. This
    // mirrors the DB semantics: `contains` matching and category equality.
    const catalog = await getCachedCatalog();

    const normalizedTitle = title?.trim().toLowerCase();
    const filtered = catalog.filter((course) => {
      if (categoryId && course.categoryId !== categoryId) return false;
      if (normalizedTitle) {
        const courseTitle = course.title.toLowerCase();
        if (!courseTitle.includes(normalizedTitle)) return false;
      }
      return true;
    });

    const courses = filtered
      .map((c) => ({
        ...c,
        category: c.category,
        chapters: c.chapters.map((ch) => ({ id: ch.id })),
      }))
      // Keep the same ordering as the original query (newest first).
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const progressBatch = await getProgressBatch(
      userId,
      courses.map((c) => c.id),
    );
    const progressByCourse = new Map(
      progressBatch.map((p) => [p.courseId, p.progress]),
    );

    const coursesWithProgress: CourseWithProgressWithCategory[] = courses.map(
      (course) => ({
        ...course,
        progress: progressByCourse.get(course.id) ?? 0,
      }),
    );

    return coursesWithProgress;
  } catch (error) {
    console.log("[GET_COURSES]", error);
    return [];
  }
}
