import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { db } from "@/lib/db";
import { findStaticCourse } from "@/lib/content"
import { isCourseFresh } from "@/actions/course-freshness";

type CourseRedirectSource = {
  id: string;
  userId: string;
  isPublished: boolean;
  chapters: {
    id: string;
    isPublished: boolean;
    position: number;
    parentId: string | null;
  }[];
};

const CourseIdPage = async (
    props: {
        params: Promise<{ courseId: string }>
    }
) => {
    const params = await props.params;
    const { userId } = await auth()

    // Course content is static; only fall back to the DB for content that is
    // not yet in the static snapshot or has been edited since the last export.
    const staticCourse = findStaticCourse(params.courseId);
    const fresh = staticCourse ? await isCourseFresh(params.courseId) : false;
    let course: CourseRedirectSource | null =
      staticCourse && fresh ? staticCourse : null;

    if (!course) {
        course = await db.course.findUnique({
            where: { id: params.courseId },
            include: {
                chapters: { orderBy: { position: "asc" } },
            },
        });
    }

    if (!course) {
        return redirect("/")
    }

    const isOwner = !!userId && course.userId === userId

    // Unpublished courses are invisible to everyone except the owner.
    if (!course.isPublished && !isOwner) {
        return redirect("/")
    }

    // Always start the course at the beginning: the first published top-level
    // topic, and if it has published subchapters, its first subchapter. This is
    // deterministic regardless of how the raw chapters array is ordered, so
    // opening a course never lands on an arbitrary later section.
    const published = course.chapters.filter((chapter) => chapter.isPublished);
    const byPosition = (a: { position: number; id: string }, b: { position: number; id: string }) =>
      a.position - b.position || a.id.localeCompare(b.id);

    const topics = published
      .filter((chapter) => !chapter.parentId)
      .sort(byPosition);
    const firstTopic = topics[0];

    const subChapters = published
      .filter((chapter) => chapter.parentId === firstTopic?.id)
      .sort(byPosition);

    const startChapter = subChapters[0] ?? firstTopic;

    if (!startChapter) {
        return redirect("/")
    }

    return redirect(`/courses/${course.id}/chapters/${startChapter.id}`)
}

export default CourseIdPage
