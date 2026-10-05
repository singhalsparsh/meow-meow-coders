import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TestRunner, type TestPayload } from "./_components/test-runner";

// Student: take a standalone test.
//
// This is deliberately a thin server shell: it loads the published test (never
// the answer key — see the API) plus the learner's existing attempt, then hands
// both to the client runner. All grading happens on the server at submit time.
const TakeTestPage = async ({
    params,
}: {
    params: Promise<{ testId: string }>;
}) => {
    const { testId } = await params;
    const { userId } = await auth();

    if (!userId) {
        return redirect("/sign-in");
    }

    // Create the attempt if it does not exist yet (upsert = resume), then load
    // the published test. Each is a separate await: the attempt row is needed
    // regardless of the test lookup, and keeping them sequential keeps the
    // failure modes obvious.
    const attemptRes = await db.testAttempt.upsert({
        where: { testId_userId: { testId, userId } },
        update: {},
        create: { testId, userId },
        include: {
            answers: {
                select: { mcqId: true, selectedOptionIds: true },
            },
        },
    });

    // `correctOptionIds` is selected only to count it; it is stripped below
    // before the payload reaches the client, so the runner learns *that* a
    // question is multi-correct without learning *which* options are right.
    const test = await db.test.findUnique({
        where: { id: testId, isPublished: true },
        select: {
            id: true,
            title: true,
            description: true,
            mcqs: {
                orderBy: { position: "asc" },
                select: {
                    id: true,
                    question: true,
                    options: true,
                    position: true,
                    correctOptionIds: true,
                },
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
        return redirect("/");
    }

    // The workspace shows the learner's previous attempts for each problem, so
    // their submission history is loaded alongside the problems themselves.
    const problemIds = test.problems.map((p) => p.id);
    const submissionRows = problemIds.length
        ? await db.problemSubmission.findMany({
              where: { userId, problemId: { in: problemIds } },
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
          })
        : [];

    const submissionsByProblem = new Map<string, typeof submissionRows>();
    for (const sub of submissionRows) {
        const list = submissionsByProblem.get(sub.problemId) ?? [];
        list.push(sub);
        submissionsByProblem.set(sub.problemId, list);
    }

    const mcqs = test.mcqs.map((mcq) => {
        const correctCount = (mcq.correctOptionIds as string[]).length;
        return {
            id: mcq.id,
            question: mcq.question,
            options: mcq.options as { id: string; text: string }[],
            position: mcq.position,
            multiCorrect: correctCount > 1,
        };
    });

    const problems = test.problems.map((problem) => ({
        id: problem.id,
        // A test problem has no chapter, so this is null here; the workspace
        // only uses it for display and tolerates the absence.
        chapterId: problem.chapterId ?? "",
        title: problem.title,
        difficulty: problem.difficulty,
        topic: problem.topic,
        description: problem.description,
        constraints: problem.constraints,
        starterCode: problem.starterCode,
        driverCode: problem.driverCode,
        timeLimitMs: problem.timeLimitMs,
        testCases: problem.testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation: tc.explanation,
            isHidden: tc.isHidden,
            order: tc.order,
        })),
        // Dates cross the client boundary as ISO strings, matching the payload
        // type the workspace expects.
        submissions: (submissionsByProblem.get(problem.id) ?? []).map((s) => ({
            id: s.id,
            status: s.status,
            passedCount: s.passedCount,
            totalCount: s.totalCount,
            runtimeMs: s.runtimeMs,
            createdAt: s.createdAt.toISOString(),
        })),
    }));

    const payload: TestPayload = {
        id: test.id,
        title: test.title,
        description: test.description,
        mcqs,
        problems,
    };

    // Normalize the attempt into the runner's shape: `mcqId` is nullable in the
    // schema (the row is optional per answer) and `selectedOptionIds` is JSON,
    // so both are narrowed here before crossing into the client component.
    const attempt = {
        id: attemptRes.id,
        status: attemptRes.status,
        score: attemptRes.score,
        maxScore: attemptRes.maxScore,
        answers: attemptRes.answers
            .filter((a) => a.mcqId !== null)
            .map((a) => ({
                mcqId: a.mcqId as string,
                selectedOptionIds: (a.selectedOptionIds as string[]) ?? [],
            })),
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{test.title}</h1>
                {test.description && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {test.description}
                    </p>
                )}
            </div>

            <TestRunner test={payload} initialAttempt={attempt} />
        </div>
    );
};

export default TakeTestPage;
