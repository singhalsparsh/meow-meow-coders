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

    // Fetch leetcode questions separately so a missing table doesn't block chapter loading
    let leetcodeQuestions: any[] = [];
    try {
      leetcodeQuestions = await db.leetCodeQuestion.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      });
    } catch {
      // Table may not exist yet
    }

    let muxData = null;
    let attachments: Attachment[] = [];
    let nextChapter: Chapter | null = null;
    let playerSources: ReturnType<typeof buildPlayerSources> = [];

    attachments = await db.attachment.findMany({
      where: {
        courseId: courseId
      }
    });

    muxData = await db.muxData.findUnique({
        where: {
          chapterId: chapterId,
        }
      });

      const streamRows = await db.videoSource.findMany({
        where: {
          chapterId: chapterId,
        },
        orderBy: {
          position: "asc",
        },
      });

      // Assemble every playable stream and wrap each in a signed proxy URL so
      // the CDN host never appears in the client's network tab.
      playerSources = buildPlayerSources({
        muxPlaybackId: muxData?.playbackId,
        streams: streamRows.map((s) => ({ id: s.id, src: s.src, title: s.title })),
        videoUrl: chapter.videoUrl,
        fallbackTitle: chapter.title,
      });

      // Fetch PDF notes
    let pdfNotes: any[] = [];
    try {
      pdfNotes = await db.pdfNote.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      });
    } catch {
      // Table may not exist yet
    }

    // Fetch coding questions
    let codingQuestions: any[] = [];
    try {
      codingQuestions = await db.codingQuestion.findMany({
        where: { chapterId },
        orderBy: { position: "asc" },
      });
    } catch {
      // Table may not exist yet
    }

      // Attach extra data to the chapter object for the student-facing pages
      (chapter as any).leetcodeQuestions = leetcodeQuestions;
      (chapter as any).pdfNotes = pdfNotes;
      (chapter as any).codingQuestions = codingQuestions;

      nextChapter = await db.chapter.findFirst({
        where: {
          courseId: courseId,
          isPublished: true,
          position: {
            gt: chapter?.position,
          }
        },
        orderBy: {
          position: "asc",
        }
      });

    const userProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId,
        }
      }
    });

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
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
      userProgress: null,
      purchase: null,
      isOwner: false,
      videoUrl: null,
      videoSources: [],
    }
  }
}