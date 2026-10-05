import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Teacher: the test library.
//
// A test is a standalone assessment rather than a lesson, so this is a flat
// list of everything the teacher has authored — no course/chapter hierarchy to
// navigate. Each row links to the editor and shows how many students have
// attempted it, which is what tells a teacher whether a shared test is being
// used.
const TestsPage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const tests = await db.test.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { mcqs: true, problems: true, attempts: true },
            },
        },
    });

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Tests</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Standalone assessments with MCQs and coding questions. Share a
                        published test by sending its link.
                    </p>
                </div>
                <Link href="/teacher/tests/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New test
                    </Button>
                </Link>
            </div>

            {tests.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center">
                    <p className="text-muted-foreground">
                        No tests yet. Create one to mix multiple-choice and coding
                        questions into a single shareable assessment.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tests.map((test) => (
                        <Link
                            key={test.id}
                            href={`/teacher/tests/${test.id}`}
                            className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:opacity-80 transition"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-medium truncate">{test.title}</h2>
                                    {test.isPublished ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20">
                                            Published
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20">
                                            Draft
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {test._count.mcqs} MCQ
                                    {test._count.mcqs === 1 ? "" : "s"} ·{" "}
                                    {test._count.problems} coding
                                    {test._count.problems === 1 ? "" : "s"}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-medium">
                                    {test._count.attempts}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    attempt{test._count.attempts === 1 ? "" : "s"}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TestsPage;
