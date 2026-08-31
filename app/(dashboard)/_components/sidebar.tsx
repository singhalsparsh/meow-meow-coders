import { Logo } from "./logo"
import { SidebarRoutes } from "./sidebar-routes"

export const Sidebar = () => {
  return (
    <div className="h-full flex flex-col overflow-y-auto py-3">
      <div className="px-3 pb-1">
        <Logo />
      </div>
      <div className="flex flex-col w-full px-3 gap-1">
        <SidebarRoutes />
      </div>
    </div>
  )
}