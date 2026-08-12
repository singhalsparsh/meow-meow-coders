import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server"
import { video } from "@/lib/mux";

export async function DELETE(req: Request, props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: params.courseId,
                userId: userId
            },
            include: {
                chapters: {
                    include: {
                        muxData: true
                    }
                }
            }
        })

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        for (const chapter of course.chapters) {
            if (chapter.muxData?.assetId) {
                // Mux may be unconfigured (no MUX_TOKEN_ID/SECRET) — never
                // let that block deleting the course.
                try {
                    await video().Assets.del(chapter.muxData.assetId)
                } catch (error) {
                    console.log("[COURSE_ID_DELETE_MUX]", error)
                }
            }

        }

        const deletedCourse = await db.course.delete({
            where: {
                id: params.courseId,
            }
        })

        return NextResponse.json(deletedCourse)

    } catch (error) {
        console.log("[COURSE_ID_DELETE]", error)
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(req: Request, props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth()
        const { courseId } = params
        const values = await req.json()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.update({
            where: {
                id: courseId,
                userId
            },
            data: {
                ...values,
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[COURSE_ID]", error)
        return new NextResponse("Internal error", { status: 500 });
    }
}