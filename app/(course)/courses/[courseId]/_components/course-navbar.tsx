import { Chapter, Course, UserProgress } from "@prisma/client"

import { NavbarRoutes } from "@/components/navbar-routes";

import { CourseMobileSidebar } from "./course-mobile-sidebar";

interface CourseNavbarProps {
  course: Course & {
    chapters: (Chapter & {
      userProgress: UserProgress[] | null;
      subChapters: (Chapter & {
        userProgress: UserProgress[] | null;
      })[];
    })[];
  };
  progressCount: number;
};

export const CourseNavbar = ({
  course,
  progressCount,
}: CourseNavbarProps) => {
  return (
    <div className="p-4 border-b border-border/70 h-full flex items-center glass transition-colors duration-300">
      <CourseMobileSidebar
        course={course}
        progressCount={progressCount}
      />
      <div className="hidden md:flex items-center min-w-0 mr-4">
        <span className="text-sm font-semibold truncate text-foreground">
          {course.title}
        </span>
      </div>
      <NavbarRoutes />      
    </div>
  )
}