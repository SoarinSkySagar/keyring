import { CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Hardcoded demo data — replace with real API call
const recentCalls = [
  {
    id: "req_9xKp2mN7",
    agent: "TradingBot v2",
    agentId: "agt_alpha",
    secret: "BINANCE_API_KEY",
    status: "success" as const,
    latency: "142ms",
    time: "2 min ago",
  },
  {
    id: "req_3wRt8qL1",
    agent: "ResearchAgent",
    agentId: "agt_beta",
    secret: "OPENAI_KEY",
    status: "success" as const,
    latency: "89ms",
    time: "7 min ago",
  },
  {
    id: "req_6yBv4hD5",
    agent: "TradingBot v2",
    agentId: "agt_alpha",
    secret: "COINBASE_SECRET",
    status: "denied" as const,
    latency: "12ms",
    time: "15 min ago",
  },
  {
    id: "req_1nCm9kF3",
    agent: "DataPipeline",
    agentId: "agt_gamma",
    secret: "AWS_SECRET_KEY",
    status: "success" as const,
    latency: "203ms",
    time: "28 min ago",
  },
  {
    id: "req_7pXs5eA8",
    agent: "ResearchAgent",
    agentId: "agt_beta",
    secret: "ANTHROPIC_KEY",
    status: "pending" as const,
    latency: "—",
    time: "34 min ago",
  },
  {
    id: "req_2qZt6bW0",
    agent: "TradingBot v2",
    agentId: "agt_alpha",
    secret: "BINANCE_API_KEY",
    status: "success" as const,
    latency: "118ms",
    time: "41 min ago",
  },
];

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  denied: {
    icon: XCircle,
    label: "Denied",
    className: "text-destructive",
    bg: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-amber-500",
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
};

export function RecentCallsTable() {
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
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          Live
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5 mb-0.5 animate-pulse" />
        </span>
      </div>

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
    </div>
  );
}
