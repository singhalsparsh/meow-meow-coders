import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const { chapterId, title, difficulty, problemStatement, testCases, solution } = await req.json();

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

    const lastQuestion = await db.codingQuestion.findFirst({
      where: { chapterId },
      orderBy: { position: "desc" },
    });

    const question = await db.codingQuestion.create({
      data: {
        title,
        difficulty: difficulty || "Medium",
        problemStatement,
        testCases: JSON.stringify(testCases || []),
        solution: solution || null,
        position: (lastQuestion?.position ?? -1) + 1,
        chapterId,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.log("[CODING_QUESTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
