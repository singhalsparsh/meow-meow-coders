import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Returns the complete test suite, hidden cases included. This is only fetched
// the moment a student hits "Submit", so hidden cases are never sitting in the
// browser while they are just reading the problem or running samples.
export async function GET(
    _req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const problem = await db.codingProblem.findUnique({
            where: { chapterId: params.chapterId },
            select: {
                id: true,
                title: true,
                timeLimitMs: true,
                driverCode: true,
                testCases: {
                    orderBy: [{ isHidden: "asc" }, { order: "asc" }],
                },
            },
        });

        if (!problem) {
            return new NextResponse("Not found", { status: 404 });
        }

        return NextResponse.json(problem);
    } catch (error) {
        console.log("[CODING_PROBLEM_SUITE_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
