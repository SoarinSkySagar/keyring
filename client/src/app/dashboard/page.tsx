import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { GrantsTable } from "@/components/dashboard/grants-table";
import { AuditLog } from "@/components/dashboard/audit-log";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.email?.split("@")[0] ?? "there";

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Overview" />

      <main className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Good to see you, {firstName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your agent grants on Aeneid testnet.
          </p>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Tables */}
        <div className="space-y-5">
          <GrantsTable />
          <AuditLog />
        </div>
      </main>
    </div>
  );
}
