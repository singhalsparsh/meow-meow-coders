import { getChapter } from "@/actions/get-chapter";
import { getChapterCodingProblems } from "@/lib/content";
import { db } from "@/lib/db";
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

    // Chapter content (video/attachments/notes/questions) is static for content
    // in the snapshot; newly created/edited chapters fall back to the DB (via
    // getChapter's contentSource). Coding problems follow the same rule.
    const chapterData = await getChapter({
        userId,
        chapterId: params.chapterId,
        courseId: params.courseId,
    });

    const { contentSource } = chapterData;

    // Load a chapter's problems from one bucket (lesson problems or extra
    // practice). Static snapshot content predates the category column, so the
    // snapshot path returns the whole snapshot set for coding and nothing for
    // practice; the DB path filters by category (public cases only — hidden
    // cases are fetched on Submit by the submission-suite endpoint).
    const fetchChapterProblems = async (
        category: "CODING" | "PRACTICE"
    ): Promise<any[]> => {
        if (contentSource === "static") {
            if (category === "CODING") {
                return getChapterCodingProblems(params.chapterId);
            }
            return [];
        }
        if (!chapterData.chapter) return [];
        try {
            const rows = await db.codingProblem.findMany({
                where: { chapterId: params.chapterId, category },
                orderBy: { position: "asc" },
                include: {
                    testCases: {
                        where: { isHidden: false },
                        orderBy: { order: "asc" },
                    },
                },
            });
            return rows.map((p) => ({
                id: p.id,
                chapterId: p.chapterId ?? "",
                title: p.title,
                difficulty: p.difficulty,
                topic: p.topic,
                description: p.description,
                constraints: p.constraints,
                solution: p.solution,
                starterCode: p.starterCode,
                driverCode: p.driverCode,
                timeLimitMs: p.timeLimitMs,
                position: p.position,
                testCases: p.testCases.map((tc) => ({
                    id: tc.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    explanation: tc.explanation,
                    isHidden: tc.isHidden,
                    order: tc.order,
                })),
            }));
        } catch {
            return [];
        }
    };

    const codingProblems = await fetchChapterProblems("CODING");
    const practiceProblems = await fetchChapterProblems("PRACTICE");

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
                userId={userId}
                isCompleted={!!userProgress?.isCompleted}
                playbackId={muxData?.playbackId || ""}
                videoUrl={videoUrl || undefined}
                videoSources={videoSources}
                isLocked={isLocked}
                completeOnEnd={completeOnEnd}
                attachments={attachments.map((a) => ({ id: a.id, name: a.name, url: a.url }))}
                pdfNotes={pdfNotes}
                practiceProblems={practiceProblems}
                codingProblems={codingProblems}
            />
        </div>
    )
}

export default ChapterIdPage;
