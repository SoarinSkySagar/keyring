"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle
              className="w-5 h-5 text-destructive"
              strokeWidth={1.8}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Something went wrong
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
