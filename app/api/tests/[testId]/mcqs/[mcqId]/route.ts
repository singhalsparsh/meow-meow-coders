import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Teacher: delete one MCQ.
//
// Ownership is checked through the test (userId), and the delete is scoped by
// both mcqId and testId so a question from another test can never be removed
// by a crafted URL.
export async function DELETE(
    _req: Request,
    props: { params: Promise<{ testId: string; mcqId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const test = await db.test.findUnique({
            where: { id: params.testId, userId },
            select: { id: true },
        });

        if (!test) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await db.testMcq.delete({
            where: { id: params.mcqId, testId: params.testId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[TEST_MCQ_DELETE]", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal error",
            { status: 500 }
        );
    }
}
