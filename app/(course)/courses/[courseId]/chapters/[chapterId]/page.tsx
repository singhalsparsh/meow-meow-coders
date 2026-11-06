import { getChapter } from "@/actions/get-chapter";
import { Banner } from "@/components/ui/banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LessonShell } from "./_components/lesson-shell";
import { ScrollToTop } from "./_components/scroll-to-top";

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

            <LessonShell
                courseTitle={course.title}
                chapterTitle={chapter.title}
                description={chapter.description}
                courseId={params.courseId}
                chapterId={params.chapterId}
                nextChapterId={nextChapter?.id}
                previousChapter={previousChapter ? { id: previousChapter.id, title: previousChapter.title } : null}
                nextChapter={nextChapter ? { id: nextChapter.id, title: nextChapter.title } : null}
                isOwner={isOwner}
                isCompleted={!!userProgress?.isCompleted}
                playbackId={muxData?.playbackId || ""}
                videoUrl={videoUrl || undefined}
                videoSources={videoSources}
                isLocked={isLocked}
                completeOnEnd={completeOnEnd}
                attachments={attachments.map((a) => ({ id: a.id, name: a.name, url: a.url }))}
                pdfNotes={(chapter as any).pdfNotes || []}
                leetcodeQuestions={(chapter as any).leetcodeQuestions || []}
                codingProblems={codingProblems}
            />
        </div>
    )
}

export default ChapterIdPage;
