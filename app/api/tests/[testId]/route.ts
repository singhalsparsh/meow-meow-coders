import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Every mutating handler in this file must first prove the caller owns the
// test, otherwise any logged-in student could rewrite or delete a teacher's
// assessment by guessing its id.
async function assertOwned(testId: string, userId: string) {
    return db.test.findUnique({
        where: { id: testId, userId },
        select: { id: true },
    });
}

// Teacher: fetch one test with its questions for the editor.
//
// Correct answers are included here because this is the authoring view; the
// student-facing payload never sends them (see /attempt).
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
            where: { id: params.testId, userId },
            include: {
                mcqs: { orderBy: { position: "asc" } },
                problems: {
                    orderBy: { position: "asc" },
                    include: {
                        testCases: { orderBy: { order: "asc" } },
                    },
                },
                _count: { select: { attempts: true } },
            },
        });

        if (!test) {
            return new NextResponse("Not found", { status: 404 });
        }

        return NextResponse.json(test);
    } catch (error) {
        console.error("[TEST_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: update a test's title, description, or published flag.
export async function PATCH(
    req: Request,
    props: { params: Promise<{ testId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const owned = await assertOwned(params.testId, userId);
        if (!owned) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { title, description, isPublished } = body ?? {};

        // Partial update: only the fields actually sent are written, so the
        // title form and the publish toggle can PATCH independently.
        const data: Record<string, unknown> = {};
        if (typeof title === "string") data.title = title.trim();
        if (typeof description === "string") data.description = description.trim();
        if (typeof isPublished === "boolean") data.isPublished = isPublished;

        if (typeof title === "string" && !data.title) {
            return new NextResponse("Title is required", { status: 400 });
        }

        // Publishing an empty test would send students to a test with nothing
        // to answer. Reject rather than silently ship an unusable assessment.
        if (isPublished === true) {
            const counts = await db.test.findUnique({
                where: { id: params.testId },
                select: {
                    _count: { select: { mcqs: true, problems: true } },
                },
            });
            if (counts && counts._count.mcqs === 0 && counts._count.problems === 0) {
                return new NextResponse(
                    "Add at least one question before publishing",
                    { status: 400 }
                );
            }
        }

        const test = await db.test.update({
            where: { id: params.testId },
            data,
        });

        return NextResponse.json(test);
    } catch (error) {
        console.error("[TEST_PATCH]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: delete a test.
//
// Cascade handles the children (MCQs, attempts, answers) and the coding
// problems attached via testId, so there is nothing to clean up by hand.
export async function DELETE(
    _req: Request,
    props: { params: Promise<{ testId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const owned = await assertOwned(params.testId, userId);
        if (!owned) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await db.test.delete({ where: { id: params.testId } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[TEST_DELETE]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
