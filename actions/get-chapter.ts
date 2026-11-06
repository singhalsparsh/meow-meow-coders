import { db } from "@/lib/db";
import { buildPlayerSources } from "@/lib/video-proxy";
import { findStaticChapter, findStaticCourse } from "@/lib/content";

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
    // Course/chapter content is static; per-user progress is the only DB read.
    const course = findStaticCourse(courseId);

    if (!course) {
      throw new Error("Chapter or course not found");
    }

    // The course owner can preview their own course, even when it is
    // unpublished and the chapters are not yet published or paid.
    const isOwner = course.userId === userId;

    if (!course.isPublished && !isOwner) {
      throw new Error("Chapter or course not found");
    }

    const chapter = findStaticChapter(courseId, chapterId);

    if (!chapter || (!isOwner && !chapter.isPublished)) {
      throw new Error("Chapter or course not found");
    }

    const userProgress = await db.userProgress
      .findUnique({
        where: {
          userId_chapterId: { userId, chapterId },
        },
      })
      .catch(() => null);

    // Assemble every playable stream.
    const playerSources = buildPlayerSources({
      muxPlaybackId: chapter.muxData?.playbackId,
      streams: chapter.videoSources.map((s) => ({
        id: s.id,
        src: s.src,
        title: s.title,
      })),
      videoUrl: chapter.videoUrl,
      fallbackTitle: chapter.title,
    });

    // Attach extra data to the chapter object for the student-facing pages.
    const chapterWithExtras = {
      ...chapter,
      leetcodeQuestions: chapter.leetcodeQuestions,
      pdfNotes: chapter.pdfNotes,
    };

    const orderedChapters = course.chapters
      .filter((item) => item.isPublished)
      .filter((item) => item.parentId === null)
      .flatMap((topic) => [
        topic,
        ...course.chapters.filter(
          (item) => item.parentId === topic.id && item.isPublished,
        ),
      ]);

    const currentIndex = orderedChapters.findIndex((item) => item.id === chapterId);

    const nextChapter =
      currentIndex >= 0 && currentIndex < orderedChapters.length - 1
        ? orderedChapters[currentIndex + 1]
        : null;

    const previousChapter =
      currentIndex > 0 ? orderedChapters[currentIndex - 1] : null;

    return {
      chapter: chapterWithExtras,
      course: {
        id: course.id,
        userId: course.userId,
        isPublished: course.isPublished,
        title: course.title,
      },
      muxData: chapter.muxData,
      attachments: course.attachments,
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
