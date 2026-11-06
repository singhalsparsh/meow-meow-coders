import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { db } from "@/lib/db";
import { findStaticCourse } from "@/lib/content"

type CourseRedirectSource = {
  id: string;
  userId: string;
  isPublished: boolean;
  chapters: { id: string; isPublished: boolean }[];
};

const CourseIdPage = async (
    props: {
        params: Promise<{ courseId: string }>
    }
) => {
    const params = await props.params;
    const { userId } = await auth()

    // Course content is static; only fall back to the DB for content that is
    // not yet in the static snapshot (newly created / edited courses).
    let course: CourseRedirectSource | null = findStaticCourse(params.courseId) ?? null;

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

    // Public visitors only see published chapters; the owner can preview everything.
    const chapters = isOwner
        ? course.chapters
        : course.chapters.filter((chapter) => chapter.isPublished)

    // Unpublished courses are invisible to everyone except the owner.
    if (!course.isPublished && !isOwner) {
        return redirect("/")
    }

    const firstChapter = chapters[0]

    if (!firstChapter) {
        return redirect("/")
    }

    return redirect(`/courses/${course.id}/chapters/${firstChapter.id}`)
}

export default CourseIdPage
