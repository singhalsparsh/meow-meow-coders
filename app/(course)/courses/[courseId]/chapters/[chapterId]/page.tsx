import { getChapter } from "@/actions/get-chapter";
import { Banner } from "@/components/ui/banner";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VideoPlayer } from "./_components/video-player";
import { Preview } from "@/components/preview";
import { Separator } from "@/components/ui/separator";
import { File } from "lucide-react";
import { CourseProgressButton } from "./_components/course-progress-button";


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
        userProgress,
        purchase,
        isOwner,
        videoUrl,
        videoSources } = await getChapter({
            userId,
            chapterId: params.chapterId,
            courseId: params.courseId
        })

    if (!chapter || !course) {
        return redirect("/")
    }

    const isLocked = !isOwner && !chapter.isFree
    const completeOnEnd = !userProgress?.isCompleted


    return (
        <div>
            {userProgress?.isCompleted && (
                <Banner
                    variant="success"
                    label="You have already completed this chapter"
                />
            )}

            <div className="flex flex-col max-w-5xl mx-auto pb-20">
                <div className="p-4 md:p-6">
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
                <div className="px-4 md:px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {chapter.title}
                        </h2>
                        {isOwner ? null : (
                            <CourseProgressButton
                                chapterId={params.chapterId}
                                courseId={params.courseId}
                                nextChapterId={nextChapter?.id}
                                isCompleted={!!userProgress?.isCompleted}
                            />
                        )}
                    </div>
                    {chapter.description && (
                        <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
                            <Preview value={chapter.description} />
                        </div>
                    )}
                    {!!attachments.length && (
                        <>
                            <Separator className="my-4" />
                            <div className="space-y-2 pb-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Attachments</h3>
                                {attachments.map((attachment) => (
                                    <a
                                        target="_blank"
                                        key={attachment.id}
                                        href={attachment.url}
                                        className="flex items-center gap-3 p-3 w-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                                    >
                                        <File className="h-4 w-4 flex-shrink-0" />
                                        <p className="text-sm truncate">{attachment.name}</p>
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ChapterIdPage;
