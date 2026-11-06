import { Category, Course } from "@prisma/client";

import { getProgressBatch } from "@/actions/get-progress-batch";
import { db } from "@/lib/db";

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
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
        title: {
          contains: title,
        },
        categoryId,
      },
      include: {
        category: true,
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      }
    });

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