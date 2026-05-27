import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AuthorizationContent } from "@/components/dashboard/authorization-content";

export default function AuthorizationPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Authorization" />
      <main className="flex-1 p-4 sm:p-6">
        <AuthorizationContent />
      </main>
    </div>
  );
}
