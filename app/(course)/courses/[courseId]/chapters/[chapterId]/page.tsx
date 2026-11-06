import { getChapter } from "@/actions/get-chapter";
import { getChapterCodingProblems } from "@/lib/content";
import { Banner } from "@/components/ui/banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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

    // Chapter content (video/attachments/notes/questions) is static; only the
    // per-user progress comes from the DB (via getChapter). Coding problems are
    // also static here — hidden test cases are fetched by the submit endpoint.
    const chapterData = await getChapter({
        userId,
        chapterId: params.chapterId,
        courseId: params.courseId,
    });

    const codingProblems = getChapterCodingProblems(params.chapterId);

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
        videoSources,
    } = chapterData;

    // PDF notes and extra-practice questions attached to the chapter object —
    // flatten to plain serializable objects.
    const pdfNotes = ((chapter as any).pdfNotes || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        url: n.url,
        position: n.position,
    }));
    const leetcodeQuestions = ((chapter as any).leetcodeQuestions || []).map(
        (q: any) => ({
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
        })
    );

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
                pdfNotes={pdfNotes}
                leetcodeQuestions={leetcodeQuestions}
                codingProblems={codingProblems}
            />
        </div>
    )
}

export default ChapterIdPage;
