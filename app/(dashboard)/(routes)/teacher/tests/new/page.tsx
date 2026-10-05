import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Teacher: create an empty test and jump straight into the editor.
//
// This is a server component with no UI on purpose: the "New test" button is a
// plain link, and this route does the write so the editor always opens on a row
// that already exists (the title/description form needs an id to PATCH against).
const NewTestPage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const test = await db.test.create({
        data: {
            userId,
            title: "Untitled test",
        },
    });

    return redirect(`/teacher/tests/${test.id}`);
};

export default NewTestPage;
