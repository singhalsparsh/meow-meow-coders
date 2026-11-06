import { Logo } from "./logo"
import { SidebarRoutes } from "./sidebar-routes"

export const Sidebar = () => {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 pb-4 pt-3">
        <Logo />
      </div>
      <div className="mx-3 border-t border-border/70" />
      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        <SidebarRoutes />
      </nav>
    </div>
  )
}
