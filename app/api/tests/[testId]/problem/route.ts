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

// The coding-problem contract is identical to the chapter version, so the
// validation and test-case handling here deliberately mirror
// app/api/courses/[courseId]/chapters/[chapterId]/problem/route.ts. The only
// difference is the parent: a test instead of a chapter.

// Student: fetch every coding problem attached to a test.
//
// Only public cases are returned, exactly as in lessons; the full suite (hidden
// cases included) is handed out by the /submission-suite endpoint at grading
// time, which keeps the answer key out of the page payload.
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

        const problems = await db.codingProblem.findMany({
            where: { testId: params.testId },
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
        console.error("[TEST_PROBLEM_GET]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: create or update a coding problem within a test.
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

        const ordered = [...validCases]
            .map((tc, index) => ({ tc, index }))
            .sort((a, b) => {
                const ah = a.tc.isHidden ? 1 : 0;
                const bh = b.tc.isHidden ? 1 : 0;
                return ah - bh || a.index - b.index;
            });

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
            // Scope by testId so a stale form id cannot retarget another test's
            // (or a chapter's) problem.
            const existing = await db.codingProblem.findFirst({
                where: { id: id.trim(), testId: params.testId },
                select: { id: true },
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

        const count = await db.codingProblem.count({
            where: { testId: params.testId },
        });

        const created = await db.codingProblem.create({
            data: {
                ...sharedFields,
                testId: params.testId,
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
        console.error("[TEST_PROBLEM_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}

// Teacher: delete a coding problem from a test. `id` may come from the body or
// `?id=`, matching the chapter endpoint's contract.
export async function DELETE(
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

        await db.codingProblem.deleteMany({
            where: { id: targetId.trim(), testId: params.testId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[TEST_PROBLEM_DELETE]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
