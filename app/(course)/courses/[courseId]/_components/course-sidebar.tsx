import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { StaticCourseTree } from "@/lib/content";
import { CourseSidebarContent, type LessonNode } from "./course-sidebar-content";

interface CourseSidebarProps {
  course: StaticCourseTree;
  progressCount: number;
};

export const CourseSidebar = async ({
  course,
  progressCount,
}: CourseSidebarProps) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  // Build the static lesson structure (no per-user data) + the server-seeded
  // progress map. The client component renders from the browser cache for
  // instant restore on revisit.
  const lessons: LessonNode[] = course.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    subChapters: chapter.subChapters.map((sub) => ({
      id: sub.id,
      title: sub.title,
    })),
  }));

  const seedProgress: Record<string, boolean> = {};
  for (const chapter of course.chapters) {
    if (chapter.userProgress?.[0]?.isCompleted) seedProgress[chapter.id] = true;
    for (const sub of chapter.subChapters) {
      if (sub.userProgress?.[0]?.isCompleted) seedProgress[sub.id] = true;
    }
  }

  return (
    <CourseSidebarContent
      courseTitle={course.title}
      courseId={course.id}
      userId={userId}
      lessons={lessons}
      seedProgress={seedProgress}
    />
  );
}
