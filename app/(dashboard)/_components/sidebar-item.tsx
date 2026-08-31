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
        "flex items-center gap-x-3 text-sm font-medium px-3 rounded-2xl transition-all duration-200",
        "text-slate-500 dark:text-slate-400",
        "hover:text-slate-700 dark:hover:text-slate-200",
        "hover:bg-white/60 dark:hover:bg-white/[0.06]",
        isActive && "text-sky-700 dark:text-sky-400 bg-white/70 dark:bg-white/[0.08] shadow-sm",
        isActive && "hover:bg-white/70 dark:hover:bg-white/[0.08]"
      )}
    >
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <Icon
          size={20}
          className={cn(
            "text-slate-500 dark:text-slate-400",
            isActive && "text-sky-700 dark:text-sky-400"
          )}
        />
        {label}
      </div>
    </button>
  )
}