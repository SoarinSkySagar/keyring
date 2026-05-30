import { Sidebar } from "@/components/dashboard/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ContractSetup } from "@/components/dashboard/contract-setup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ContractSetup />
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-60">{children}</div>
      </div>
    </AuthGuard>
  );
}
