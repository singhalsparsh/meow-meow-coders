import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Teacher: list their own tests.
//
// A test is a standalone assessment (not part of any course), so ownership is
// the only filter — unlike courses there is no category or purchase relation.
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const tests = await db.test.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { mcqs: true, problems: true, attempts: true },
                },
            },
        });

        return NextResponse.json(tests);
    } catch (error) {
        console.error("[TESTS_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: create an empty, unpublished test.
//
// Nothing else is created here — MCQs and coding problems are added from the
// editor. A draft stays invisible to students until it is published.
export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const test = await db.test.create({
            data: {
                userId,
                title: "Untitled test",
            },
        });

        return NextResponse.json(test);
    } catch (error) {
        console.error("[TESTS_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
