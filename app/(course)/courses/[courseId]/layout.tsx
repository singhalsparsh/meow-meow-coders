import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getProgress } from "@/actions/get-progress";

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
    <CourseLayoutShell
      navbar={
        <CourseNavbar course={course} progressCount={progressCount} />
      }
      sidebar={
        <CourseSidebar course={course} progressCount={progressCount} />
      }
    >
      {children}
    </CourseLayoutShell>
  )
}

export default CourseLayout