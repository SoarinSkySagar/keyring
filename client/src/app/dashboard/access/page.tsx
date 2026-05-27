import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AccessContent } from "@/components/dashboard/access-content";

export default function AccessPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Access" />
      <main className="flex-1 p-4 sm:p-6">
        <AccessContent />
      </main>
    </div>
  );
}
