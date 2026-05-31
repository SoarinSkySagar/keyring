import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ApiContent } from "@/components/dashboard/api-content";

export default function ApiPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="API" />
      <main className="flex-1 p-4 sm:p-6">
        <ApiContent />
      </main>
    </div>
  );
}
