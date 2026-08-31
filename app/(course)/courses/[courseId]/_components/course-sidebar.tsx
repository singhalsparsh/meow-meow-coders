import { auth } from "@clerk/nextjs/server";
import { Chapter, Course, UserProgress } from "@prisma/client"
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
/* import { CourseProgress } from "@/components/course-progress"; */

import { CourseSidebarItem } from "./course-sidebar-item";
import { CourseProgress } from "@/components/course-progress";

interface CourseSidebarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
    })[]
  };
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

  return (      <div className="h-full border-r border-white/20 dark:border-white/5 flex flex-col overflow-y-auto glass-sidebar">
      <div className="p-8 flex flex-col border-b">
        <h1 className="font-semibold">
          {course.title}
        </h1>
        <div className="mt-10">
          <CourseProgress
            variant="success"
            value={progressCount}
          />
        </div>
      </div>
      <div className="flex flex-col w-full">
        {course.chapters.map((chapter) => (
          <CourseSidebarItem
            key={chapter.id}
            id={chapter.id}
            label={chapter.title}
            isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
            courseId={course.id}
            isLocked={false}
          />
        ))}
      </div>
    </div>
  )
}