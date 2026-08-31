"use client";

import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive =
    (pathname === "/" && href === "/") ||
    pathname === href ||
    pathname?.startsWith(`${href}/`);

  const onClick = () => {
    router.push(href);
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "group flex items-center gap-x-3 text-sm font-medium px-3 rounded-2xl transition-all duration-300",
        "text-slate-500 dark:text-slate-400",
        "hover:text-slate-700 dark:hover:text-slate-200",
        "hover:bg-white/60 dark:hover:bg-white/[0.06]",
        "hover:scale-[1.02] active:scale-[0.98]",
        "hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
        isActive && "text-sky-700 dark:text-sky-400 bg-white/70 dark:bg-white/[0.08] shadow-sm",
        isActive && "hover:bg-white/70 dark:hover:bg-white/[0.08]"
      )}
    >
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-xl transition-all duration-300",
          "bg-slate-100 dark:bg-white/[0.06]",
          "group-hover:bg-slate-200 dark:group-hover:bg-white/[0.1]",
          "group-hover:scale-110",
          isActive && "bg-sky-100 dark:bg-sky-500/[0.15]",
        )}>
          <Icon
            size={16}
            className={cn(
              "transition-all duration-300",
              "text-slate-500 dark:text-slate-400",
              "group-hover:text-slate-700 dark:group-hover:text-slate-200",
              isActive && "text-sky-600 dark:text-sky-400",
            )}
          />
        </div>
        {label}
      </div>
    </button>
  )
}