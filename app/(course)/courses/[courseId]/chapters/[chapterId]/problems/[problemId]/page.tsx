import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Code2 } from "lucide-react";
import { db } from "@/lib/db";
import { findCodingProblem, findStaticChapter } from "@/lib/content";
import { CodingWorkspace } from "@/components/coding-workspace/coding-workspace";
import type { CodingProblemPayload, ProblemSubmissionPayload } from "@/lib/coding/types";

const ProblemPage = async (
  props: {
    params: Promise<{ courseId: string; chapterId: string; problemId: string }>;
  }
) => {
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  // Problem + chapter content are static; only per-user submissions hit the DB.
  const problem = findCodingProblem(params.problemId);

  if (!problem) {
    return redirect(`/courses/${params.courseId}/chapters/${params.chapterId}`);
  }

  const chapter = findStaticChapter(params.courseId, params.chapterId);

  const submissions: ProblemSubmissionPayload[] = await db.problemSubmission
    .findMany({
      where: { userId, problemId: params.problemId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    .then((rows) =>
      rows.map((s) => ({
        id: s.id,
        status: s.status,
        passedCount: s.passedCount,
        totalCount: s.totalCount,
        runtimeMs: s.runtimeMs,
        createdAt: s.createdAt.toISOString(),
      })),
    )
    .catch(() => []);

  const payload: CodingProblemPayload = {
    id: problem.id,
    chapterId: problem.chapterId,
    title: problem.title,
    difficulty: problem.difficulty,
    topic: problem.topic,
    description: problem.description,
    constraints: problem.constraints,
    solution: problem.solution,
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
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 sm:px-6 h-12 flex-shrink-0">
        <Link
          href={`/courses/${params.courseId}/chapters/${params.chapterId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline truncate max-w-[180px]">
            {chapter?.title ?? "Lesson"}
          </span>
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="h-4 w-4 text-primary flex-shrink-0" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            {problem.title}
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CodingWorkspace
          problem={payload}
          submissions={submissions}
          apiBase={`/api/courses/${params.courseId}/chapters/${params.chapterId}`}
          fullPage
        />
      </div>
    </div>
  );
};

export default ProblemPage;
