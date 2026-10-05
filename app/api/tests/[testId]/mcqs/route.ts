import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Shape of one option as the editor sends it. Options carry their own stable
// ids so the client can key radio/checkbox inputs on them, and so a correct
// answer is expressed as "these option ids" rather than a fragile index.
interface McqOption {
    id: string;
    text: string;
}

// `correctOptionIds` with more than one entry marks a multi-correct question;
// exactly one makes it single-correct. The grader treats both uniformly by
// comparing the selected set to the correct set.
function isValidOptions(options: unknown): options is McqOption[] {
    return (
        Array.isArray(options) &&
        options.length >= 2 &&
        options.every(
            (o) =>
                o &&
                typeof o === "object" &&
                typeof (o as McqOption).id === "string" &&
                typeof (o as McqOption).text === "string" &&
                (o as McqOption).text.trim().length > 0
        )
    );
}

function isValidCorrect(correct: unknown, optionIds: string[]): boolean {
    if (!Array.isArray(correct) || correct.length === 0) return false;
    return correct.every(
        (c) => typeof c === "string" && optionIds.includes(c)
    );
}

// Teacher: list a test's MCQs in display order.
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
            select: { id: true },
        });

        if (!test) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const mcqs = await db.testMcq.findMany({
            where: { testId: params.testId },
            orderBy: { position: "asc" },
        });

        return NextResponse.json(mcqs);
    } catch (error) {
        console.error("[TEST_MCQ_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: create or update an MCQ.
//
// An `id` in the body means update (and it must belong to this test); no `id`
// means append a new question at the end. Position is always derived from the
// current count rather than trusted from the client, so ordering stays stable
// even if two browser tabs edit the same test.
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

        const test = await db.test.findUnique({
            where: { id: params.testId, userId },
            select: { id: true },
        });

        if (!test) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { id, question, options, correctOptionIds, explanation } = body ?? {};

        if (typeof question !== "string" || !question.trim()) {
            return new NextResponse("Question text is required", { status: 400 });
        }
        if (!isValidOptions(options)) {
            return new NextResponse(
                "Provide at least two non-empty options",
                { status: 400 }
            );
        }

        const optionIds = options.map((o) => o.id);
        if (!isValidCorrect(correctOptionIds, optionIds)) {
            return new NextResponse(
                "Mark at least one correct answer that matches an option",
                { status: 400 }
            );
        }

        const payload = {
            question: question.trim(),
            // Stored as JSON arrays: `options` for the choices, and
            // `correctOptionIds` for the answer key (never sent to students).
            options: options as unknown as object,
            correctOptionIds: (correctOptionIds as string[]) as unknown as object,
            explanation:
                typeof explanation === "string" && explanation.trim()
                    ? explanation.trim()
                    : null,
        };

        if (typeof id === "string" && id.trim()) {
            const updated = await db.testMcq.update({
                where: { id: id.trim(), testId: params.testId },
                data: payload,
            });
            return NextResponse.json(updated);
        }

        const count = await db.testMcq.count({ where: { testId: params.testId } });
        const created = await db.testMcq.create({
            data: { ...payload, testId: params.testId, position: count },
        });

        return NextResponse.json(created);
    } catch (error) {
        console.error("[TEST_MCQ_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
