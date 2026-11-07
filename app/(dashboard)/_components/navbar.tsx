import { NavbarRoutes } from "@/components/navbar-routes"
import { MobileSidebar } from "./mobile-sidebar"

export const Navbar = ({ leading }: { leading?: React.ReactNode }) => {
    return (
        <div className="p-4 border-b border-border/70 h-full flex items-center glass">
            {leading}
            <MobileSidebar />
            <NavbarRoutes />
        </div>
    )
}
