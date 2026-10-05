import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Student: fetch a takeable test, or resume an in-progress attempt.
//
// This is the student-facing payload and it deliberately omits the answer key:
// MCQs come back without `correctOptionIds`, and coding problems without their
// hidden test cases. The teacher view (GET /api/tests/[testId]) is the only
// place the key is served.
export async function GET(
    _req: Request,
    props: { params: Promise<{ testId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const test = await db.test.findUnique({
            where: { id: params.testId, isPublished: true },
            select: {
                id: true,
                title: true,
                description: true,
                mcqs: {
                    orderBy: { position: "asc" },
                    // `options` is needed to render the choices; the correct
                    // ids are dropped here and re-derived only at grading.
                    select: { id: true, question: true, options: true, position: true },
                },
                problems: {
                    orderBy: { position: "asc" },
                    include: {
                        testCases: {
                            where: { isHidden: false },
                            orderBy: { order: "asc" },
                        },
                    },
                },
            },
        });

        if (!test) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Resume support: one attempt per (test, user). A learner who leaves and
        // comes back picks up the same attempt rather than restarting.
        const attempt = await db.testAttempt.findUnique({
            where: { testId_userId: { testId: params.testId, userId } },
            include: {
                answers: { select: { mcqId: true, selectedOptionIds: true } },
            },
        });

        return NextResponse.json({ test, attempt });
    } catch (error) {
        console.error("[TEST_ATTEMPT_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Student: start (or resume) an attempt.
//
// upsert keeps a single row per (test, user): the first call creates it and
// every later call is a no-op that returns the existing attempt, so reopening a
// test never wipes progress or resets the clock.
export async function POST(
    _req: Request,
    props: { params: Promise<{ testId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const test = await db.test.findUnique({
            where: { id: params.testId, isPublished: true },
            select: { id: true },
        });

        if (!test) {
            return new NextResponse("Not found", { status: 404 });
        }

        const attempt = await db.testAttempt.upsert({
            where: { testId_userId: { testId: params.testId, userId } },
            update: {},
            create: { testId: params.testId, userId },
        });

        return NextResponse.json(attempt);
    } catch (error) {
        console.error("[TEST_ATTEMPT_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
