import { db } from "@/lib/db";
import { buildPlayerSources } from "@/lib/video-proxy";
import { Attachment, Chapter } from "@prisma/client";

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
};

export const getChapter = async ({
  userId,
  courseId,
  chapterId,
}: GetChapterProps) => {
  try {
    const course = await db.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        userId: true,
        isPublished: true,
        title: true,
      }
    });

    if (!course) {
      throw new Error("Chapter or course not found");
    }

    // The course owner can preview their own course, even when it is
    // unpublished and the chapters are not yet published or paid.
    const isOwner = course.userId === userId;

    if (!course.isPublished && !isOwner) {
      throw new Error("Chapter or course not found");
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        ...(isOwner ? {} : { isPublished: true }),
      },
    });

    if (!chapter) {
      throw new Error("Chapter or course not found");
    }

    // The remaining lookups are independent of each other, so run them in
    // parallel (Promise.all) instead of serially — on a remote database this
    // collapses ~7 round-trips into 1 and cuts the page's time-to-first-byte.
    const [
      leetcodeQuestions,
      attachments,
      muxData,
      streamRows,
      pdfNotes,
      allChapters,
      userProgress,
    ] = await Promise.all([
      // Fetch leetcode questions separately so a missing table doesn't block
      // chapter loading.
      db.leetCodeQuestion.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      }).catch(() => []),
      db.attachment.findMany({
        where: { courseId },
      }),
      db.muxData.findUnique({
        where: { chapterId },
      }),
      db.videoSource.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      }),
      // Fetch PDF notes (table may not exist yet).
      db.pdfNote.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      }).catch(() => []),
      // Chapters may be nested one level deep, and position is scoped to a
      // sibling group, so previous/next must be derived from the flattened
      // topic -> sub-lesson order rather than by comparing raw positions.
      db.chapter.findMany({
        where: { courseId, isPublished: true },
        orderBy: { position: "asc" },
      }),
      db.userProgress.findUnique({
        where: {
          userId_chapterId: { userId, chapterId },
        },
      }),
    ]);

    // Assemble every playable stream.
    const playerSources = buildPlayerSources({
      muxPlaybackId: muxData?.playbackId,
      streams: streamRows.map((s) => ({ id: s.id, src: s.src, title: s.title })),
      videoUrl: chapter.videoUrl,
      fallbackTitle: chapter.title,
    });

    // Attach extra data to the chapter object for the student-facing pages.
    (chapter as any).leetcodeQuestions = leetcodeQuestions;
    (chapter as any).pdfNotes = pdfNotes;

    const orderedChapters = allChapters
      .filter((item) => item.parentId === null)
      .flatMap((topic) => [
        topic,
        ...allChapters.filter((item) => item.parentId === topic.id),
      ]);

    const currentIndex = orderedChapters.findIndex((item) => item.id === chapterId);

    const nextChapter =
      currentIndex >= 0 && currentIndex < orderedChapters.length - 1
        ? orderedChapters[currentIndex + 1]
        : null;

    const previousChapter =
      currentIndex > 0 ? orderedChapters[currentIndex - 1] : null;

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
      previousChapter,
      userProgress,
      purchase: null,
      isOwner,
      videoUrl: chapter.videoUrl,
      videoSources: playerSources,
    };
  } catch (error) {
    console.log("[GET_CHAPTER]", error);
    return {
      chapter: null,
      course: null,
      muxData: null,
      attachments: [],
      nextChapter: null,
      previousChapter: null,
      userProgress: null,
      purchase: null,
      isOwner: false,
      videoUrl: null,
      videoSources: [],
    }
  }
}