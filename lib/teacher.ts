export const isTeacher = (userId?: string | null) => {
    return userId === process.env.NEXT_PUBLIC_TEACHER_ID;
}

// Pure check against a Clerk user's metadata — works on the client (useUser())
// and on the server (clerkClient.users.getUser()). Handles a role stored
// either in publicMetadata or privateMetadata, e.g. { role: "teacher" }.
export const hasTeacherRole = (user?: {
    publicMetadata?: unknown
    privateMetadata?: unknown
} | null): boolean => {
    if (!user) return false
    const pm = user.publicMetadata as Record<string, unknown> | undefined
    const prm = user.privateMetadata as Record<string, unknown> | undefined
    const topLevel = (user as Record<string, unknown>)["role"]
    return topLevel === "teacher" || pm?.["role"] === "teacher" || prm?.["role"] === "teacher"
}
