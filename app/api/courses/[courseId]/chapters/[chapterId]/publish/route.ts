import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function PATCH(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const ownCourse = await db.course.findUnique({
            where: {
                id: params.courseId,
            }
        });

        if (!ownCourse) {
            return new NextResponse("Internal error", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: params.chapterId,
                courseId: params.courseId
            }
        });

        // A video is not required to publish — a chapter may be purely coding
        // questions (or other content). Only the title is required.
        if (!chapter || !chapter.title) {
            return new NextResponse("Please fill in all required fields", { status: 400 });
        }

        const publishedChapter = await db.chapter.update({
            where: {
                id: params.chapterId,
                courseId: params.courseId,
            },
            data: {
                isPublished: true
            }
        })

        // The catalog caches published chapters per course; refresh it so the
        // published-chapter count is accurate.
        revalidateTag("course-catalog", "max");

        return NextResponse.json(publishedChapter)

    } catch (error) {
        console.log("CHAPTER_PUBLISH", error)
        return new NextResponse("Internal error", { status: 500 })
    }
}