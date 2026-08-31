import { NavbarRoutes } from "@/components/navbar-routes"
import { MobileSidebar } from "./mobile-sidebar"

export const Navbar = () => {
    return (
        <div className="p-4 border-b border-white/20 dark:border-white/5 h-full flex items-center glass">
            <MobileSidebar />
            <NavbarRoutes />
        </div>
    )
}
