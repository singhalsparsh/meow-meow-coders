import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const { chapterId, title, url } = await req.json();

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

    const lastNote = await db.pdfNote.findFirst({
      where: { chapterId },
      orderBy: { position: "desc" },
    });

    const note = await db.pdfNote.create({
      data: {
        title,
        url,
        position: (lastNote?.position ?? -1) + 1,
        chapterId,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.log("[PDF_NOTE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
