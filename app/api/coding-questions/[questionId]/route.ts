import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { userId } = await auth();
    const { questionId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const question = await db.codingQuestion.findUnique({
      where: { id: questionId },
      include: { chapter: { select: { course: { select: { userId: true } } } } },
    });

    if (!question || question.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.codingQuestion.delete({ where: { id: questionId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[CODING_QUESTION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { userId } = await auth();
    const { questionId } = await params;
    const values = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const question = await db.codingQuestion.findUnique({
      where: { id: questionId },
      include: { chapter: { select: { course: { select: { userId: true } } } } },
    });

    if (!question || question.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updated = await db.codingQuestion.update({
      where: { id: questionId },
      data: { ...values },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[CODING_QUESTION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
