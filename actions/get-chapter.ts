import { db } from "@/lib/db";
import { buildPlayerSources } from "@/lib/video-proxy";
import { findStaticChapter, findStaticCourse } from "@/lib/content";
import { isCourseFresh } from "@/actions/course-freshness";

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
};

type GetChapterResult = {
  chapter: any;
  course: { id: string; userId: string; isPublished: boolean; title: string } | null;
  muxData: any;
  attachments: any[];
  nextChapter: any;
  previousChapter: any;
  userProgress: any;
  purchase: null;
  isOwner: boolean;
  videoUrl: string | null;
  videoSources: any[];
  /**
   * Where this chapter's content was resolved from. "static" means it came
   * from the checked-in JSON snapshot; "db" means it fell back to Aiven
   * (newly created / edited content not yet in the snapshot). The caller uses
   * this to decide whether related coding problems should be read statically
   * or from the database.
   */
  contentSource: "static" | "db";
};

const DEFAULT_RESULT: GetChapterResult = {
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
  contentSource: "db",
};

/**
 * Fallback path: the course/chapter is not yet in the static snapshot (newly
 * created or edited), so load everything from the database — the original
 * behavior.
 */
async function getChapterFromDb({ userId, courseId, chapterId }: GetChapterProps) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true, isPublished: true, title: true },
  });

  if (!course) {
    throw new Error("Chapter or course not found");
  }

  const isOwner = course.userId === userId;

  if (!course.isPublished && !isOwner) {
    throw new Error("Chapter or course not found");
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId, ...(isOwner ? {} : { isPublished: true }) },
  });

  if (!chapter) {
    throw new Error("Chapter or course not found");
  }

  const [leetcodeQuestions, attachments, muxData, streamRows, pdfNotes, allChapters, userProgress] =
    await Promise.all([
      db.leetCodeQuestion
        .findMany({ where: { chapterId }, orderBy: { position: "asc" } })
        .catch(() => []),
      db.attachment.findMany({ where: { courseId } }),
      db.muxData.findUnique({ where: { chapterId } }),
      db.videoSource.findMany({ where: { chapterId }, orderBy: { position: "asc" } }),
      db.pdfNote
        .findMany({ where: { chapterId }, orderBy: { position: "asc" } })
        .catch(() => []),
      db.chapter.findMany({ where: { courseId, isPublished: true }, orderBy: { position: "asc" } }),
      db.userProgress.findUnique({ where: { userId_chapterId: { userId, chapterId } } }),
    ]);

  const playerSources = buildPlayerSources({
    muxPlaybackId: muxData?.playbackId,
    streams: streamRows.map((s) => ({ id: s.id, src: s.src, title: s.title })),
    videoUrl: chapter.videoUrl,
    fallbackTitle: chapter.title,
  });

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

  const previousChapter = currentIndex > 0 ? orderedChapters[currentIndex - 1] : null;

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
    contentSource: "db" as const,
  };
}

/**
 * Preferred path: the course/chapter is in the static snapshot, so content is
 * served without touching the database. Only the user's progress is read live.
 */
async function getChapterFromStatic({ userId, courseId, chapterId }: GetChapterProps) {
  const course = findStaticCourse(courseId);

  if (!course) {
    throw new Error("Chapter or course not found");
  }

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
      where: { userId_chapterId: { userId, chapterId } },
    })
    .catch(() => null);

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
      ...course.chapters.filter((item) => item.parentId === topic.id && item.isPublished),
    ]);

  const currentIndex = orderedChapters.findIndex((item) => item.id === chapterId);

  const nextChapter =
    currentIndex >= 0 && currentIndex < orderedChapters.length - 1
      ? orderedChapters[currentIndex + 1]
      : null;

  const previousChapter = currentIndex > 0 ? orderedChapters[currentIndex - 1] : null;

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
    contentSource: "static" as const,
  };
}

export const getChapter = async (props: GetChapterProps): Promise<GetChapterResult> => {
  try {
    const staticCourse = findStaticCourse(props.courseId);
    const staticChapter = staticCourse
      ? findStaticChapter(props.courseId, props.chapterId)
      : undefined;

    if (staticCourse && staticChapter && (await isCourseFresh(props.courseId))) {
      return getChapterFromStatic(props);
    }

    return getChapterFromDb(props);
  } catch (error) {
    console.log("[GET_CHAPTER]", error);
    return { ...DEFAULT_RESULT };
  }
}
