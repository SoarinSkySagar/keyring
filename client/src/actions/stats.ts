"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { apiCalls, agents } from "@/db/schema";
import { eq, gte, and, desc, count } from "drizzle-orm";

export interface WeeklyPoint {
  day: string;
  date: string;
  calls: number;
}

export interface RecentCall {
  id: string;
  path: string;
  method: string;
  status: number;
  latencyMs: number | null;
  createdAt: Date;
  agentName: string | null;
}

export interface UsageStats {
  totalThisWeek: number;
  weekly: WeeklyPoint[];
  hourly: number[];
  recentCalls: RecentCall[];
  peakHour: number;
  activeAgents: number;
  totalGrants: number; // sum of allowedSecrets.length across all active agents
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getUsageStatsAction(): Promise<UsageStats | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Fetch recent call rows joined with agent name
  const rows = await db
    .select({
      id: apiCalls.id,
      path: apiCalls.path,
      method: apiCalls.method,
      status: apiCalls.status,
      latencyMs: apiCalls.latencyMs,
      createdAt: apiCalls.createdAt,
      agentName: agents.name,
    })
    .from(apiCalls)
    .leftJoin(agents, eq(apiCalls.agentId, agents.id))
    .where(
      and(
        eq(apiCalls.userId, userId),
        gte(apiCalls.createdAt, sevenDaysAgo)
      )
    )
    .orderBy(desc(apiCalls.createdAt))
    .limit(500);

  // Active agents + grant totals (one query)
  const agentRows = await db
    .select({ allowedSecrets: agents.allowedSecrets })
    .from(agents)
    .where(and(eq(agents.userId, userId), eq(agents.status, "active")));

  const activeAgents = agentRows.length;
  const totalGrants = agentRows.reduce((sum, a) => sum + a.allowedSecrets.length, 0);

  // Weekly buckets
  const buckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (key in buckets) buckets[key]++;
  }

  const weekly: WeeklyPoint[] = Object.entries(buckets).map(([date, calls]) => {
    const d = new Date(date + "T00:00:00Z");
    return { day: DAY_LABELS[d.getUTCDay()], date, calls };
  });

  // Hourly buckets for today
  const hourly = new Array<number>(24).fill(0);
  for (const row of rows) {
    if (row.createdAt >= todayStart) {
      hourly[row.createdAt.getHours()]++;
    }
  }

  return {
    totalThisWeek: rows.length,
    weekly,
    hourly,
    peakHour: Math.max(...hourly),
    activeAgents,
    totalGrants,
    recentCalls: rows.slice(0, 100).map((r) => ({
      id: r.id,
      path: r.path,
      method: r.method,
      status: r.status,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
      agentName: r.agentName ?? null,
    })),
  };
}
