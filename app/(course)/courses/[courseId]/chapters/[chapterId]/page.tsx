import { getChapter } from "@/actions/get-chapter";
import { Banner } from "@/components/ui/banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoPlayer } from "./_components/video-player";
import { Preview } from "@/components/preview";
import { File, Code2, Paperclip, BookOpen } from "lucide-react";
import { CourseProgressButton } from "./_components/course-progress-button";
import { ChapterNav } from "./_components/chapter-nav";
import { ScrollToTop } from "./_components/scroll-to-top";
import { LeetcodeQuestions } from "@/components/leetcode-questions";
import { PdfNotes } from "@/components/pdf-notes";
import { db } from "@/lib/db";
import { CodingWorkspace } from "@/components/coding-workspace/coding-workspace";


const ChapterIdPage = async (
    props: {
        params: Promise<{ courseId: string; chapterId: string; }>
    }
) => {
    const params = await props.params;
    const { userId } = await auth()

    if (!userId) {
        return redirect("/")
    }

    const {
        chapter,
        course,
        muxData,
        attachments,
        nextChapter,
        previousChapter,
        userProgress,
        purchase,
        isOwner,
        videoUrl,
        videoSources } = await getChapter({
            userId,
            chapterId: params.chapterId,
            courseId: params.courseId
        })

    // In-browser DSA problem attached to this chapter (public cases only;
    // hidden cases are fetched on Submit from the submission-suite endpoint).
    let codingProblems: any[] = [];
    try {
        codingProblems = await db.codingProblem.findMany({
            where: { chapterId: params.chapterId },
            orderBy: { position: "asc" },
            include: {
                testCases: {
                    where: { isHidden: false },
                    orderBy: { order: "asc" },
                },
                submissions: {
                    where: { userId },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
        });
    } catch {
        // Table may not exist yet
    }

    if (!chapter || !course) {
        return redirect("/")
    }

    const isLocked = false // All content is free for logged-in users
    const completeOnEnd = !userProgress?.isCompleted

    return (
        <div className="min-h-screen bg-page-gradient">
            <ScrollToTop />
            {userProgress?.isCompleted && (
                <Banner
                    variant="success"
                    label="You have already completed this chapter"
                />
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {/* Page header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                            {course.title}
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
                            {chapter.title}
                        </h1>
                    </div>
                    {!isOwner && (
                        <CourseProgressButton
                            chapterId={params.chapterId}
                            courseId={params.courseId}
                            nextChapterId={nextChapter?.id}
                            isCompleted={!!userProgress?.isCompleted}
                        />
                    )}
                </div>

                {/* Video block */}
                <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-12px_rgba(0,0,0,0.2)]">
                    <VideoPlayer
                        chapterId={params.chapterId}
                        title={chapter.title}
                        courseId={params.courseId}
                        nextChapterId={nextChapter?.id}
                        playbackId={muxData?.playbackId || ""}
                        videoUrl={videoUrl || undefined}
                        videoSources={videoSources}
                        isLocked={isLocked}
                        completeOnEnd={completeOnEnd}
                    />
                </div>

                {/* Content grid */}
                <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Main column */}
                    <div className="min-w-0 space-y-6">
                        {chapter.description && (
                            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                                <h2 className="text-lg font-semibold tracking-tight mb-3">
                                    About this lesson
                                </h2>
                                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                                    <Preview value={chapter.description} />
                                </div>
                            </section>
                        )}

                        {!!(chapter as any).pdfNotes?.length && (
                            <PdfNotes notes={(chapter as any).pdfNotes} />
                        )}

                        {!!(chapter as any).leetcodeQuestions?.length && (
                            <LeetcodeQuestions questions={(chapter as any).leetcodeQuestions} />
                        )}

                        {codingProblems.map((problem, index) => (
                            <section key={problem.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                        <Code2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {"Coding Challenge" + (codingProblems.length > 1 ? " " + (index + 1) : "")}
                                    </h3>
                                </div>
                                <CodingWorkspace
                                    problem={problem}
                                    submissions={problem.submissions}
                                    apiBase={`/api/courses/${params.courseId}/chapters/${params.chapterId}`}
                                />
                            </section>
                        ))}
                    </div>

                    {/* Resource sidebar */}
                    {!!attachments.length && (
                        <aside className="min-w-0">
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
                                <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    Attachments
                                    <span className="ml-auto text-xs font-medium text-muted-foreground">{attachments.length}</span>
                                </h3>
                                <div className="space-y-2">
                                    {attachments.map((attachment) => (
                                        <a
                                            target="_blank"
                                            key={attachment.id}
                                            href={attachment.url}
                                            className="flex items-center gap-3 p-3 w-full rounded-xl border border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-accent transition-colors"
                                        >
                                            <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <p className="text-sm truncate">{attachment.name}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>

                <ChapterNav
                    courseId={params.courseId}
                    previousChapter={previousChapter ? { id: previousChapter.id, title: previousChapter.title } : null}
                    nextChapter={nextChapter ? { id: nextChapter.id, title: nextChapter.title } : null}
                />
            </div>
        </div>
    )
}

export default ChapterIdPage;
