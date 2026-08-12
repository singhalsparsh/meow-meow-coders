import { isTeacherOnServer } from "@/lib/teacher-server"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"


const TeacherLayout = async ({
    children
}: { children: React.ReactNode }) => {
    const { userId } = await auth()

    if (!(await isTeacherOnServer(userId))) {
        return redirect("/")
    }

    return (
        <>
            {children}
        </>
    )
}

export default TeacherLayout