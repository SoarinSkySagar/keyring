import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SecretsContent } from "@/components/dashboard/secrets-content";

export default function SecretsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Secrets" />
      <main className="flex-1 p-4 sm:p-6">
        <SecretsContent />
      </main>
    </div>
  );
}
