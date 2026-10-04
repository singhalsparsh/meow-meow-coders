import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import type { Difficulty, DsaTopic } from "@prisma/client";

const VALID_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const VALID_TOPICS: DsaTopic[] = [
    "ARRAYS", "VECTORS", "STRINGS", "LINKED_LISTS", "STACKS", "QUEUES",
    "TREES", "GRAPHS", "DYNAMIC_PROGRAMMING", "SORTING_SEARCHING",
    "FUNDAMENTAL", "OTHER",
];

interface TestCaseInput {
    input: string;
    expectedOutput: string;
    explanation?: string | null;
    isHidden?: boolean;
}

// Fetches every coding problem attached to a chapter for a student.
//
// Only public test cases are returned here: hidden cases are fetched on demand
// from /submission-suite, which is the single place the full suite is handed out.
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

        const problems = await db.codingProblem.findMany({
            where: { chapterId: params.chapterId },
            orderBy: { position: "asc" },
            include: {
                testCases: {
                    where: { isHidden: false },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!problems.length) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Submission history for the left panel's "Submissions" tab, keyed per
        // problem so each workspace shows only its own attempts.
        const ids = problems.map((p) => p.id);
        const submissions = await db.problemSubmission.findMany({
            where: { userId, problemId: { in: ids } },
            orderBy: { createdAt: "desc" },
            take: 200,
            select: {
                id: true,
                problemId: true,
                status: true,
                passedCount: true,
                totalCount: true,
                runtimeMs: true,
                createdAt: true,
            },
        });

        const byProblem = new Map<string, typeof submissions>();
        for (const sub of submissions) {
            const list = byProblem.get(sub.problemId) ?? [];
            list.push(sub);
            byProblem.set(sub.problemId, list);
        }

        return NextResponse.json(
            problems.map((problem) => ({
                ...problem,
                submissions: byProblem.get(problem.id) ?? [],
            }))
        );
    } catch (error) {
        console.error("[CODING_PROBLEM_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: create a new coding problem, or update an existing one.
//
// A chapter may hold any number of problems. The body's optional `id` decides
// which: present -> update that problem (it must belong to this chapter),
// absent -> append a new one at the end. Test cases are replaced wholesale on
// every save — the form owns the whole set — and re-ordered so public cases
// come first.
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

        const course = await db.course.findUnique({
            where: { id: params.courseId, userId },
            select: { id: true },
        });

        if (!course) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const {
            id,
            title,
            difficulty,
            topic,
            description,
            constraints,
            starterCode,
            driverCode,
            timeLimitMs,
            testCases,
        } = body ?? {};

        if (typeof title !== "string" || !title.trim()) {
            return new NextResponse("Title is required", { status: 400 });
        }
        if (typeof description !== "string" || !description.trim()) {
            return new NextResponse("Description is required", { status: 400 });
        }
        if (typeof starterCode !== "string" || !starterCode.trim()) {
            return new NextResponse("Starter code is required", { status: 400 });
        }
        // The form sends uppercase enum members, but a caller hitting this route
        // directly could send "Easy"/"Arrays". Normalize before validating so a
        // casing difference can't reach Prisma (which would throw, not 400).
        // The `as` casts are safe: the membership checks below reject anything
        // that isn't a real enum member before these values reach Prisma.
        const normalizedDifficulty = (
            typeof difficulty === "string" ? difficulty.trim().toUpperCase() : "EASY"
        ) as Difficulty;
        const normalizedTopic = (
            typeof topic === "string" ? topic.trim().toUpperCase() : "ARRAYS"
        ) as DsaTopic;

        if (!VALID_DIFFICULTIES.includes(normalizedDifficulty)) {
            return new NextResponse("Invalid difficulty", { status: 400 });
        }
        if (!VALID_TOPICS.includes(normalizedTopic)) {
            return new NextResponse("Invalid topic", { status: 400 });
        }

        const rawCases: TestCaseInput[] = Array.isArray(testCases) ? testCases : [];
        const validCases = rawCases.filter(
            (tc) => tc && typeof tc.input === "string" && typeof tc.expectedOutput === "string"
        );

        if (!validCases.length) {
            return new NextResponse("At least one test case is required", { status: 400 });
        }

        // Public cases first so the student's sample tabs are the visible ones.
        const ordered = [...validCases]
            .map((tc, index) => ({ tc, index }))
            .sort((a, b) => {
                const ah = a.tc.isHidden ? 1 : 0;
                const bh = b.tc.isHidden ? 1 : 0;
                return ah - bh || a.index - b.index;
            });

        // An <input type="number"> can still arrive as a string over JSON, and
        // Prisma rejects anything but an Int for this column.
        const parsedLimit = Number(timeLimitMs);
        const limit =
            Number.isFinite(parsedLimit) && parsedLimit > 0
                ? Math.min(Math.round(parsedLimit), 30_000)
                : 2000;

        const sharedFields = {
            title: title.trim(),
            difficulty: normalizedDifficulty,
            topic: normalizedTopic,
            description,
            constraints: constraints ?? null,
            starterCode,
            driverCode: driverCode ?? null,
            timeLimitMs: limit,
        };

        if (typeof id === "string" && id.trim()) {
            // Update: scope to this chapter so a stale/foreign id from the form
            // can't touch another chapter's problem.
            const existing = await db.codingProblem.findFirst({
                where: { id: id.trim(), chapterId: params.chapterId },
                select: { id: true, position: true },
            });

            if (!existing) {
                return new NextResponse("Problem not found", { status: 404 });
            }

            const updated = await db.codingProblem.update({
                where: { id: existing.id },
                data: sharedFields,
            });

            await db.testCase.deleteMany({ where: { problemId: updated.id } });
            await db.testCase.createMany({
                data: ordered.map(({ tc }, index) => ({
                    problemId: updated.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    explanation: tc.explanation?.trim() || null,
                    isHidden: !!tc.isHidden,
                    order: index,
                })),
            });

            return NextResponse.json(
                await db.codingProblem.findUnique({
                    where: { id: updated.id },
                    include: { testCases: { orderBy: { order: "asc" } } },
                })
            );
        }

        // Create: append after the chapter's existing problems.
        const count = await db.codingProblem.count({
            where: { chapterId: params.chapterId },
        });

        const created = await db.codingProblem.create({
            data: {
                ...sharedFields,
                chapterId: params.chapterId,
                position: count,
            },
        });

        await db.testCase.createMany({
            data: ordered.map(({ tc }, index) => ({
                problemId: created.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                explanation: tc.explanation?.trim() || null,
                isHidden: !!tc.isHidden,
                order: index,
            })),
        });

        return NextResponse.json(
            await db.codingProblem.findUnique({
                where: { id: created.id },
                include: { testCases: { orderBy: { order: "asc" } } },
            })
        );
    } catch (error) {
        // Return the real message instead of a generic "Internal error": the
        // common cause here is a schema/migration drift (e.g. the CodingProblem
        // table not existing yet), and a masked body makes that impossible to
        // diagnose from the browser.
        console.error("[CODING_PROBLEM_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: delete one coding problem (and its cases) from a chapter.
//
// `id` may come from the JSON body or the `?id=` query string so the same
// endpoint serves a button click and a plain link. Deleting a problem leaves a
// gap in `position`, which is harmless — ordering is relative, not contiguous.
export async function DELETE(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: { id: params.courseId, userId },
            select: { id: true },
        });

        if (!course) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Read the target id from the body when present (axios delete sends a
        // body), otherwise fall back to `?id=`.
        let targetId: unknown = undefined;
        try {
            const body = await req.json();
            targetId = body?.id;
        } catch {
            // DELETE with no body is legal; fall through to the query string.
        }
        if (targetId === undefined) {
            const url = new URL(req.url);
            targetId = url.searchParams.get("id");
        }

        if (typeof targetId !== "string" || !targetId.trim()) {
            return new NextResponse("Problem id is required", { status: 400 });
        }

        // Scope to the chapter so a foreign id can't delete another chapter's
        // problem.
        await db.codingProblem.deleteMany({
            where: { id: targetId.trim(), chapterId: params.chapterId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CODING_PROBLEM_DELETE]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
