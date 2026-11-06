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
        "group flex items-center gap-x-3 text-sm font-medium px-3 rounded-lg transition-colors",
        "text-muted-foreground",
        "hover:text-foreground",
        "hover:bg-accent",
        isActive && "text-foreground bg-accent",
        isActive && "hover:bg-accent"
      )}
    >
      <div className="flex items-center gap-x-3 py-3 flex-1">
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
          "bg-muted",
          "group-hover:bg-accent-foreground/10",
          isActive && "bg-primary/10",
        )}>
          <Icon
            size={16}
            className={cn(
              "transition-colors",
              "text-muted-foreground",
              "group-hover:text-foreground",
              isActive && "text-primary",
            )}
          />
        </div>
        {label}
      </div>
    </button>
  )
}