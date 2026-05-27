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
import { Ban, ExternalLink, KeySquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// Replace with real API call
const MOCK_GRANTS: Grant[] = [];

const statusBadge: Record<Grant["status"], React.ReactNode> = {
  active: (
    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">
      Active
    </Badge>
  ),
  exhausted: (
    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10">
      Exhausted
    </Badge>
  ),
  revoked: (
    <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
      Revoked
    </Badge>
  ),
};

export function GrantsTable({ isLoading = false }: { isLoading?: boolean }) {
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
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-semibold"
        >
          + New Grant
        </Button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12 hidden lg:block ml-auto" />
            </div>
          ))}
        </div>
      ) : grants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border">
            <KeySquare
              className="w-5 h-5 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No grants yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a grant to give agents scoped access
            </p>
          </div>
          <Button size="sm" variant="outline" className="text-xs font-semibold">
            + New Grant
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Grant ID
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Agent
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">
                Operations
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Budget
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                Created
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                Actions
              </TableHead>
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
                      <span
                        key={op}
                        className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
                      >
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
      )}
    </div>
  );
}
