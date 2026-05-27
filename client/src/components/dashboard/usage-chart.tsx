"use client";

// Hardcoded demo data — replace with real API call
const weeklyData = [
  { day: "Mon", calls: 28 },
  { day: "Tue", calls: 45 },
  { day: "Wed", calls: 62 },
  { day: "Thu", calls: 38 },
  { day: "Fri", calls: 74 },
  { day: "Sat", calls: 19 },
  { day: "Sun", calls: 31 },
];

const hourlyData = [
  12, 8, 5, 3, 2, 4, 9, 18, 34, 47, 52, 48, 41, 38, 44, 51, 63, 58, 44, 36,
  27, 21, 16, 13,
];

export function UsageChart() {
  const maxWeekly = Math.max(...weeklyData.map((d) => d.calls));
  const maxHourly = Math.max(...hourlyData);

  // Build SVG polyline for weekly calls
  const svgW = 600;
  const svgH = 120;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const points = weeklyData
    .map((d, i) => {
      const x = padL + (i / (weeklyData.length - 1)) * chartW;
      const y = padT + (1 - d.calls / maxWeekly) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = [
    `${padL},${padT + chartH}`,
    ...weeklyData.map((d, i) => {
      const x = padL + (i / (weeklyData.length - 1)) * chartW;
      const y = padT + (1 - d.calls / maxWeekly) * chartH;
      return `${x},${y}`;
    }),
    `${padL + chartW},${padT + chartH}`,
  ].join(" ");

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
              297
            </p>
          </div>
          <span className="text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            ↑ 22% vs last week
          </span>
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ height: 120 }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8a835" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e8a835" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
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

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#callsGradient)" />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#e8a835"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
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
                {/* Day label */}
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
      </div>

      {/* Hourly distribution bar chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Today — Hourly Distribution
          </p>
          <p
            className="text-2xl font-extrabold text-foreground mt-0.5"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            63
            <span className="text-sm font-normal text-muted-foreground ml-1">
              peak/hr
            </span>
          </p>
        </div>

        <div className="flex items-end gap-0.5 h-20">
          {hourlyData.map((v, i) => {
            const h = (v / maxHourly) * 100;
            const isCurrentHour = i === 16; // 4pm demo
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
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
      </div>
    </div>
  );
}
