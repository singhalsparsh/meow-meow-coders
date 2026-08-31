"use client";

import { SearchIcon } from "lucide-react"
import { Input } from "./ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import qs from "query-string"

export const SearchInput = () => {

    const [value, setValue] = useState("")
    const debouncedValue = useDebounce(value)

    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const currentCategoryId = searchParams.get("categoryId")

    useEffect(() => {

        const url = qs.stringifyUrl({
            url: pathname,
            query: {
                categoryId: currentCategoryId,
                title: debouncedValue
            }
        }, { skipEmptyString: true, skipNull: true })

        router.push(url)

    }, [debouncedValue, currentCategoryId, router, pathname])

    return (
        <div className="relative">
            <SearchIcon
                className="absolute h-4 w-4 top-3 left-3 text-slate-600 dark:text-slate-400"
            />
            <Input
                className="w-full md:w-[300px] pl-9 rounded-full bg-slate-100 dark:bg-slate-800 focus-visible:ring-slate-200 dark:focus-visible:ring-slate-700"
                placeholder="Search a course"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
        </div>
    )
}