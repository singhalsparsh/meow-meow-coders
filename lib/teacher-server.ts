import { clerkClient } from "@clerk/nextjs/server"
import { hasTeacherRole, isTeacher } from "./teacher"

// Server-only teacher check. Falls back to the Clerk user's metadata (role
// added in the Clerk dashboard) in addition to the NEXT_PUBLIC_TEACHER_ID env
// var. Do NOT import this file from a client component — it pulls in the
// server-side Clerk client.
export const isTeacherOnServer = async (userId?: string | null): Promise<boolean> => {
    if (!userId) return false
    if (isTeacher(userId)) return true
    try {
        const user = await (await clerkClient()).users.getUser(userId)
        return hasTeacherRole(user)
    } catch {
        return false
    }
}
