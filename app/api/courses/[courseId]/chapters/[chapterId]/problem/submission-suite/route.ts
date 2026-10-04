import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Returns the complete test suite, hidden cases included. This is only fetched
// the moment a student hits "Submit", so hidden cases are never sitting in the
// browser while they are just reading the problem or running samples.
//
// The target problem is `?problemId=`; a chapter may hold several problems now,
// so the chapter alone is no longer enough to identify it.
export async function GET(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const problemId = new URL(req.url).searchParams.get("problemId");
        if (!problemId) {
            return new NextResponse("problemId is required", { status: 400 });
        }

        // Scope to the chapter so a problemId from elsewhere can't leak a
        // different chapter's hidden cases.
        const problem = await db.codingProblem.findFirst({
            where: { id: problemId, chapterId: params.chapterId },
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
        console.error("[CODING_PROBLEM_SUITE_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
