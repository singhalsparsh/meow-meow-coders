import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth()
        const { title, parentId } = await req.json()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const courseOwner = await db.course.findUnique({
            where: {
                id: params.courseId,
                userId: userId,
            },

        });

        if (!courseOwner) {
            return new NextResponse("Internal error", { status: 500 });
        }

        // Only one level of nesting is supported: a sub-lesson must attach to a
        // top-level topic, never to another sub-lesson.
        if (parentId) {
            const parent = await db.chapter.findUnique({
                where: {
                    id: parentId,
                    courseId: params.courseId,
                },
            });

            if (!parent) {
                return new NextResponse("Parent chapter not found", { status: 404 });
            }

            if (parent.parentId) {
                return new NextResponse("Sub-lessons cannot be nested further", { status: 400 });
            }
        }

        // Position counts up within the sibling group sharing the same parentId
        // (null for top-level topics), so ordering is independent per group.
        const lastChapter = await db.chapter.findFirst({
            where: {
                courseId: params.courseId,
                parentId: parentId ?? null,
            },
            orderBy: {
                position: "desc"
            }
        })

        const newPosition = lastChapter ? lastChapter.position + 1 : 1

        const chapter = await db.chapter.create({
            data: {
                title,
                courseId: params.courseId,
                parentId: parentId ?? null,
                position: newPosition
            }
        })

        return NextResponse.json(chapter)
    } catch (error) {
        console.log("[CHAPTERS]", error)
        return new NextResponse("Internal error", { status: 500 });
    }
}