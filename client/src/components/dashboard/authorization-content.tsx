"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, RefreshCw, Shield, Link2, Gauge, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  generateApiKeyAction,
  getApiKeyStatusAction,
  getRateLimitsAction,
  saveRateLimitsAction,
} from "@/actions/api-key";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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

export function AuthorizationContent() {
  // API key state: null = not yet loaded, "" = not configured, "kr_..." = just generated (shown once)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Rate limits
  const [rateLimits, setRateLimits] = useState({ perMinute: 60, perHour: 1000, perDay: 10000 });
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsSaved, setLimitsSaved] = useState(false);

  // Derive base URL from current window location (client-side only)
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  // Connection URL — only shown when the plain key is available
  const connectionUrl = apiKey ? `${baseUrl}/api/${apiKey}` : "";

  const loadInitialData = useCallback(async () => {
    const [statusResult, limitsResult] = await Promise.all([
      getApiKeyStatusAction(),
      getRateLimitsAction(),
    ]);
    setKeyConfigured(statusResult.configured);
    setApiKey(""); // sentinel: we've loaded, no key to show
    setRateLimits({
      perMinute: limitsResult.perMinute,
      perHour: limitsResult.perHour,
      perDay: limitsResult.perDay,
    });
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    const result = await generateApiKeyAction();
    setRegenerating(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setApiKey(result.key!);
    setKeyConfigured(true);
    toast.success("New API key generated — copy it now, it won't be shown again");
  };

  const handleSaveRateLimits = async () => {
    setSavingLimits(true);
    const result = await saveRateLimitsAction(
      rateLimits.perMinute,
      rateLimits.perHour,
      rateLimits.perDay
    );
    setSavingLimits(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setLimitsSaved(true);
    toast.success("Rate limits updated");
    setTimeout(() => setLimitsSaved(false), 2000);
  };

  const isLoading = apiKey === null;

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
          <span
            className={`ml-auto text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isLoading
                ? "text-muted-foreground bg-muted border border-border"
                : keyConfigured
                ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
                : "text-muted-foreground bg-muted border border-border"
            }`}
          >
            {isLoading ? "Loading…" : keyConfigured ? "Active" : "Not configured"}
          </span>
        </div>

        <div className="divide-y divide-border">
          {/* Secret Key */}
          <div className="px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Secret Key
                </p>
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 min-w-0">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {isLoading ? (
                      <span className="font-mono text-sm text-muted-foreground">Loading…</span>
                    ) : apiKey ? (
                      /* Key just generated — show it fully so user can copy */
                      <span className="font-mono text-sm text-foreground break-all">{apiKey}</span>
                    ) : keyConfigured ? (
                      /* Key exists in DB but we can't display it */
                      <span className="font-mono text-sm text-muted-foreground">
                        kr_<span className="tracking-wider">••••••••••••••••••••••••••••••••</span>
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground italic">
                        Not yet generated
                      </span>
                    )}
                  </div>
                  {apiKey && <CopyButton value={apiKey} />}
                </div>
                {apiKey ? (
                  <p className="flex items-center gap-1.5 text-xs text-amber-500 mt-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2} />
                    Copy this key now — it won&apos;t be shown again after you leave this page.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This key is embedded in your connection URL. Keep it secret.
                  </p>
                )}
              </div>
              <div className="sm:pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 w-full sm:w-auto"
                  onClick={handleRegenerate}
                  disabled={regenerating || isLoading}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`}
                    strokeWidth={1.8}
                  />
                  {keyConfigured ? "Regenerate" : "Generate"}
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
              {connectionUrl ? (
                <>
                  <span className="font-mono text-sm text-foreground truncate flex-1">
                    {connectionUrl}
                  </span>
                  <CopyButton value={connectionUrl} />
                </>
              ) : (
                <span className="font-mono text-sm text-muted-foreground italic flex-1">
                  {isLoading
                    ? "Loading…"
                    : keyConfigured
                    ? `${baseUrl}/api/kr_••••••••••••••••`
                    : "Generate a key above to get your URL"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              This is the base URL your agent should use for all Keyring API requests.
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
          {connectionUrl ? (
            <div className="relative rounded-lg bg-muted/50 border border-border p-4 font-mono text-xs text-muted-foreground">
              <div className="absolute top-3 right-3">
                <CopyButton value={`KEYRING_URL=${connectionUrl}`} />
              </div>
              <p className="text-emerald-500"># Add to your .env file</p>
              <p className="mt-1">
                <span className="text-primary">KEYRING_URL</span>=
                <span className="text-foreground">{connectionUrl}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 border border-dashed border-border p-5 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-muted-foreground">
                Your connection URL will appear here once you generate a key above.
              </p>
            </div>
          )}
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
                    setRateLimits((r) => ({ ...r, perMinute: Number(e.target.value) }))
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
                    setRateLimits((r) => ({ ...r, perHour: Number(e.target.value) }))
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
                    setRateLimits((r) => ({ ...r, perDay: Number(e.target.value) }))
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
              disabled={savingLimits}
              className="gap-1.5"
            >
              {limitsSaved ? (
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
