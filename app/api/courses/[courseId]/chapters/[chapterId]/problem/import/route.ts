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

/** Canonical, validated test case used downstream. */
interface NormalizedCase {
    input: string;
    expectedOutput: string;
    explanation?: string | null;
    isHidden: boolean;
}

interface ImportProblemInput {
    title?: unknown;
    difficulty?: unknown;
    topic?: unknown;
    description?: unknown;
    constraints?: unknown;
    solution?: unknown;
    starterCode?: unknown;
    driverCode?: unknown;
    timeLimitMs?: unknown;
    testCases?: unknown;
}

/** Validate + normalize a single imported problem. Returns null when invalid. */
function normalizeProblem(raw: ImportProblemInput): {
    problem: {
        title: string;
        difficulty: Difficulty;
        topic: DsaTopic;
        description: string;
        constraints: string | null;
        solution: string | null;
        starterCode: string;
        driverCode: string | null;
        timeLimitMs: number;
    };
    validCases: TestCaseInput[];
} | { error: string } {
    if (!raw || typeof raw !== "object") {
        return { error: "Each entry must be an object" };
    }

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) return { error: "Problem title is required" };

    const description = typeof raw.description === "string" ? raw.description : "";
    if (!description.trim()) return { error: `"${title}": description is required` };

    const starterCode = typeof raw.starterCode === "string" ? raw.starterCode : "";
    if (!starterCode.trim()) return { error: `"${title}": starter code is required` };

    // Normalize difficulty / topic (case-insensitive, whitespace-trimmed).
    const difficulty = (
        typeof raw.difficulty === "string"
            ? raw.difficulty.trim().toUpperCase()
            : "EASY"
    ) as Difficulty;
    const topic = (
        typeof raw.topic === "string"
            ? raw.topic.trim().toUpperCase()
            : "ARRAYS"
    ) as DsaTopic;

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return { error: `"${title}": invalid difficulty "${String(raw.difficulty)}"` };
    }
    if (!VALID_TOPICS.includes(topic)) {
        return { error: `"${title}": invalid topic "${String(raw.topic)}"` };
    }

    const rawCases: TestCaseInput[] = Array.isArray(raw.testCases) ? raw.testCases : [];
    // Accept both `hidden` and `isHidden` keys so templates written either way
    // behave identically. A case counts as valid when input + expectedOutput are
    // present; anything else is dropped.
    const validCases: NormalizedCase[] = rawCases
        .filter(
            (tc) =>
                tc &&
                typeof tc.input === "string" &&
                typeof tc.expectedOutput === "string"
        )
        .map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation:
                typeof tc.explanation === "string" && tc.explanation
                    ? tc.explanation
                    : null,
            isHidden: Boolean(tc.isHidden) || Boolean((tc as any).hidden),
        }));

    if (!validCases.length) {
        return { error: `"${title}": at least one test case is required` };
    }

    const parsedLimit = Number(raw.timeLimitMs);
    const timeLimitMs =
        Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(Math.round(parsedLimit), 30_000)
            : 2000;

    return {
        problem: {
            title,
            difficulty,
            topic,
            description,
            constraints: typeof raw.constraints === "string" && raw.constraints ? raw.constraints : null,
            solution: typeof raw.solution === "string" && raw.solution ? raw.solution : null,
            starterCode,
            driverCode: typeof raw.driverCode === "string" && raw.driverCode ? raw.driverCode : null,
            timeLimitMs,
        },
        validCases,
    };
}

// Teacher: bulk-import one or more coding problems in a single request.
//
// Body: `{ problems: ImportProblemInput[] }`. Each problem goes through the same
// validation as the single-create endpoint. Problems that fail validation are
// skipped and reported individually — a partial import does not abort the whole
// batch. Public test cases are stored before hidden ones.
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
        const rawProblems: unknown[] = Array.isArray(body?.problems)
            ? body.problems
            : Array.isArray(body)
              ? body
              : [];

        if (!rawProblems.length) {
            return new NextResponse("No problems provided", { status: 400 });
        }

        const count = await db.codingProblem.count({
            where: { chapterId: params.chapterId },
        });

        const results: {
            title: string;
            status: "created" | "skipped";
            error?: string;
            problem?: {
                id: string;
                title: string;
                difficulty: Difficulty;
                topic: DsaTopic;
                description: string;
                constraints: string | null;
                solution: string | null;
                starterCode: string;
                driverCode: string | null;
                timeLimitMs: number;
                testCases: {
                    id: string;
                    input: string;
                    expectedOutput: string;
                    explanation: string | null;
                    isHidden: boolean;
                }[];
            };
        }[] = [];
        let position = count;

        for (const raw of rawProblems) {
            const normalized = normalizeProblem(raw as ImportProblemInput);
            if ("error" in normalized) {
                results.push({
                    title: typeof (raw as any)?.title === "string" ? (raw as any).title : "(unknown)",
                    status: "skipped",
                    error: normalized.error,
                });
                continue;
            }

            const { problem, validCases } = normalized;

            // Public cases first so the student's sample tabs are the visible ones.
            const ordered = validCases
                .map((tc, index) => ({ tc, index }))
                .sort((a, b) => {
                    const ah = a.tc.isHidden ? 1 : 0;
                    const bh = b.tc.isHidden ? 1 : 0;
                    return ah - bh || a.index - b.index;
                });

            const created = await db.codingProblem.create({
                data: {
                    ...problem,
                    chapterId: params.chapterId,
                    position: position++,
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

            const full = await db.codingProblem.findUnique({
                where: { id: created.id },
                include: { testCases: { orderBy: { order: "asc" } } },
            });

            results.push({
                title: created.title,
                status: "created",
                problem: full
                    ? {
                          id: full.id,
                          title: full.title,
                          difficulty: full.difficulty,
                          topic: full.topic,
                          description: full.description,
                          constraints: full.constraints,
                          solution: full.solution,
                          starterCode: full.starterCode,
                          driverCode: full.driverCode,
                          timeLimitMs: full.timeLimitMs,
                          testCases: full.testCases.map((tc) => ({
                              id: tc.id,
                              input: tc.input,
                              expectedOutput: tc.expectedOutput,
                              explanation: tc.explanation,
                              isHidden: tc.isHidden,
                          })),
                      }
                    : undefined,
            });
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("[CODING_PROBLEM_IMPORT_POST]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
