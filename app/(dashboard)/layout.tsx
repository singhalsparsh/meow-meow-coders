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
        <div className="h-full rounded-3xl overflow-hidden glass-sidebar shadow-[0_4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
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