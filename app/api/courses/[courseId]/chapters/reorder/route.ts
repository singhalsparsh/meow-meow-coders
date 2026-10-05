import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PUT(req: Request, props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth()
        const { list } = await req.json()

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

        // Each item may carry a parentId so a chapter can be dragged between
        // the top-level group (parentId = null) and a topic's sub-lesson list.
        for (let item of list) {
            await db.chapter.update({
                where: { id: item.id },
                data: {
                    position: item.position,
                    parentId: item.parentId ?? null,
                }
            })
        }

        return new NextResponse("Success", { status: 200 })

    } catch (error) {
        console.log("[REORDER]", error)
        return new NextResponse("Internal error", { status: 500 });
    }
}