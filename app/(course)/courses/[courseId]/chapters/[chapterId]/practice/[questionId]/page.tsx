import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  findPracticeQuestion,
  findStaticChapter,
  getChapterPracticeQuestions,
} from "@/lib/content";
import { isCourseFresh } from "@/actions/course-freshness";
import type { PracticeQuestionView as PracticeQuestionData } from "@/lib/content";
import { PracticeQuestionView } from "./_components/practice-question";

const PracticeQuestionPage = async (
  props: {
    params: Promise<{ courseId: string; chapterId: string; questionId: string }>;
  }
) => {
  const params = await props.params;
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  let question: PracticeQuestionData | null = null;
  let chapterTitle: string | undefined;
  let navList: { id: string; title: string }[] = [];

  const fresh = await isCourseFresh(params.courseId);
  const staticQuestion = fresh ? findPracticeQuestion(params.questionId) : undefined;

  if (staticQuestion) {
    const chapter = findStaticChapter(params.courseId, params.chapterId);
    chapterTitle = chapter?.title;
    navList = getChapterPracticeQuestions(params.chapterId).map((q) => ({
      id: q.id,
      title: q.title,
    }));
    question = staticQuestion;
  } else {
    const q = await db.leetCodeQuestion.findUnique({
      where: { id: params.questionId },
    });

    if (!q) {
      return redirect(`/courses/${params.courseId}/chapters/${params.chapterId}?tab=practice`);
    }

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId },
      select: { title: true },
    });
    chapterTitle = chapter?.title ?? undefined;

    navList = await db.leetCodeQuestion
      .findMany({
        where: { chapterId: params.chapterId },
        orderBy: { position: "asc" },
        select: { id: true, title: true },
      })
      .catch(() => []);

    question = {
      id: q.id,
      title: q.title,
      url: q.url,
      difficulty: q.difficulty,
      tags: q.tags,
      notes: q.notes,
      position: q.position,
      problemStatement: q.problemStatement,
      testCases: q.testCases,
      solution: q.solution,
    };
  }

  if (!question) {
    return redirect(`/courses/${params.courseId}/chapters/${params.chapterId}?tab=practice`);
  }

  const currentIdx = navList.findIndex((q) => q.id === params.questionId);
  const prevQuestion = currentIdx > 0 ? navList[currentIdx - 1] : null;
  const nextQuestion =
    currentIdx >= 0 && currentIdx < navList.length - 1
      ? navList[currentIdx + 1]
      : null;
  const questionsHref = `/courses/${params.courseId}/chapters/${params.chapterId}?tab=practice`;

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
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
            Extra Practice
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <BrainCircuit className="h-4 w-4 text-primary flex-shrink-0" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            {question.title}
          </h1>
          {navList.length > 1 && (
            <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
              {currentIdx + 1}/{navList.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {prevQuestion ? (
            <Link
              href={`/courses/${params.courseId}/chapters/${params.chapterId}/practice/${prevQuestion.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={`Previous: ${prevQuestion.title}`}
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
          {nextQuestion ? (
            <Link
              href={`/courses/${params.courseId}/chapters/${params.chapterId}/practice/${nextQuestion.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={`Next: ${nextQuestion.title}`}
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

      <div className="flex-1">
        <PracticeQuestionView question={question} />
      </div>
    </div>
  );
};

export default PracticeQuestionPage;
