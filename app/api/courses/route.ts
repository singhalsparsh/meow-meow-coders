import { db } from "@/lib/db"
import { isTeacherOnServer } from "@/lib/teacher-server"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST(
    req: Request,
) {
    try {
        const { userId } = await auth()
        const { title } = await req.json()

        if (!userId || !(await isTeacherOnServer(userId))) return new NextResponse("Unauthorized", { status: 401 })

        const course = await db.course.create({
            data: {
                userId,
                title,
            }
        });

        return NextResponse.json(course)

    } catch (error) {
        console.log("[COURSES", error)
        return new NextResponse("Internal error", { status: 500 })
    }
}