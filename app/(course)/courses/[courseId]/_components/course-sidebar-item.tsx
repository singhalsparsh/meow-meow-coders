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
        "group relative flex items-center gap-x-3 text-sm font-medium px-3 rounded-2xl transition-all duration-300",
        "text-slate-500 dark:text-slate-400",
        "hover:text-slate-700 dark:hover:text-slate-200",
        "hover:bg-white/60 dark:hover:bg-white/[0.06]",
        "hover:scale-[1.02] active:scale-[0.98]",
        "hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
        isActive && "text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/[0.08] shadow-sm",
        isActive && "hover:bg-white/70 dark:hover:bg-white/[0.08]",
        isCompleted && "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
        isCompleted && isActive && "bg-emerald-50/50 dark:bg-emerald-500/[0.08]",
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-sky-500 to-indigo-500 dark:from-sky-400 dark:to-indigo-400" />
      )}
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-xl transition-all duration-300",
          "bg-slate-100 dark:bg-white/[0.06]",
          "group-hover:bg-slate-200 dark:group-hover:bg-white/[0.1]",
          "group-hover:scale-110",
          isActive && "bg-sky-100 dark:bg-sky-500/[0.15]",
          isCompleted && "bg-emerald-100 dark:bg-emerald-500/[0.15]",
        )}>
          <Icon
            size={16}
            className={cn(
              "transition-all duration-300",
              "text-slate-500 dark:text-slate-400",
              "group-hover:text-slate-700 dark:group-hover:text-slate-200",
              isActive && "text-sky-600 dark:text-sky-400",
              isCompleted && "text-emerald-600 dark:text-emerald-400",
            )}
          />
        </div>
        <span className="truncate transition-colors duration-200">{label}</span>
      </div>
    </button>
  )
}