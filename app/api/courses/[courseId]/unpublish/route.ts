import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function PATCH(req: Request, props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: params.courseId,
            },
        })

        if (!course) {
            return new NextResponse("Not found", { status: 404 })
        }

        const unpublishedCourse = await db.course.update({
            where: {
                id: params.courseId,
            },
            data: {
                isPublished: false
            }
        })

        revalidateTag("course-catalog", "max");

        return NextResponse.json(unpublishedCourse)

    } catch (error) {
        console.log("[COURSE_ID_UNPUBLISH]", error)
        return new NextResponse("Internal error", { status: 500 });
    }
}