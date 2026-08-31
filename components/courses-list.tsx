import { Category, Course } from "@prisma/client";

import { CourseCard } from "@/components/course-card";

type CourseWithProgressWithCategory = Course & {
  category: Category | null;
  chapters: { id: string }[];
  progress: number | null;
};

interface CoursesListProps {
  items: CourseWithProgressWithCategory[];
}

export const CoursesList = ({
  items
}: CoursesListProps) => {
  return (
    <div>
      <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <CourseCard
            key={item.id}
            id={item.id}
            title={item.title}
            imageUrl={item.imageUrl!}
            chaptersLength={item.chapters.length}
            progress={item.progress}
            category={item?.category?.name!}
          />
        ))}
      </div>
      {items.length === 0 && (
        <div className="flex items-center justify-center h-96 w-full bg-no-repeat bg-cover bg-center rounded-xl" style={{ backgroundImage: "url('/no_courses.webp')" }}>
          <div className="bg-slate-50 dark:bg-slate-800/50 text-center text-xl border-slate-700 dark:border-slate-600 border-2 p-2 mt-10 z-0 drop-shadow-md rounded animate-[pulse_2s_ease-in-out_infinite] text-foreground">
            No courses found
          </div>
        </div>
      )}
    </div>
  )
}