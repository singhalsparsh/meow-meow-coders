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
        "group relative flex w-full items-center gap-x-3 text-sm font-medium px-3 py-2 rounded-lg transition-colors",
        "text-muted-foreground",
        "hover:text-foreground",
        "hover:bg-accent",
        isActive && "text-foreground bg-accent",
        isCompleted && "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
        isCompleted && isActive && "bg-emerald-50 dark:bg-emerald-500/10",
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
      )}
      <div className="flex items-center gap-x-3 flex-1 min-w-0">
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0",
          "bg-muted",
          "group-hover:bg-accent-foreground/10",
          isActive && "bg-primary/10",
          isCompleted && "bg-emerald-100 dark:bg-emerald-500/15",
        )}>
          <Icon
            size={16}
            className={cn(
              "transition-colors",
              "text-muted-foreground",
              "group-hover:text-foreground",
              isActive && "text-primary",
              isCompleted && "text-emerald-600 dark:text-emerald-400",
            )}
          />
        </div>
        <span className="truncate">{label}</span>
      </div>
    </button>
  )
}