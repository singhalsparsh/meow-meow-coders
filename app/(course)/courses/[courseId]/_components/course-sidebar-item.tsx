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
        "flex items-center gap-x-3 text-sm font-medium px-3 mx-3 rounded-2xl transition-all duration-200",
        "text-slate-500 dark:text-slate-400",
        "hover:text-slate-700 dark:hover:text-slate-200",
        "hover:bg-white/60 dark:hover:bg-white/[0.04]",
        isActive && "text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/[0.06] shadow-sm",
        isCompleted && "text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400",
        isCompleted && isActive && "bg-emerald-100/30 dark:bg-emerald-500/[0.08]",
      )}
    >
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <Icon
          size={18}
          className={cn(
            "text-slate-500 dark:text-slate-400",
            isActive && "text-slate-700 dark:text-slate-200",
            isCompleted && "text-emerald-700 dark:text-emerald-400"
          )}
        />
        <span className="truncate">{label}</span>
      </div>
    </button>
  )
}