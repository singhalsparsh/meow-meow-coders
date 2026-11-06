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
          parentId: null,
        },
        include: {
          userProgress: {
            where: {
              userId,
            }
          },
          subChapters: {
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
              position: "asc",
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
        <div className="h-full rounded-2xl overflow-hidden glass-sidebar border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.3)] transition-shadow duration-300">
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