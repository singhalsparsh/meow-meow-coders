import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import type { Difficulty, DsaTopic } from "@prisma/client";

const VALID_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const VALID_TOPICS: DsaTopic[] = [
    "ARRAYS", "VECTORS", "STRINGS", "LINKED_LISTS", "STACKS", "QUEUES",
    "TREES", "GRAPHS", "DYNAMIC_PROGRAMMING", "SORTING_SEARCHING",
];

interface TestCaseInput {
    input: string;
    expectedOutput: string;
    explanation?: string | null;
    isHidden?: boolean;
}

// Fetches the coding problem attached to a chapter for a student.
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

        const problem = await db.codingProblem.findUnique({
            where: { chapterId: params.chapterId },
            include: {
                testCases: {
                    where: { isHidden: false },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!problem) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Submission history for the left panel's "Submissions" tab.
        const submissions = await db.problemSubmission.findMany({
            where: { userId, problemId: problem.id },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                status: true,
                passedCount: true,
                totalCount: true,
                runtimeMs: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ ...problem, submissions });
    } catch (error) {
        console.log("[CODING_PROBLEM_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// Teacher: create or update the coding problem attached to a chapter.
//
// A chapter has at most one coding problem (chapterId is unique), so this is an
// upsert. Test cases are replaced wholesale on every save — the form owns the
// whole set — and re-ordered so public cases come first.
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
        if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
            return new NextResponse("Invalid difficulty", { status: 400 });
        }
        if (topic && !VALID_TOPICS.includes(topic)) {
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

        const limit =
            typeof timeLimitMs === "number" && timeLimitMs > 0
                ? Math.min(Math.round(timeLimitMs), 30_000)
                : 2000;

        const problem = await db.codingProblem.upsert({
            where: { chapterId: params.chapterId },
            update: {
                title: title.trim(),
                difficulty: difficulty ?? "EASY",
                topic: topic ?? "ARRAYS",
                description,
                constraints: constraints ?? null,
                starterCode,
                driverCode: driverCode ?? null,
                timeLimitMs: limit,
            },
            create: {
                chapterId: params.chapterId,
                title: title.trim(),
                difficulty: difficulty ?? "EASY",
                topic: topic ?? "ARRAYS",
                description,
                constraints: constraints ?? null,
                starterCode,
                driverCode: driverCode ?? null,
                timeLimitMs: limit,
            },
        });

        await db.testCase.deleteMany({ where: { problemId: problem.id } });
        await db.testCase.createMany({
            data: ordered.map(({ tc }, index) => ({
                problemId: problem.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                explanation: tc.explanation?.trim() || null,
                isHidden: !!tc.isHidden,
                order: index,
            })),
        });

        return NextResponse.json(
            await db.codingProblem.findUnique({
                where: { id: problem.id },
                include: { testCases: { orderBy: { order: "asc" } } },
            })
        );
    } catch (error) {
        console.log("[CODING_PROBLEM_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// Teacher: detach the coding problem (and its cases) from a chapter.
export async function DELETE(
    _req: Request,
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

        await db.codingProblem.deleteMany({
            where: { chapterId: params.chapterId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log("[CODING_PROBLEM_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
