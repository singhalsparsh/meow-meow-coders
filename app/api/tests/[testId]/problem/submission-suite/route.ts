import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Returns the complete suite for one test problem, hidden cases included.
//
// This is fetched only the instant a student hits "Submit", so hidden cases are
// never sitting in the browser while they read the problem or run samples. The
// contract is identical to the chapter version
// (app/api/courses/.../problem/submission-suite) — same shape, same `?problemId`
// query — because the workspace component is shared.
export async function GET(
    req: Request,
    props: { params: Promise<{ testId: string }> }
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

        // Scope by testId so a problemId borrowed from a chapter (or another
        // test) cannot leak hidden cases into this one.
        const problem = await db.codingProblem.findFirst({
            where: { id: problemId, testId: params.testId },
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
        console.error("[TEST_PROBLEM_SUITE_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
