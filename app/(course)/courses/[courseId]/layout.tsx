import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";
import { isCourseFresh } from "@/actions/course-freshness";
import {
  findStaticCourse,
  type StaticChapterTree,
  type StaticCourseTree,
} from "@/lib/content";

import { CourseSidebar } from "./_components/course-sidebar";
import { CourseNavbar } from "./_components/course-navbar";
import { CourseLayoutShell } from "./_components/course-layout-shell";

const CourseLayout = async (
  props: {
    children: React.ReactNode;
    params: Promise<{ courseId: string }>;
  }
) => {
  const params = await props.params;

  const {
    children
  } = props;

  const { userId } = await auth();

  if (!userId) {
    return redirect("/")
  }

  const staticCourse = findStaticCourse(params.courseId);

  let courseTree: StaticCourseTree;
  let progressCount: number;

  if (staticCourse && (await isCourseFresh(params.courseId))) {
    // Static path: content from the snapshot. Per-user progress is rendered
    // client-side from the browser cache (seeded once via /api/my-progress on
    // a cold cache), so we don't hit the DB for progress on every visit.
    const topics = staticCourse.chapters.filter(
      (ch) => ch.parentId === null && ch.isPublished,
    );
    const treeChapters: StaticChapterTree[] = topics.map((topic) => {
      const subChapters = staticCourse.chapters
        .filter((sub) => sub.parentId === topic.id && sub.isPublished)
        .map((sub) => ({ ...sub, userProgress: null }));
      return { ...topic, userProgress: null, subChapters };
    });

    courseTree = {
      ...staticCourse,
      chapters: treeChapters,
    };

    // The sidebar computes its own progress bar from the local cache.
    progressCount = 0;
  } else {
    // Fallback: course is not yet in the static snapshot (newly created /
    // edited), so load it from the DB with the original join + progress query.
    const dbCourse = await db.course.findUnique({
      where: { id: params.courseId },
      include: {
        chapters: {
          where: { isPublished: true, parentId: null },
          include: {
            userProgress: { where: { userId } },
            subChapters: {
              where: { isPublished: true },
              include: { userProgress: { where: { userId } } },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!dbCourse) {
      return redirect("/");
    }

    progressCount = await getProgress(userId, dbCourse.id);
    courseTree = dbCourse as unknown as StaticCourseTree;
  }

  return (
    <CourseLayoutShell
      navbar={
        <CourseNavbar course={courseTree} progressCount={progressCount} />
      }
      sidebar={
        <CourseSidebar course={courseTree} progressCount={progressCount} />
      }
    >
      {children}
    </CourseLayoutShell>
  )
}

export default CourseLayout
