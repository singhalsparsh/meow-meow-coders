"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { Button } from "./ui/button"
import Link from "next/link"

import { LogOut } from "lucide-react"
import { SearchInput } from "./search-input"
import { isTeacher, hasTeacherRole } from "@/lib/teacher"
import { useEffect, useState } from "react"

export const NavbarRoutes = () => {

    const { isLoaded, user } = useUser()
    const pathname = usePathname()

    const isTeacherPage = pathname?.startsWith('/teacher')
    const isCoursePage = pathname?.includes('/courses')
    const isSearchPage = pathname === "/search"

    // Clerk's user is undefined on the server and during the very first client
    // render. Rendering auth-gated content before mounting causes a hydration
    // mismatch ("Expected server HTML to contain a matching text node"). So the
    // teacher button only renders AFTER the component has mounted.
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const showTeacherButton = isLoaded && mounted && (isTeacher(user?.id) || hasTeacherRole(user))

    return (
        <>
            {isSearchPage && (
                <div className="hidden md:block">
                    <SearchInput />
                </div>
            )}
            <div className="flex gap-x-2 ml-auto">
                {isTeacherPage || isCoursePage ? (
                    <Link href="/">
                        <Button size="sm" variant="ghost">
                            <LogOut className="h-4 w-4 mr-2 " />
                            Exit
                        </Button>
                    </Link>
                ) : showTeacherButton ? (
                    <Link href="/teacher/courses">
                        <Button size="sm" variant="ghost">Teacher mode</Button>
                    </Link>

                ) : null}
                <UserButton />
            </div>
        </>
    )
}
