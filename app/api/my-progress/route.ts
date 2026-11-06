import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

/**
 * Returns the signed-in user's completion state for a course as a plain map of
 * chapterId -> isCompleted. This is used to seed the browser-side progress
 * cache on first load; on repeat visits the client serves from localStorage
 * and skips this call entirely.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return new NextResponse("Missing courseId", { status: 400 });
    }

    const chapters = await db.chapter.findMany({
      where: { courseId, isPublished: true },
      select: { id: true },
    });
    const chapterIds = chapters.map((c) => c.id);

    const completed: Record<string, boolean> = {};
    if (chapterIds.length > 0) {
      const rows = await db.userProgress.findMany({
        where: {
          userId,
          chapterId: { in: chapterIds },
          isCompleted: true,
        },
        select: { chapterId: true },
      });
      for (const row of rows) completed[row.chapterId] = true;
    }

    return NextResponse.json({ completed });
  } catch (error) {
    console.log("[MY_PROGRESS]", error);
    return NextResponse.json({ completed: {} });
  }
}
