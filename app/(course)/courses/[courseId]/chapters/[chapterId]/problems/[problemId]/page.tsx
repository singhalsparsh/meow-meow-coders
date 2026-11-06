import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Code2, ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import {
  findCodingProblem,
  findStaticChapter,
  getChapterCodingProblems,
} from "@/lib/content";
import { isCourseFresh } from "@/actions/course-freshness";
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

  // Problem + chapter content are static when present in the snapshot;
  // newly created/edited problems fall back to the DB. Submissions are always
  // per-user, so they come from the DB in both cases.
  let payload: CodingProblemPayload | null = null;
  let chapterTitle: string | undefined;

  // Ordered list of this chapter's problems, used for prev/next navigation.
  let navList: { id: string; title: string }[] = [];

  // Only use the static snapshot when the host course is fresh (no teacher
  // edits since the last export); otherwise fall back to the DB below.
  const fresh = await isCourseFresh(params.courseId);
  const staticProblem = fresh ? findCodingProblem(params.problemId) : undefined;

  if (staticProblem) {
    const chapter = findStaticChapter(params.courseId, params.chapterId);
    chapterTitle = chapter?.title;
    navList = getChapterCodingProblems(params.chapterId).map((p) => ({
      id: p.id,
      title: p.title,
    }));
    payload = {
      id: staticProblem.id,
      chapterId: staticProblem.chapterId,
      title: staticProblem.title,
      difficulty: staticProblem.difficulty,
      topic: staticProblem.topic,
      description: staticProblem.description,
      constraints: staticProblem.constraints,
      solution: staticProblem.solution,
      starterCode: staticProblem.starterCode,
      driverCode: staticProblem.driverCode,
      timeLimitMs: staticProblem.timeLimitMs,
      testCases: staticProblem.testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        explanation: tc.explanation,
        isHidden: tc.isHidden,
        order: tc.order,
      })),
    };
  } else {
    const problem = await db.codingProblem.findUnique({
      where: { id: params.problemId },
      include: {
        testCases: {
          where: { isHidden: false },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!problem) {
      return redirect(`/courses/${params.courseId}/chapters/${params.chapterId}?tab=coding`);
    }

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId },
      select: { title: true },
    });
    chapterTitle = chapter?.title ?? undefined;

    navList = await db.codingProblem
      .findMany({
        where: { chapterId: params.chapterId },
        orderBy: { position: "asc" },
        select: { id: true, title: true },
      })
      .catch(() => []);

    payload = {
      id: problem.id,
      chapterId: problem.chapterId ?? "",
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
  }

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

  const currentIdx = navList.findIndex((p) => p.id === params.problemId);
  const prevProblem = currentIdx > 0 ? navList[currentIdx - 1] : null;
  const nextProblem =
    currentIdx >= 0 && currentIdx < navList.length - 1
      ? navList[currentIdx + 1]
      : null;
  const questionsHref = `/courses/${params.courseId}/chapters/${params.chapterId}?tab=coding`;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 sm:px-4 h-12 flex-shrink-0">
        <Link
          href={questionsHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline truncate max-w-[160px]">
            {chapterTitle ?? "Lesson"}
          </span>
          <span className="hidden md:inline text-muted-foreground/60">·</span>
          <span className="hidden md:inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />
            Questions
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <Code2 className="h-4 w-4 text-primary flex-shrink-0" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            {payload.title}
          </h1>
          {navList.length > 1 && (
            <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
              {currentIdx + 1}/{navList.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {prevProblem ? (
            <Link
              href={`/courses/${params.courseId}/chapters/${params.chapterId}/problems/${prevProblem.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={`Previous: ${prevProblem.title}`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline">Prev</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground/40 cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline">Prev</span>
            </span>
          )}
          {nextProblem ? (
            <Link
              href={`/courses/${params.courseId}/chapters/${params.chapterId}/problems/${nextProblem.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={`Next: ${nextProblem.title}`}
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground/40 cursor-not-allowed">
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
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
