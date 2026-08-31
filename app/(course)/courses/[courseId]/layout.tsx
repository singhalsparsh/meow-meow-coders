import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";

import { CourseSidebar } from "./_components/course-sidebar";
import { CourseNavbar } from "./_components/course-navbar";

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

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        include: {
          userProgress: {
            where: {
              userId,
            }
          }
        },
        orderBy: {
          position: "asc"
        }
      },
    },
  });

  if (!course) {
    return redirect("/");
  }

  const progressCount = await getProgress(userId, course.id);

  return (
    <div className="h-full">
      <div className="h-[80px] md:pl-[300px] fixed inset-y-0 w-full z-50">
        <CourseNavbar
          course={course}
          progressCount={progressCount}
        />
      </div>
      <div className="hidden md:flex h-[calc(100%-24px)] w-72 flex-col fixed top-3 left-3 bottom-3 z-50">
        <div className="h-full rounded-3xl overflow-hidden glass-sidebar shadow-[0_4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-shadow duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <CourseSidebar
            course={course}
            progressCount={progressCount}
          />
        </div>
      </div>
      <main className="md:pl-[300px] pt-[80px] h-full bg-page-gradient">
        {children}
      </main>
    </div>
  )
}

export default CourseLayout