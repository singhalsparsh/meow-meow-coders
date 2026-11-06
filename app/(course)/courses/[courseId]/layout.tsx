import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";
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

  if (staticCourse) {
    // Static path: content from the snapshot, only per-user progress from the DB.
    const topics = staticCourse.chapters.filter(
      (ch) => ch.parentId === null && ch.isPublished,
    );
    const chapterIds: string[] = [];
    const treeChapters: StaticChapterTree[] = topics.map((topic) => {
      chapterIds.push(topic.id);
      const subChapters = staticCourse.chapters
        .filter((sub) => sub.parentId === topic.id && sub.isPublished)
        .map((sub) => ({ ...sub, userProgress: null }));
      for (const sub of subChapters) chapterIds.push(sub.id);
      return { ...topic, userProgress: null, subChapters };
    });

    const completedRows = await db.userProgress.findMany({
      where: { userId, chapterId: { in: chapterIds }, isCompleted: true },
      select: { chapterId: true },
    });
    const completed = new Set(completedRows.map((r) => r.chapterId));

    courseTree = {
      ...staticCourse,
      chapters: treeChapters.map((topic) => ({
        ...topic,
        userProgress: completed.has(topic.id) ? [{ isCompleted: true }] : null,
        subChapters: topic.subChapters.map((sub) => ({
          ...sub,
          userProgress: completed.has(sub.id) ? [{ isCompleted: true }] : null,
        })),
      })),
    };

    progressCount =
      chapterIds.length === 0
        ? 0
        : Math.round((completed.size / chapterIds.length) * 100);
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
