import { KeyRound, Zap, Gauge, Cpu } from "lucide-react";

const stats = [
  {
    label: "Active Grants",
    value: "3",
    sub: "+1 this week",
    icon: KeyRound,
    trend: "up",
  },
  {
    label: "Operations This Week",
    value: "247",
    sub: "↑ 18% vs last week",
    icon: Zap,
    trend: "up",
  },
  {
    label: "Budget Utilisation",
    value: "46%",
    sub: "1,180 / 2,600 uses",
    icon: Gauge,
    trend: "neutral",
  },
  {
    label: "Active Agents",
    value: "3",
    sub: "1 near budget limit",
    icon: Cpu,
    trend: "warn",
  },
];

export function StatsCards() {
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
            <p
              className={`text-xs mt-1 ${
                stat.trend === "up"
                  ? "text-emerald-500"
                  : stat.trend === "warn"
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {stat.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
