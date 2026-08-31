"use client"

import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconType } from "react-icons";
import qs from "query-string"

interface CategoriesItemProps {
    label?: string;
    value?: string;
    icon?: IconType;
}

export const CategoryItem = ({
    label,
    value,
    icon: Icon
}: CategoriesItemProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentCategoryId = searchParams.get("categoryId");
    const currentTitle = searchParams.get("title");

    const isSelected = currentCategoryId === value;

    const onClick = () => {
        const url = qs.stringifyUrl({
            url: pathname,
            query: {
                title: currentTitle,
                categoryId: isSelected ? null : value,
            }
        }, { skipNull: true, skipEmptyString: true })

        router.push(url)
    }

    return (
        <button onClick={onClick} className={cn(
            "py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-full flex items-center gap-x-1 hover:border-sky-700 dark:hover:border-sky-500 transition",
            isSelected && "border-sky-700 dark:border-sky-500 bg-sky-200/20 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300"
        )}>
            {Icon && <Icon size={20} />}
            <div className="truncate">
                {label}
            </div>
        </button>
    )
}