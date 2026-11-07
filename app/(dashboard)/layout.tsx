import { Sidebar } from "./_components/sidebar";
import { DashboardLayoutShell } from "./_components/dashboard-layout-shell";

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <DashboardLayoutShell sidebar={<Sidebar />}>
      {children}
    </DashboardLayoutShell>
  );
}

export default DashboardLayout;
