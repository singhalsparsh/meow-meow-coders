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
            "py-2 px-3 text-sm border border-border rounded-full flex items-center gap-x-1 transition-all duration-300",
            "hover:border-primary",
            "hover:scale-105 active:scale-95",
            "hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
            isSelected && "border-primary bg-primary/10 text-primary",
            isSelected && "shadow-[0_2px_12px_hsl(var(--ring)/0.15)]"
        )}>
            {Icon && <Icon size={20} />}
            <div className="truncate">
                {label}
            </div>
        </button>
    )
}