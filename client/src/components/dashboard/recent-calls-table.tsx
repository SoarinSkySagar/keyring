"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Radio, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecentCall } from "@/actions/stats";

const PAGE_SIZE = 10;

interface Props {
  isLoading?: boolean;
  calls: RecentCall[];
}

function formatRelTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  const Icon = ok ? CheckCircle2 : XCircle;
  const cls = ok
    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {status}
    </span>
  );
}

export function RecentCallsTable({ isLoading = false, calls }: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(calls.length / PAGE_SIZE));
  const paginated = calls.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const from = calls.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, calls.length);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Recent API Calls
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest requests authenticated with your API key
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1.5">
          Live
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28 flex-1" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-10 hidden lg:block" />
              <Skeleton className="h-4 w-14 ml-auto" />
            </div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border">
            <Radio className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No calls yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agent requests will appear here in real time
            </p>
          </div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Path</TableHead>
                <TableHead className="hidden sm:table-cell">Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Latency</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {call.id.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-foreground">
                      {call.path || "/"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {call.agentName ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                        <Bot className="w-3 h-3 text-primary shrink-0" strokeWidth={1.8} />
                        {call.agentName}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={call.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {call.latencyMs !== null ? `${call.latencyMs}ms` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatRelTime(call.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {from}–{to} of {calls.length} calls
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
              </button>
              <span className="text-xs text-muted-foreground px-1.5 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
