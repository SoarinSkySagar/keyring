import { BarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyPoint } from "@/actions/stats";

interface Props {
  isLoading?: boolean;
  weeklyData: WeeklyPoint[];
  hourlyData: number[];
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[180px] gap-2">
      <BarChart2
        className="w-8 h-8 text-muted-foreground/25"
        strokeWidth={1.5}
      />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function UsageChart({ isLoading = false, weeklyData, hourlyData }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="w-full h-[180px]" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="w-full h-[144px]" />
        </div>
      </div>
    );
  }

  const hasWeekly = weeklyData.some((d) => d.calls > 0);
  const hasHourly = hourlyData.some((v) => v > 0);
  const maxWeekly = hasWeekly ? Math.max(...weeklyData.map((d) => d.calls), 1) : 1;
  const maxHourly = hasHourly ? Math.max(...hourlyData, 1) : 1;
  const totalWeek = weeklyData.reduce((s, d) => s + d.calls, 0);

  const svgW = 600;
  const svgH = 180;
  const padL = 8, padR = 8, padT = 12, padB = 24;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const points =
    hasWeekly && weeklyData.length > 1
      ? weeklyData
          .map((d, i) => {
            const x = padL + (i / (weeklyData.length - 1)) * chartW;
            const y = padT + (1 - d.calls / maxWeekly) * chartH;
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  const areaPoints =
    hasWeekly && weeklyData.length > 1
      ? [
          `${padL},${padT + chartH}`,
          ...weeklyData.map((d, i) => {
            const x = padL + (i / (weeklyData.length - 1)) * chartW;
            const y = padT + (1 - d.calls / maxWeekly) * chartH;
            return `${x},${y}`;
          }),
          `${padL + chartW},${padT + chartH}`,
        ].join(" ")
      : "";

  // Current hour for highlighting (server-rendered in UTC; acceptable for bar highlight)
  const currentHour = new Date().getHours();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Weekly calls line chart */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              API Calls — Last 7 Days
            </p>
            <p
              className="text-2xl font-extrabold text-foreground mt-0.5"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {hasWeekly ? totalWeek.toLocaleString() : "—"}
            </p>
          </div>
        </div>

        {!hasWeekly ? (
          <EmptyChart label="No calls recorded yet" />
        ) : (
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full"
            style={{ height: 180 }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8a835" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#e8a835" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line
                key={t}
                x1={padL}
                y1={padT + t * chartH}
                x2={padL + chartW}
                y2={padT + t * chartH}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))}

            <polygon points={areaPoints} fill="url(#callsGradient)" />
            <polyline
              points={points}
              fill="none"
              stroke="#e8a835"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {weeklyData.map((d, i) => {
              const x = padL + (i / (weeklyData.length - 1)) * chartW;
              const y = padT + (1 - d.calls / maxWeekly) * chartH;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="4" fill="#e8a835" />
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="none"
                    stroke="#0f0f1c"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={svgH - 4}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="10"
                  >
                    {d.day}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Hourly distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Today — Hourly Distribution
          </p>
          <p
            className="text-2xl font-extrabold text-foreground mt-0.5"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {hasHourly ? (
              <>
                {maxHourly}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  peak/hr
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>

        {!hasHourly ? (
          <EmptyChart label="No activity today" />
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-36">
              {hourlyData.map((v, i) => {
                const h = (v / maxHourly) * 100;
                const isCurrentHour = i === currentHour;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(h, 4)}%`,
                      background: isCurrentHour
                        ? "#e8a835"
                        : `rgba(232,168,53,${0.15 + (v / maxHourly) * 0.4})`,
                    }}
                    title={`${i}:00 — ${v} calls`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-muted-foreground">12am</span>
              <span className="text-[9px] text-muted-foreground">12pm</span>
              <span className="text-[9px] text-muted-foreground">11pm</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
