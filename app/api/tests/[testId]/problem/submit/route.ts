import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { SubmissionVerdict } from "@prisma/client";

const VALID_VERDICTS: SubmissionVerdict[] = [
    "ACCEPTED",
    "WRONG_ANSWER",
    "TIME_LIMIT_EXCEEDED",
    "COMPILE_ERROR",
    "RUNTIME_ERROR",
];

// Records one graded submission to a test coding problem.
//
// Grading runs in the browser (that is the whole point of the WASM judge —
// there is no server-side execution by design), so this endpoint validates what
// it is asked to persist rather than trusting it: the verdict must be a real
// enum member and the reported total must equal the problem's real suite size.
//
// Unlike the chapter endpoint this one never marks a lesson complete: there is
// no chapter here. The test's own scoring re-derives "solved" from the stored
// verdict at submit time, so this route's only job is to persist honestly.
export async function POST(
    req: Request,
    props: { params: Promise<{ testId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { problemId, code, status, passedCount, totalCount, runtimeMs } = body ?? {};

        if (typeof problemId !== "string" || !problemId.trim()) {
            return new NextResponse("problemId is required", { status: 400 });
        }
        if (typeof code !== "string" || !code.trim()) {
            return new NextResponse("Code is required", { status: 400 });
        }
        if (!VALID_VERDICTS.includes(status)) {
            return new NextResponse("Invalid verdict", { status: 400 });
        }
        if (typeof passedCount !== "number" || typeof totalCount !== "number") {
            return new NextResponse("Invalid counts", { status: 400 });
        }

        // Scope by testId so a submission cannot be attached to a problem the
        // learner is not currently taking.
        const problem = await db.codingProblem.findFirst({
            where: { id: problemId.trim(), testId: params.testId },
            select: { id: true, testCases: { select: { id: true } } },
        });

        if (!problem) {
            return new NextResponse("Problem not found", { status: 404 });
        }

        // The client cannot invent a total: it must match the real suite.
        if (totalCount !== problem.testCases.length) {
            return new NextResponse("Test count mismatch", { status: 400 });
        }

        const clampedPassed = Math.max(0, Math.min(passedCount, totalCount));

        const submission = await db.problemSubmission.create({
            data: {
                userId,
                problemId: problem.id,
                code,
                status,
                passedCount: clampedPassed,
                totalCount,
                runtimeMs: typeof runtimeMs === "number" ? runtimeMs : null,
            },
        });

        // `isAccepted` drives the confetti in the shared workspace. It is
        // re-derived here (not copied from the client's `status`) so a malformed
        // verdict cannot buy a celebration or a point.
        const isAccepted =
            totalCount > 0 && clampedPassed === totalCount && status === "ACCEPTED";

        return NextResponse.json({ ...submission, isAccepted });
    } catch (error) {
        console.error("[TEST_PROBLEM_SUBMIT]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
