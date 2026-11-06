import { getProgressBatch } from "@/actions/get-progress-batch";
import { getCachedCatalog } from "@/actions/get-catalog-cache";
import type { StaticCourse } from "@/lib/content";

type CourseWithProgress = StaticCourse & { progress: number };

type DashboardCourses = {
    completedCourses: CourseWithProgress[];
    coursesInProgress: CourseWithProgress[];
}

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
    try {
        // The catalog is static (see lib/content.ts); the per-user progress is
        // computed live so it always reflects the user's latest activity.
        const allCourses = await getCachedCatalog();

        const progressBatch = await getProgressBatch(
            userId,
            allCourses.map((c) => c.id),
        );
        const progressByCourse = new Map(
            progressBatch.map((p) => [p.courseId, p.progress]),
        );

        const courses: CourseWithProgress[] = allCourses.map((course) => ({
            ...course,
            progress: progressByCourse.get(course.id) ?? 0,
        }));

        const completedCourses = courses.filter((course) => course.progress === 100);
        const coursesInProgress = courses.filter((course) => course.progress < 100);

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
