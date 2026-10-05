import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";

import { TestForm } from "./_components/test-form";
import { McqForm } from "./_components/mcq-form";
import { CodingProblemForm } from "../../courses/[courseId]/chapters/[chapterId]/_components/coding-problem-form";

// Teacher: the test editor.
//
// Structured like the chapter editor: metadata on top, then the two question
// kinds as independent sections. A test has no video/attachment concepts, so it
// is a much smaller surface than a chapter — the interesting parts are the MCQ
// authoring and the coding problems, which reuse the lesson editor verbatim.
const TestEditPage = async ({
    params,
}: {
    params: Promise<{ testId: string }>;
}) => {
    const { testId } = await params;
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const test = await db.test.findUnique({
        where: { id: testId, userId },
        include: {
            mcqs: { orderBy: { position: "asc" } },
            problems: {
                orderBy: { position: "asc" },
                include: { testCases: { orderBy: { order: "asc" } } },
            },
            _count: { select: { attempts: true } },
        },
    });

    if (!test) {
        return redirect("/teacher/tests");
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <Link
                href="/teacher/tests"
                className="flex items-center text-sm hover:opacity-75 transition mb-6"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to tests
            </Link>

            <div className="flex flex-col gap-y-2 mb-8">
                <h1 className="text-2xl font-medium">Test setup</h1>
                <span className="text-sm text-slate-700 dark:text-slate-400">
                    Mix multiple-choice and coding questions. Students take a published
                    test from its link.
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <TestForm
                    initialData={{
                        title: test.title,
                        description: test.description,
                        isPublished: test.isPublished,
                        attempts: test._count?.attempts ?? 0,
                    }}
                />

                <McqForm
                    // `toDraft` in the form normalizes the JSON columns
                    // (options/correctOptionIds arrive as JsonValue), so the
                    // loose cast here is bounded by that normalizer.
                    initialData={{ mcqs: test.mcqs as any }}
                    testId={test.id}
                />

                <CodingProblemForm
                    initialData={{ problems: test.problems as any }}
                    apiBase={`/api/tests/${test.id}`}
                />
            </div>
        </div>
    );
};

export default TestEditPage;
