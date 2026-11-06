import { Category, Chapter, Course } from "@prisma/client";

import { getProgressBatch } from "@/actions/get-progress-batch";
import { getCachedCatalog } from "@/actions/get-catalog-cache";

type CourseWithProgressWithCategory = Course & {
    category: Category;
    chapters: Chapter[];
    progress: number | null;
};

type DashboardCourses = {
    completedCourses: CourseWithProgressWithCategory[];
    coursesInProgress: CourseWithProgressWithCategory[];
}

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
    try {
        // The catalog is cached server-side (60s TTL); the per-user progress is
        // computed live so it always reflects the user's latest activity.
        const allCourses = await getCachedCatalog();

        const courses = allCourses as CourseWithProgressWithCategory[];

        const progressBatch = await getProgressBatch(
            userId,
            courses.map((c) => c.id),
        );
        const progressByCourse = new Map(
            progressBatch.map((p) => [p.courseId, p.progress]),
        );
        for (const course of courses) {
            course["progress"] = progressByCourse.get(course.id) ?? 0;
        }

        const completedCourses = courses.filter((course) => course.progress === 100);
        const coursesInProgress = courses.filter((course) => (course.progress ?? 0) < 100);

        return {
            completedCourses,
            coursesInProgress,
        }
    } catch (error) {
        console.log("[GET_DASHBOARD_COURSES]", error);
        return {
            completedCourses: [],
            coursesInProgress: [],
        }
    }
}
