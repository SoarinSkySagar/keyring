"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Shield, Link2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Hardcoded demo credentials — replace with real API call (TODO)
const DEMO_CREDENTIALS = {
  apiKey: "kr_live_9xKp2mN7wRt8qL1yBv4hD5nCm9kF3pXs5eA8",
  secretToken: "kr_secret_3wRt8qL1yBv4hD5nCm9kF3pXs5eA8zQt6bW0",
  connectionUrl: "https://api.keyring.sh/v1/connect/wksp_7pXs5eA8zQt6bW",
};

// Hardcoded demo rate limits — replace with real API call (TODO)
const DEMO_RATE_LIMITS = {
  perMinute: 60,
  perHour: 1000,
  perDay: 10000,
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // TODO: implement clipboard copy
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
      ) : (
        <Copy className="w-3.5 h-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}

function MaskedValue({
  value,
  showLength = 8,
}: {
  value: string;
  showLength?: number;
}) {
  const prefix = value.slice(0, showLength);
  const suffix = value.slice(-4);
  return (
    <span className="font-mono text-sm text-foreground">
      {prefix}
      <span className="text-muted-foreground">••••••••••••</span>
      {suffix}
    </span>
  );
}

export function AuthorizationContent() {
  const [rateLimits, setRateLimits] = useState(DEMO_RATE_LIMITS);
  const [saved, setSaved] = useState(false);

  const handleSaveRateLimits = () => {
    // TODO: call API to save rate limits
    setSaved(true);
    toast.success("Rate limits updated");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page intro */}
      <div>
        <h2
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Agent Connection Credentials
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide these credentials to your external AI agent so it can
          authenticate with Keyring and access your secrets.
        </p>
      </div>

      {/* Credentials card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/15">
            <Shield className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
          </div>
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Credentials
          </h3>
          <span className="ml-auto text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
            Active
          </span>
        </div>

        <div className="divide-y divide-border">
          {/* API Key */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  API Key
                </p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <MaskedValue
                    value={DEMO_CREDENTIALS.apiKey}
                    showLength={12}
                  />
                  <CopyButton value={DEMO_CREDENTIALS.apiKey} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Use this as the{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    X-Keyring-API-Key
                  </code>{" "}
                  header in all requests.
                </p>
              </div>
              <div className="pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    // TODO: call API to regenerate key
                    toast.success("API key regenerated (demo — not actually changed)");
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          {/* Secret Token */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Secret Token
                </p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <MaskedValue
                    value={DEMO_CREDENTIALS.secretToken}
                    showLength={12}
                  />
                  <CopyButton value={DEMO_CREDENTIALS.secretToken} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Use this alongside the API key for webhook signature
                  verification.
                </p>
              </div>
              <div className="pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    // TODO: call API to regenerate secret token
                    toast.success("Secret token regenerated (demo — not actually changed)");
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          {/* Connection URL */}
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Full Connection URL
            </p>
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
              <Link2
                className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                strokeWidth={1.8}
              />
              <span className="font-mono text-sm text-foreground truncate flex-1">
                {DEMO_CREDENTIALS.connectionUrl}
              </span>
              <CopyButton value={DEMO_CREDENTIALS.connectionUrl} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              This is the base URL your agent should hit for all Keyring API
              requests.
            </p>
          </div>
        </div>
      </div>

      {/* Quick start snippet */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Quick Start
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground mb-3">
            Add this to your agent&apos;s environment to connect to Keyring:
          </p>
          <div className="relative rounded-lg bg-muted/50 border border-border p-4 font-mono text-xs text-muted-foreground">
            <CopyButton
              value={`KEYRING_API_KEY=${DEMO_CREDENTIALS.apiKey}\nKEYRING_SECRET=${DEMO_CREDENTIALS.secretToken}\nKEYRING_URL=${DEMO_CREDENTIALS.connectionUrl}`}
            />
            <div className="absolute top-3 right-3" />
            <p className="text-emerald-500"># Add to your .env file</p>
            <p className="mt-1">
              <span className="text-primary">KEYRING_API_KEY</span>=
              <span className="text-foreground">
                {DEMO_CREDENTIALS.apiKey.slice(0, 16)}••••
              </span>
            </p>
            <p>
              <span className="text-primary">KEYRING_SECRET</span>=
              <span className="text-foreground">
                {DEMO_CREDENTIALS.secretToken.slice(0, 16)}••••
              </span>
            </p>
            <p>
              <span className="text-primary">KEYRING_URL</span>=
              <span className="text-foreground">
                {DEMO_CREDENTIALS.connectionUrl}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Rate Limiters */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/15">
            <Gauge className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <h3
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Rate Limiters
            </h3>
            <p className="text-xs text-muted-foreground">
              Maximum requests allowed per time window across all agents
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Per Minute
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={rateLimits.perMinute}
                  onChange={(e) =>
                    setRateLimits((r) => ({
                      ...r,
                      perMinute: Number(e.target.value),
                    }))
                  }
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  req/min
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Per Hour
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={rateLimits.perHour}
                  onChange={(e) =>
                    setRateLimits((r) => ({
                      ...r,
                      perHour: Number(e.target.value),
                    }))
                  }
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  req/hr
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Per Day
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={1000000}
                  value={rateLimits.perDay}
                  onChange={(e) =>
                    setRateLimits((r) => ({
                      ...r,
                      perDay: Number(e.target.value),
                    }))
                  }
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  req/day
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Changes apply immediately to all active agent connections.
            </p>
            <Button
              size="sm"
              onClick={handleSaveRateLimits}
              className="gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  Saved
                </>
              ) : (
                "Save limits"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
