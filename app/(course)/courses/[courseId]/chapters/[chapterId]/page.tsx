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
    // Rows are mapped to plain serializable objects (no Dates) before being
    // passed to the client LessonShell — raw Prisma rows with Date fields
    // cannot be serialized into client-component props and make the page error.
    let codingProblems: any[] = [];
    try {
        const rows = await db.codingProblem.findMany({
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

        codingProblems = rows.map((p) => ({
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
            submissions: p.submissions.map((s) => ({
                id: s.id,
                status: s.status,
                passedCount: s.passedCount,
                totalCount: s.totalCount,
                runtimeMs: s.runtimeMs,
                createdAt: s.createdAt.toISOString(),
            })),
        }));
    } catch {
        // Table may not exist yet
    }

    // Same story for PDF notes and extra-practice questions attached to the
    // raw chapter object — flatten to plain serializable objects.
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
