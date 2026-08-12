import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

interface SourceInput {
  src?: unknown;
  title?: unknown;
}

/**
 * Replace the list of streaming URLs for a chapter.
 *
 * Body: `{ sources: [{ src: string, title?: string }, ...] }`
 * The stored list replaces whatever was there before. `videoUrl` (used by the
 * Upload / Mux path and by legacy single-URL data) is left untouched so the
 * two inputs stay independent.
 */
export async function PUT(
    req: Request,
    props: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth()
        const body = (await req.json()) as { sources?: SourceInput[] };

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
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: params.chapterId,
                courseId: params.courseId,
            }
        });

        if (!chapter) {
            return new NextResponse("Not found", { status: 404 });
        }

        const normalized = (Array.isArray(body.sources) ? body.sources : [])
            .filter((source) => typeof source?.src === "string" && source.src.trim().length > 0)
            .map((source, index) => ({
                src: (source.src as string).trim(),
                title:
                    typeof source.title === "string" && source.title.trim().length > 0
                        ? source.title.trim()
                        : null,
                position: index,
            }));

        await db.$transaction([
            db.videoSource.deleteMany({
                where: { chapterId: params.chapterId },
            }),
            db.videoSource.createMany({
                data: normalized.map((source) => ({
                    ...source,
                    chapterId: params.chapterId,
                })),
            }),
        ]);

        const videoSources = await db.videoSource.findMany({
            where: { chapterId: params.chapterId },
            orderBy: { position: "asc" },
        });

        return NextResponse.json(videoSources);
    } catch (error) {
        console.log("[CHAPTER_VIDEO_SOURCES]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
