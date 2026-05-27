"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Ban, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Grant = {
  id: string;
  agent: string;
  operations: string[];
  budget: number;
  used: number;
  status: "active" | "exhausted" | "revoked";
  created: string;
};

const MOCK_GRANTS: Grant[] = [
  { id: "GR-4F2A", agent: "0x742d35Cc...8f44e", operations: ["sign_tx", "call_api"], budget: 500, used: 234, status: "active", created: "May 20" },
  { id: "GR-8B3C", agent: "0x89D24A6b...0359", operations: ["sign_tx"], budget: 100, used: 98, status: "active", created: "May 22" },
  { id: "GR-1E9D", agent: "0xbEbc44...F1C7", operations: ["call_api", "query_db"], budget: 1000, used: 0, status: "active", created: "May 24" },
  { id: "GR-5C7F", agent: "0x7a250d...488D", operations: ["sign_tx"], budget: 200, used: 200, status: "exhausted", created: "May 18" },
  { id: "GR-2D8E", agent: "0xA478c2...3eB11", operations: ["sign_tx", "call_api", "query_db"], budget: 2000, used: 450, status: "revoked", created: "May 15" },
];

const statusBadge: Record<Grant["status"], React.ReactNode> = {
  active: <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">Active</Badge>,
  exhausted: <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10">Exhausted</Badge>,
  revoked: <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">Revoked</Badge>,
};

export function GrantsTable() {
  const [grants, setGrants] = useState(MOCK_GRANTS);

  const revoke = (id: string) => {
    setGrants((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: "revoked" as const } : g))
    );
    toast.success(`Grant ${id} revoked — all future requests blocked.`);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Active Grants
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scoped agent authorisations. Revoke instantly.
          </p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-semibold">
          + New Grant
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-muted-foreground">Grant ID</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Agent</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Operations</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Budget</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Created</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.map((grant) => (
            <TableRow key={grant.id} className="border-border">
              <TableCell className="font-mono text-xs text-primary font-semibold">
                {grant.id}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {grant.agent}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {grant.operations.map((op) => (
                    <span key={op} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {op}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1 min-w-[80px]">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{grant.used}</span>
                    <span>{grant.budget}</span>
                  </div>
                  <Progress
                    value={(grant.used / grant.budget) * 100}
                    className="h-1.5 bg-muted"
                  />
                </div>
              </TableCell>
              <TableCell>{statusBadge[grant.status]}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {grant.created}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  {grant.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revoke(grant.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
