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
        "flex items-center gap-x-2 text-slate-500 dark:text-slate-400 text-sm font-[500] pl-6 transition-all duration-200 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-white/[0.04]",
        isActive && "text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200",
        isCompleted && "text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400",
        isCompleted && isActive && "bg-emerald-100/30 dark:bg-emerald-500/[0.08]",
      )}
    >
      <div className="flex items-center gap-x-2 py-4">
        <Icon
          size={22}
          className={cn(
            "text-slate-500 dark:text-slate-400",
            isActive && "text-slate-700 dark:text-slate-200",
            isCompleted && "text-emerald-700 dark:text-emerald-400"
          )}
        />
        {label}
      </div>
      <div className={cn(
        "ml-auto opacity-0 border-2 border-slate-700 h-full transition-all",
        isActive && "opacity-100",
        isCompleted && "border-emerald-700"
      )} />
    </button>
  )
}