import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

export const MobileSidebar = () => {
    return (
        <Sheet>
            <SheetTrigger className="md:hidden pr-4 hover:opacity75 transition">
                <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 glass-sidebar border-r-0">
                <Sidebar />
            </SheetContent>
        </Sheet>
    )
}