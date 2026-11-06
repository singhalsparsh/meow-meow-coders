"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { Button } from "./ui/button"
import Link from "next/link"

import { LogOut } from "lucide-react"
import { SearchModalTrigger } from "./search-modal-trigger"
import { ThemeToggleButton } from "@/components/ui/skiper-ui/skiper26"
import { isTeacher, hasTeacherRole } from "@/lib/teacher"
import { useEffect, useState } from "react"

export const NavbarRoutes = () => {

    const { isLoaded, user } = useUser()
    const pathname = usePathname()

    const isTeacherPage = pathname?.startsWith('/teacher')
    const isCoursePage = pathname?.includes('/courses')

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const showTeacherButton = isLoaded && mounted && (isTeacher(user?.id) || hasTeacherRole(user))

    return (
        <>
            <div className="flex gap-x-2 ml-auto items-center">
                <SearchModalTrigger />
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
                <div className="glass-pill rounded-full p-1">
                  <ThemeToggleButton variant="circle" start="center" />
                </div>
                <div className="glass-pill rounded-full p-1">
                  <UserButton />
                </div>
            </div>
        </>
    )
}
