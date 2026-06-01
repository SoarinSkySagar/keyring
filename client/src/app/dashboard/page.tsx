import { getCurrentUser } from "@/lib/privy";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { RecentCallsTable } from "@/components/dashboard/recent-calls-table";
import { ErrorBoundary } from "@/components/error-boundary";
import { getUsageStatsAction } from "@/actions/stats";

// Always fetch fresh data — never serve a cached render of the overview.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName =
    user?.name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const stats = await getUsageStatsAction();

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Overview" />

      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        <ErrorBoundary>
          <StatsCards
            totalThisWeek={stats?.totalThisWeek ?? null}
            activeAgents={stats?.activeAgents ?? null}
            totalGrants={stats?.totalGrants ?? null}
          />
        </ErrorBoundary>

        {/* Charts */}
        <ErrorBoundary>
          <UsageChart
            weeklyData={stats?.weekly ?? []}
            hourlyData={stats?.hourly ?? []}
          />
        </ErrorBoundary>

        {/* Recent Calls */}
        <ErrorBoundary>
          <RecentCallsTable calls={stats?.recentCalls ?? []} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
