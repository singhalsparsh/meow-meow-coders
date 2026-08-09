import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

const CourseIdPage = async (
    props: {
        params: Promise<{ courseId: string }>
    }
) => {
    const params = await props.params;
    const { userId } = await auth()

    const course = await db.course.findUnique({
        where: {
            id: params.courseId,
        },
        include: {
            chapters: {
                orderBy: {
                    position: "asc"
                }
            }
        }
    })

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
