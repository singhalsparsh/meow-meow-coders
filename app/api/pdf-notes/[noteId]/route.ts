import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { userId } = await auth();
    const { noteId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const note = await db.pdfNote.findUnique({
      where: { id: noteId },
      include: { chapter: { select: { course: { select: { userId: true } } } } },
    });

    if (!note || note.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.pdfNote.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[PDF_NOTE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { userId } = await auth();
    const { noteId } = await params;
    const values = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const note = await db.pdfNote.findUnique({
      where: { id: noteId },
      include: { chapter: { select: { course: { select: { userId: true } } } } },
    });

    if (!note || note.chapter.course.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updated = await db.pdfNote.update({
      where: { id: noteId },
      data: { ...values },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.log("[PDF_NOTE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
