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

// Saves a graded submission.
//
// Grading happens in the browser (that is the point of the WASM judge — there is
// no server-side execution by design), so this endpoint validates what it is
// asked to persist rather than trusting it blindly: the verdict must be a real
// enum value and the reported counts must line up with the problem's actual test
// suite. Only a genuinely complete pass marks the chapter complete.
//
// The body carries `problemId` because a chapter may hold several problems.
export async function POST(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
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

        // Scope to the chapter so a submission can't be attached to a problem
        // the student isn't looking at.
        const problem = await db.codingProblem.findFirst({
            where: { id: problemId.trim(), chapterId: params.chapterId },
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

        // A full pass on the complete suite completes the chapter. Counts are
        // re-derived here rather than taken from the client's `status`.
        const isAccepted =
            totalCount > 0 && clampedPassed === totalCount && status === "ACCEPTED";

        if (isAccepted) {
            await db.userProgress.upsert({
                where: {
                    userId_chapterId: {
                        userId,
                        chapterId: params.chapterId,
                    },
                },
                update: { isCompleted: true },
                create: {
                    userId,
                    chapterId: params.chapterId,
                    isCompleted: true,
                },
            });
        }

        return NextResponse.json({ ...submission, isAccepted });
    } catch (error) {
        console.error("[CODING_PROBLEM_SUBMIT]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
