"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="w-6 h-6 text-destructive" strokeWidth={1.8} />
      </div>
      <div>
        <h2
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error.message ?? "An unexpected error occurred loading this page."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
            {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} size="sm" variant="outline" className="gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
        Try again
      </Button>
    </div>
  );
}
