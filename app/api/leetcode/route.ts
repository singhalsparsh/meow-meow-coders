import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const { chapterId, title, url, difficulty, tags, notes } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { userId: true } } },
    });

    if (!chapter || chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get next position
    const lastQuestion = await db.leetCodeQuestion.findFirst({
      where: { chapterId },
      orderBy: { position: "desc" },
    });

    const question = await db.leetCodeQuestion.create({
      data: {
        title,
        url,
        difficulty: difficulty || "Medium",
        tags: tags || null,
        notes: notes || null,
        position: (lastQuestion?.position ?? -1) + 1,
        chapterId,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.log("[QUESTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
