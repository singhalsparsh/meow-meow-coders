"use client";

import { CheckCircle, Lock, PlayCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface CourseSidebarItemProps {
  label: string;
  id: string;
  isCompleted: boolean;
  courseId: string;
  isLocked: boolean;
};

export const CourseSidebarItem = ({
  label,
  id,
  isCompleted,
  courseId,
  isLocked,
}: CourseSidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const Icon = isLocked ? Lock : (isCompleted ? CheckCircle : PlayCircle);
  const isActive = pathname?.includes(id);

  const onClick = () => {
    router.push(`/courses/${courseId}/chapters/${id}`);
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group relative flex items-center gap-x-3 text-sm font-medium px-3 rounded-xl transition-all duration-300",
        "text-muted-foreground",
        "hover:text-foreground",
        "hover:bg-accent",
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive && "text-foreground bg-accent shadow-sm",
        isActive && "hover:bg-accent",
        isCompleted && "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
        isCompleted && isActive && "bg-emerald-50 dark:bg-emerald-500/10",
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
      )}
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300",
          "bg-muted",
          "group-hover:bg-accent-foreground/10",
          "group-hover:scale-110",
          isActive && "bg-primary/10",
          isCompleted && "bg-emerald-100 dark:bg-emerald-500/15",
        )}>
          <Icon
            size={16}
            className={cn(
              "transition-all duration-300",
              "text-muted-foreground",
              "group-hover:text-foreground",
              isActive && "text-primary",
              isCompleted && "text-emerald-600 dark:text-emerald-400",
            )}
          />
        </div>
        <span className="truncate transition-colors duration-200">{label}</span>
      </div>
    </button>
  )
}