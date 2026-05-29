"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { apiCalls } from "@/db/schema";
import { eq, gte, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface WeeklyPoint {
  day: string;   // e.g. "Mon"
  date: string;  // "YYYY-MM-DD"
  calls: number;
}

export interface RecentCall {
  id: string;
  path: string;
  method: string;
  status: number;
  latencyMs: number | null;
  createdAt: Date;
}

export interface UsageStats {
  totalThisWeek: number;
  weekly: WeeklyPoint[];
  hourly: number[];        // 24 ints — counts per hour for today (UTC)
  recentCalls: RecentCall[];
  peakHour: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getUsageStatsAction(): Promise<UsageStats | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const now = new Date();

  // ── Weekly window (last 7 complete days + today) ─────────────
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // ── Today window ─────────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Fetch last 200 rows for the week — enough for all calculations
  const rows = await db
    .select({
      id: apiCalls.id,
      path: apiCalls.path,
      method: apiCalls.method,
      status: apiCalls.status,
      latencyMs: apiCalls.latencyMs,
      createdAt: apiCalls.createdAt,
    })
    .from(apiCalls)
    .where(
      and(
        eq(apiCalls.userId, userId),
        gte(apiCalls.createdAt, sevenDaysAgo)
      )
    )
    .orderBy(desc(apiCalls.createdAt))
    .limit(500);

  // ── Build weekly buckets ──────────────────────────────────────
  const buckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    buckets[key] = 0;
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (key in buckets) buckets[key]++;
  }

  const weekly: WeeklyPoint[] = Object.entries(buckets).map(([date, calls]) => {
    const d = new Date(date + "T00:00:00Z");
    return { day: DAY_LABELS[d.getUTCDay()], date, calls };
  });

  // ── Build hourly buckets for today ────────────────────────────
  const hourly = new Array<number>(24).fill(0);
  for (const row of rows) {
    if (row.createdAt >= todayStart) {
      hourly[row.createdAt.getHours()]++;
    }
  }

  const totalThisWeek = rows.length;
  const peakHour = Math.max(...hourly);

  // ── Recent calls (top 20) ──────────────────────────────────────
  const recentCalls: RecentCall[] = rows.slice(0, 20).map((r) => ({
    id: r.id,
    path: r.path,
    method: r.method,
    status: r.status,
    latencyMs: r.latencyMs,
    createdAt: r.createdAt,
  }));

  return { totalThisWeek, weekly, hourly, recentCalls, peakHour };
}
