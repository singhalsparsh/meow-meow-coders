import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

interface McqAnswer {
    mcqId: string;
    selectedOptionIds: string[];
}

// Grade a submitted test.
//
// Nothing is trusted from the client. The correct answers are read from the DB
// (the student payload never contains them), and the coding score is derived
// from the learner's own recorded submissions rather than from anything the
// browser asserts. The client only says "here is what I picked"; the server
// decides what that is worth.
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
            where: { id: params.testId, isPublished: true },
            select: {
                id: true,
                mcqs: {
                    orderBy: { position: "asc" },
                    select: { id: true, correctOptionIds: true },
                },
                problems: {
                    orderBy: { position: "asc" },
                    select: { id: true },
                },
            },
        });

        if (!test) {
            return new NextResponse("Not found", { status: 404 });
        }

        const body = await req.json();
        const rawAnswers: unknown = body?.answers;

        // Normalize into "mcqId -> set of selected option ids", ignoring any
        // entry that does not reference a real question in this test.
        const mcqById = new Map(test.mcqs.map((m) => [m.id, m]));
        const parsed: McqAnswer[] = Array.isArray(rawAnswers)
            ? rawAnswers
                  .map((a) => {
                      if (!a || typeof a !== "object") return null;
                      const { mcqId, selectedOptionIds } = a as Record<string, unknown>;
                      if (typeof mcqId !== "string" || !mcqById.has(mcqId)) return null;
                      const selected = Array.isArray(selectedOptionIds)
                          ? selectedOptionIds.filter((s): s is string => typeof s === "string")
                          : [];
                      return { mcqId, selectedOptionIds: selected };
                  })
                  .filter((a): a is McqAnswer => a !== null)
            : [];

        // ----- MCQ grading -------------------------------------------------
        // An MCQ is correct only when the selected set exactly equals the
        // correct set. This makes multi-correct strict by design: selecting a
        // wrong option, or missing a right one, both score zero. Order is
        // irrelevant because the comparison is set-based.
        const graded = parsed.map((answer) => {
            const mcq = mcqById.get(answer.mcqId)!;
            const correct = mcq.correctOptionIds as string[];
            const selectedSet = new Set(answer.selectedOptionIds);
            const correctSet = new Set(correct);
            const isCorrect =
                selectedSet.size === correctSet.size &&
                [...selectedSet].every((id) => correctSet.has(id));

            return {
                mcqId: answer.mcqId,
                selectedOptionIds: answer.selectedOptionIds,
                isCorrect,
                awardedPoints: isCorrect ? 1 : 0,
            };
        });

        // ----- Coding grading ---------------------------------------------
        // A coding problem counts as solved when the learner has an ACCEPTED
        // submission that passed the whole suite. Submissions are the same rows
        // the lesson judge writes, so a problem solved in a lesson and reused in
        // a test is already credited — no double work for the student.
        const problemIds = test.problems.map((p) => p.id);
        let codingScore = 0;
        const problemResults: { problemId: string; solved: boolean }[] = [];

        if (problemIds.length) {
            const submissions = await db.problemSubmission.findMany({
                where: { userId, problemId: { in: problemIds } },
                orderBy: { createdAt: "desc" },
                select: {
                    problemId: true,
                    status: true,
                    passedCount: true,
                    totalCount: true,
                },
            });

            // Keep only the most recent verdict per problem.
            const latestByProblem = new Map<string, { status: string; passedCount: number; totalCount: number }>();
            for (const s of submissions) {
                if (!latestByProblem.has(s.problemId)) {
                    latestByProblem.set(s.problemId, s);
                }
            }

            for (const problemId of problemIds) {
                const latest = latestByProblem.get(problemId);
                const solved =
                    !!latest &&
                    latest.status === "ACCEPTED" &&
                    latest.totalCount > 0 &&
                    latest.passedCount === latest.totalCount;
                if (solved) codingScore += 1;
                problemResults.push({ problemId, solved });
            }
        }

        const mcqScore = graded.reduce((sum, g) => sum + g.awardedPoints, 0);
        const score = mcqScore + codingScore;
        const maxScore = test.mcqs.length + test.problems.length;

        // Persist the attempt and its graded answers atomically. An attempt may
        // already exist (the learner started earlier); upsert covers both.
        const attempt = await db.testAttempt.upsert({
            where: { testId_userId: { testId: params.testId, userId } },
            update: {
                status: "SUBMITTED",
                score,
                maxScore,
                submittedAt: new Date(),
            },
            create: {
                testId: params.testId,
                userId,
                status: "SUBMITTED",
                score,
                maxScore,
                submittedAt: new Date(),
            },
        });

        // Replace the previous answer set so re-submitting (before results are
        // final) cannot leave stale rows from an earlier attempt.
        await db.testAnswer.deleteMany({ where: { attemptId: attempt.id } });
        if (graded.length) {
            await db.testAnswer.createMany({
                data: graded.map((g) => ({
                    attemptId: attempt.id,
                    mcqId: g.mcqId,
                    selectedOptionIds: g.selectedOptionIds,
                    isCorrect: g.isCorrect,
                    awardedPoints: g.awardedPoints,
                })),
            });
        }

        return NextResponse.json({
            attemptId: attempt.id,
            score,
            maxScore,
            mcqResults: graded,
            problemResults,
        });
    } catch (error) {
        console.error("[TEST_SUBMIT]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
