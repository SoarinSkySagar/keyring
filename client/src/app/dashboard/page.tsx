import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { RecentCallsTable } from "@/components/dashboard/recent-calls-table";

export default async function DashboardPage() {
  const session = await auth();
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

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
            Here&apos;s a live overview of your Keyring usage and agent
            activity.
          </p>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Charts */}
        <UsageChart />

        {/* Recent Calls */}
        <RecentCallsTable />
      </main>
    </div>
  );
}
