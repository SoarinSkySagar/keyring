import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, ShieldX, AlertCircle } from "lucide-react";

type AuditEvent = {
  time: string;
  reqId: string;
  agent: string;
  operation: string;
  resource: string;
  status: "success" | "vetoed" | "revoked" | "failed";
  txHash: string;
};

const MOCK_EVENTS: AuditEvent[] = [
  { time: "2 min ago", reqId: "REQ-9A2F", agent: "0x742d35...f44e", operation: "sign_tx", resource: "vault-alpha", status: "success", txHash: "0x4a8b...c3d9" },
  { time: "8 min ago", reqId: "REQ-3B7C", agent: "0x89D24A...0359", operation: "call_api", resource: "vault-beta", status: "vetoed", txHash: "0x7e2a...9f1b" },
  { time: "23 min ago", reqId: "REQ-6E4D", agent: "0x742d35...f44e", operation: "sign_tx", resource: "vault-alpha", status: "success", txHash: "0x1c5d...7a82" },
  { time: "1 hr ago", reqId: "REQ-1F2A", agent: "0x742d35...f44e", operation: "sign_tx", resource: "vault-alpha", status: "revoked", txHash: "0x8b3e...2c4f" },
  { time: "2 hrs ago", reqId: "REQ-7G5H", agent: "0x7a250d...488D", operation: "sign_tx", resource: "vault-gamma", status: "success", txHash: "0x5f9c...1e3a" },
  { time: "3 hrs ago", reqId: "REQ-4K2M", agent: "0xbEbc44...F1C7", operation: "query_db", resource: "vault-delta", status: "failed", txHash: "0x3d7b...8a91" },
];

const statusIcon = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  vetoed: <ShieldX className="w-3.5 h-3.5 text-amber-500" />,
  revoked: <XCircle className="w-3.5 h-3.5 text-destructive" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
};

const statusLabel = {
  success: "text-emerald-500",
  vetoed: "text-amber-500",
  revoked: "text-destructive",
  failed: "text-muted-foreground",
};

export function AuditLog() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2
          className="text-sm font-semibold text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Audit Log
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Every operation — immutable, on-chain.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-muted-foreground">Time</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Request ID</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Agent</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Operation</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Resource</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Tx Hash</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_EVENTS.map((event) => (
            <TableRow key={event.reqId} className="border-border">
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {event.time}
              </TableCell>
              <TableCell className="font-mono text-xs text-foreground font-medium">
                {event.reqId}
              </TableCell>
              <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                {event.agent}
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {event.operation}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                {event.resource}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {statusIcon[event.status]}
                  <span className={`text-xs font-medium capitalize ${statusLabel[event.status]}`}>
                    {event.status}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                {event.txHash}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
