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

  return (
    <div className="h-full flex flex-col overflow-y-auto py-3">
      <div className="px-4 pb-4 pt-2">
        <h1 className="font-semibold text-base truncate px-3">
          {course.title}
        </h1>
        <div className="mt-4 px-3">
          <CourseProgress
            variant="success"
            value={progressCount}
          />
        </div>
      </div>
      <div className="flex flex-col w-full px-3 gap-1 flex-1">
        {course.chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className="animate-in fade-in slide-in-from-left-2"
            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
          >
            <CourseSidebarItem
              id={chapter.id}
              label={chapter.title}
              isCompleted={!!chapter.userProgress?.[0]?.isCompleted}
              courseId={course.id}
              isLocked={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}