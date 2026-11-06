import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="h-full">
      <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
        <Navbar />
      </div>
      <div className="hidden md:flex h-[calc(100%-24px)] w-[220px] flex-col fixed top-3 left-3 bottom-3 z-50">
        <div className="h-full rounded-2xl overflow-hidden glass-sidebar border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.3)]">
          <Sidebar />
        </div>
      </div>
      <main className="md:pl-[244px] pt-[80px] h-full bg-page-gradient">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;