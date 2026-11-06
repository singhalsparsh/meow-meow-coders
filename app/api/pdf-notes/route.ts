import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function deriveTitle(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    let last = parts[parts.length - 1] ?? "";
    last = decodeURIComponent(last).replace(/\.(pdf|PDF)$/, "");
    if (last) return last.replace(/[-_]+/g, " ");
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const { chapterId, url } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (typeof url !== "string" || !url.trim()) {
      return new NextResponse("URL is required", { status: 400 });
    }

    const title = typeof url === "string" ? deriveTitle(url.trim()) : "PDF Notes";

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
