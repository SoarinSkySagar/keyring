import { KeyRound, Zap, Gauge, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  isLoading?: boolean;
  totalThisWeek: number | null;
}

export function StatsCards({ isLoading = false, totalThisWeek }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Active Grants",
      icon: KeyRound,
      value: "—",
      sub: "No data yet",
    },
    {
      label: "Operations This Week",
      icon: Zap,
      value: totalThisWeek !== null ? String(totalThisWeek) : "—",
      sub:
        totalThisWeek !== null
          ? totalThisWeek === 0
            ? "No calls yet"
            : "API calls in last 7 days"
          : "No data yet",
    },
    {
      label: "Budget Utilisation",
      icon: Gauge,
      value: "—",
      sub: "No data yet",
    },
    {
      label: "Active Agents",
      icon: Cpu,
      value: "—",
      sub: "No data yet",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 border border-primary/15">
              <stat.icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <p
              className="text-3xl font-extrabold text-foreground leading-none"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {stat.value}
            </p>
            <p className="text-xs mt-1 text-muted-foreground">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
