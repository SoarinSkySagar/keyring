import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AgentsContent } from "@/components/dashboard/agents-content";

export default function AgentsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Agents" />
      <main className="flex-1 p-4 sm:p-6">
        <AgentsContent />
      </main>
    </div>
  );
}
