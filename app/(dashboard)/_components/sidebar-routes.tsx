"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TreeNav, type TreeNavItem } from "@/components/spectrumui/tree-nav";

const guestRoutes: TreeNavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Browse", href: "/search" },
];

const teacherRoutes: TreeNavItem[] = [
  { label: "Courses", href: "/teacher/courses" },
  { label: "Tests", href: "/teacher/tests" },
  { label: "Analytics", href: "/teacher/analytics" },
];

export const SidebarRoutes = () => {
  const pathname = usePathname();

  const isTeacherPage = pathname?.includes("/teacher");
  const routes = isTeacherPage ? teacherRoutes : guestRoutes;

  // Match the current path to the most specific nav item (exact or prefix) so
  // the active marker tracks nested routes (e.g. /teacher/courses/:id).
  const activeHref = routes.find((route) => {
    if (pathname === route.href) return true;
    if (route.href === "/") return false;
    return pathname?.startsWith(`${route.href}/`);
  })?.href;

  return (
    <TreeNav
      items={routes}
      activeHref={activeHref}
      linkComponent={Link}
      className="w-full"
    />
  );
};
