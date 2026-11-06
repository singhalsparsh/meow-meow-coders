import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
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

  // Course content is static; only per-user progress is read from the DB.
  const course = findStaticCourse(params.courseId);

  if (!course) {
    return redirect("/");
  }

  // Full published lesson tree: top-level topics -> sub-lessons.
  const topics = course.chapters.filter(
    (ch) => ch.parentId === null && ch.isPublished,
  );
  const chapterIds: string[] = [];
  const treeChapters: StaticChapterTree[] = topics.map((topic) => {
    chapterIds.push(topic.id);
    const subChapters = course.chapters
      .filter((sub) => sub.parentId === topic.id && sub.isPublished)
      .map((sub) => ({ ...sub, userProgress: null }));
    for (const sub of subChapters) chapterIds.push(sub.id);
    return { ...topic, userProgress: null, subChapters };
  });

  // One small per-user query for the whole course instead of a big join.
  const completedRows = await db.userProgress.findMany({
    where: { userId, chapterId: { in: chapterIds }, isCompleted: true },
    select: { chapterId: true },
  });
  const completed = new Set(completedRows.map((r) => r.chapterId));

  const courseTree: StaticCourseTree = {
    ...course,
    chapters: treeChapters.map((topic) => ({
      ...topic,
      userProgress: completed.has(topic.id) ? [{ isCompleted: true }] : null,
      subChapters: topic.subChapters.map((sub) => ({
        ...sub,
        userProgress: completed.has(sub.id) ? [{ isCompleted: true }] : null,
      })),
    })),
  };

  const progressCount =
    chapterIds.length === 0
      ? 0
      : Math.round((completed.size / chapterIds.length) * 100);

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
