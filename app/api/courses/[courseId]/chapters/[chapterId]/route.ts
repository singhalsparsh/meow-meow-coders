import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { video } from "@/lib/mux";
import { isOwnUploadUrl } from "@/lib/video";

export async function DELETE(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const ownCourse = await db.course.findUnique({
            where: {
                id: params.courseId,
                userId,
            }
        });

        if (!ownCourse) {
            return new NextResponse("Internal error", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: params.chapterId,
                courseId: params.courseId
            }
        });

        if (!chapter) {
            return new NextResponse("Not found", { status: 404 });
        }

        if (chapter.videoUrl) {
            const existingMuxData = await db.muxData.findFirst({
                where: {
                    chapterId: params.chapterId
                }
            })

            if (existingMuxData) {
                if (existingMuxData.assetId) {
                    // Mux may be unconfigured (no MUX_TOKEN_ID/SECRET) — never
                    // let that block deleting the chapter.
                    try {
                        await video().Assets.del(existingMuxData.assetId)
                    } catch (error) {
                        console.log("[CHAPTER_ID_DELETE_MUX]", error)
                    }
                }
                await db.muxData.delete({
                    where: {
                        id: existingMuxData.id
                    }
                })
            }
        }

        const deletedChapter = await db.chapter.delete({
            where: {
                id: params.chapterId
            }
        })

        const publishedChaptersInCourse = await db.chapter.findMany({
            where: {
                courseId: params.courseId,
                isPublished: true
            }
        })

        if (!publishedChaptersInCourse.length) {
            await db.course.update({
                where: {
                    id: params.courseId
                },
                data: {
                    isPublished: false
                }
            })
        }

        return NextResponse.json(deletedChapter)

    } catch (error) {
        console.log("CHAPTER_ID_DELETE", error)
        return new NextResponse("Internal error", { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth()
        const { isPublished, ...values } = await req.json()

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const ownCourse = await db.course.findUnique({
            where: {
                id: params.courseId,
                userId,
            }
        });

        if (!ownCourse) {
            return new NextResponse("Internal error", { status: 401 });
        }

        const chapter = await db.chapter.update({
            where: {
                id: params.chapterId,
                courseId: params.courseId
            },
            data: {
                ...values
            }
        })

        // A videoUrl is either an UploadThing upload (the "Upload" mode) or an
        // external direct / YouTube link (the "Video URL" mode). External links
        // are stored as-is and played with the built-in player — no Mux ingest.
        // Only our own UploadThing uploads are sent to Mux for transcoding.
        if (values.videoUrl) {
            const ingestToMux = isOwnUploadUrl(values.videoUrl)
            try {
                const existingMuxData = await db.muxData.findFirst({
                    where: {
                        chapterId: params.chapterId
                    }
                })

                if (existingMuxData) {
                    if (existingMuxData.assetId) {
                        try {
                            await video().Assets.del(existingMuxData.assetId)
                        } catch (error) {
                            console.log("[COURSES_CHAPTER_ID_MUX_DEL]", error)
                        }
                    }
                    await db.muxData.delete({
                        where: {
                            id: existingMuxData.id
                        }
                    })
                }

                if (ingestToMux) {
                    const asset = await video().Assets.create({
                        input: values.videoUrl,
                        playback_policy: "public",
                        test: false
                    })

                    await db.muxData.create({
                        data: {
                            chapterId: chapter.id,
                            assetId: asset.id,
                            playbackId: asset.playback_ids?.[0]?.id
                        }
                    })
                }
            } catch (error) {
                // Mux may be unconfigured (missing MUX_TOKEN_ID / MUX_TOKEN_SECRET)
                // or the source may not be ingestible. The chapter is already saved
                // with its videoUrl, so the player falls back to the native <video>.
                // Don't fail the request just because transcoding did.
                console.log("[COURSES_CHAPTER_ID]", error)
            }
        }



        return NextResponse.json(chapter)
    } catch (error) {
        console.log("COURSES_CHAPTER_ID", error)
        return new NextResponse("Internal error", { status: 500 })
    }
}