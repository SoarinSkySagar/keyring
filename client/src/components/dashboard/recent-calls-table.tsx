import { CheckCircle2, XCircle, Clock, Radio } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Replace with real API call
const recentCalls: {
  id: string;
  agent: string;
  agentId: string;
  secret: string;
  status: "success" | "denied" | "pending";
  latency: string;
  time: string;
}[] = [];

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  denied: {
    icon: XCircle,
    label: "Denied",
    bg: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
};

export function RecentCallsTable({ isLoading = false }: { isLoading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Recent API Calls
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest secret access requests from your agents
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1.5">
          Live
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </span>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28 flex-1" />
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12 hidden lg:block" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : recentCalls.length === 0 ? (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="hidden md:table-cell">Secret</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Latency</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentCalls.map((call) => {
              const { icon: StatusIcon, bg } = statusConfig[call.status];
              return (
                <TableRow key={call.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {call.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {call.agent}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {call.agentId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {call.secret}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${bg}`}
                    >
                      <StatusIcon className="w-3 h-3" strokeWidth={2} />
                      {statusConfig[call.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {call.latency}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {call.time}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
