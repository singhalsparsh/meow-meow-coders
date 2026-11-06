"use client"

import { Category } from "@prisma/client"
import {
    Music,
    Wrench,
    Clapperboard,
    Cpu,
    Camera,
    Calculator,
    Dumbbell,
    type LucideIcon,
} from "lucide-react"
import { CategoryItem } from "./category-item"

interface CategoriesProps {
    items: Category[]
}

const iconMap: Record<Category["name"], LucideIcon> = {
    "Musique": Music,
    "Ingénieur": Wrench,
    "Monteur vidéo": Clapperboard,
    "Informatique": Cpu,
    "Photographie": Camera,
    "Comptabilité": Calculator,
    "Fitness": Dumbbell
}
export const Categories = ({
    items,
}: CategoriesProps) => {
    return (
        <div className="flex items-center gap-x-2 overflow-x-auto pb-2">
            {items.map((item) => (
                <CategoryItem
                    key={item.id}
                    label={item.name}
                    icon={iconMap[item.name]}
                    value={item.id}
                />
            ))}
        </div>
    )
}
