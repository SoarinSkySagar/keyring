"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Users,
  Check,
  Copy,
  ChevronRight,
  Bot,
  KeyRound,
  FileText,
  Sparkles,
  Shield,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Replace with real API call (fetch from secrets vault)
const AVAILABLE_SECRETS: string[] = [];

// Replace with real API call
type Agent = {
  id: string;
  name: string;
  agentKey: string;
  allowedSecrets: string[];
  policy: string;
  status: "active" | "inactive";
  createdAt: string;
  lastSeen: string;
};

const INITIAL_AGENTS: Agent[] = [];

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({
  step,
  current,
  label,
}: {
  step: number;
  current: number;
  label: string;
}) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-colors",
          done
            ? "bg-primary border-primary text-primary-foreground"
            : active
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground"
        )}
      >
        {done ? <Check className="w-3 h-3" strokeWidth={2.5} /> : step}
      </div>
      <span
        className={cn(
          "text-xs font-medium hidden sm:block",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ── Create Agent Dialog ────────────────────────────────────────────────────────

function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (agent: Agent) => void;
}) {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
  const [policy, setPolicy] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);

  const reset = () => {
    setStep(1);
    setAgentName("");
    setSelectedSecrets([]);
    setPolicy("");
    setGeneratedKey("");
    setKeyCopied(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const toggleSecret = (name: string) => {
    setSelectedSecrets((s) =>
      s.includes(name) ? s.filter((x) => x !== name) : [...s, name]
    );
  };

  const handleStep1Next = () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    if (!selectedSecrets.length) {
      toast.error("Select at least one secret");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (policy.trim().length < 20) {
      toast.error("Please write a more detailed policy (at least 20 characters)");
      return;
    }
    // TODO: call API to create agent and generate unique key
    const fakeKey = `agt_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    setGeneratedKey(fakeKey);
    setStep(3);
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(generatedKey).catch(() => {});
    setKeyCopied(true);
    toast.success("Agent key copied");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleFinish = () => {
    const newAgent: Agent = {
      id: `agt_${Date.now()}`,
      name: agentName.trim(),
      agentKey: generatedKey,
      allowedSecrets: selectedSecrets,
      policy: policy.trim(),
      status: "active",
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      lastSeen: "Never",
    };
    onCreated(newAgent);
    handleClose();
    toast.success(`Agent "${agentName}" created and whitelisted`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* Step indicators */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <StepIndicator step={1} current={step} label="Configure" />
          <ChevronRight className="w-3 h-3 text-border shrink-0" />
          <StepIndicator step={2} current={step} label="Policy" />
          <ChevronRight className="w-3 h-3 text-border shrink-0" />
          <StepIndicator step={3} current={step} label="Agent Key" />
        </div>

        {/* ── Step 1: Name + Keys ── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                  <Bot className="w-4 h-4 text-primary" strokeWidth={1.8} />
                </div>
                <DialogTitle>New Agent</DialogTitle>
              </div>
              <DialogDescription>
                Name your agent and choose which secrets it&apos;s allowed to
                access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Agent name
                </label>
                <Input
                  placeholder="e.g. TradingBot v3"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Allowed secrets
                </label>
                {AVAILABLE_SECRETS.length === 0 ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-border bg-muted/20">
                    <KeyRound
                      className="w-4 h-4 text-muted-foreground shrink-0"
                      strokeWidth={1.5}
                    />
                    <p className="text-xs text-muted-foreground">
                      No secrets in vault yet — add secrets first before
                      creating an agent.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {AVAILABLE_SECRETS.map((name) => {
                      const selected = selectedSecrets.includes(name);
                      return (
                        <button
                          key={name}
                          onClick={() => toggleSecret(name)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-mono transition-colors text-left",
                            selected
                              ? "border-primary/40 bg-primary/8 text-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center w-5 h-5 rounded border transition-colors shrink-0",
                              selected
                                ? "bg-primary border-primary"
                                : "border-border bg-transparent"
                            )}
                          >
                            {selected && (
                              <Check
                                className="w-3 h-3 text-primary-foreground"
                                strokeWidth={2.5}
                              />
                            )}
                          </div>
                          <KeyRound
                            className="w-3.5 h-3.5 shrink-0"
                            strokeWidth={1.8}
                          />
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleStep1Next}>
                Next
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Policy ── */}
        {step === 2 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                  <FileText className="w-4 h-4 text-primary" strokeWidth={1.8} />
                </div>
                <DialogTitle>Access Policy</DialogTitle>
              </div>
              <DialogDescription>
                Describe in plain language what{" "}
                <strong className="text-foreground">{agentName}</strong> should
                be able to do with the selected secrets — and what it{" "}
                <em>must not</em> do.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/50 border border-border">
                {selectedSecrets.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full"
                  >
                    <KeyRound className="w-2.5 h-2.5" strokeWidth={2} />
                    {s}
                  </span>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Policy description
                </label>
                <textarea
                  className="w-full min-h-32 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-none transition-colors"
                  placeholder={`This agent is a ${agentName.toLowerCase() || "trading bot"} that... It should only use the keys to... It must never...`}
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {policy.length} characters ·{" "}
                  {policy.length < 20 ? (
                    <span className="text-amber-500">
                      Write at least 20 characters
                    </span>
                  ) : (
                    <span className="text-emerald-500">Looks good</span>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                <Sparkles
                  className="w-4 h-4 text-primary shrink-0 mt-0.5"
                  strokeWidth={1.8}
                />
                <p className="text-xs text-muted-foreground">
                  This policy is used by Keyring&apos;s access enforcement layer to
                  decide whether a request from this agent is within scope.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleStep2Next}>
                Generate key
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Agent Key ── */}
        {step === 3 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Shield
                    className="w-4 h-4 text-emerald-500"
                    strokeWidth={1.8}
                  />
                </div>
                <DialogTitle>Agent Key Generated</DialogTitle>
              </div>
              <DialogDescription>
                Provide this unique key to{" "}
                <strong className="text-foreground">{agentName}</strong>. All
                requests must include it to prove agent identity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Agent Key
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground flex-1 break-all">
                    {generatedKey}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors shrink-0"
                    title="Copy"
                  >
                    {keyCopied ? (
                      <Check className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Copy className="w-4 h-4" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-xs font-medium text-amber-500 mb-1">
                  ⚠ Copy this key now
                </p>
                <p className="text-xs text-muted-foreground">
                  This key will not be shown again. If lost, you&apos;ll need to
                  regenerate it. Add it as{" "}
                  <code className="bg-muted px-1 rounded">KEYRING_AGENT_KEY</code>{" "}
                  in your agent&apos;s environment.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Summary</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="text-foreground font-medium">{agentName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Secrets</span>
                  <span className="text-foreground font-medium">
                    {selectedSecrets.length} granted
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-500 font-medium">Active</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" className="w-full gap-1.5" onClick={handleFinish}>
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                Done — I&apos;ve saved the key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Regenerate Key Dialog ──────────────────────────────────────────────────────

function RegenerateKeyDialog({
  agent,
  open,
  onOpenChange,
  onRegenerated,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegenerated: (agentId: string, newKey: string) => void;
}) {
  const [newKey] = useState(
    `agt_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
  );
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("New key copied");
  };

  const handleConfirm = () => {
    // TODO: call API to invalidate old key and activate new one
    onRegenerated(agent.id, newKey);
    onOpenChange(false);
    toast.success("Agent key regenerated");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Agent Key</DialogTitle>
          <DialogDescription>
            This will immediately invalidate{" "}
            <strong className="text-foreground">{agent.name}</strong>&apos;s
            current key. All requests using the old key will fail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-primary/25 bg-primary/5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              New Agent Key
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground flex-1 break-all">
                {newKey}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <Copy className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div
              onClick={() => setConfirmed((v) => !v)}
              className={cn(
                "flex items-center justify-center w-4 h-4 rounded border mt-0.5 shrink-0 transition-colors cursor-pointer",
                confirmed
                  ? "bg-primary border-primary"
                  : "border-border bg-transparent"
              )}
            >
              {confirmed && (
                <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
              )}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              I&apos;ve copied the new key and understand the old one will stop working
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!confirmed}
            onClick={handleConfirm}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
            Regenerate key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccessContent() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [regenTarget, setRegenTarget] = useState<Agent | null>(null);

  const handleCreated = (agent: Agent) => {
    setAgents((a) => [agent, ...a]);
  };

  const handleDelete = (id: string) => {
    // TODO: call API to revoke agent access
    setAgents((a) => a.filter((ag) => ag.id !== id));
    toast.success("Agent removed and access revoked");
  };

  const handleRegenerated = (agentId: string, newKey: string) => {
    setAgents((a) =>
      a.map((ag) => (ag.id === agentId ? { ...ag, agentKey: newKey } : ag))
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Agent Access Control
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Only whitelisted agents with a valid agent key can access your
            secrets. Each agent has a scoped access policy.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          New Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: "Total agents",
            value: agents.length,
          },
          {
            label: "Active",
            value: agents.filter((a) => a.status === "active").length,
          },
          {
            label: "Inactive",
            value: agents.filter((a) => a.status === "inactive").length,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card px-4 py-3 text-center"
          >
            <p
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agents list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {agents.length} Whitelisted Agent{agents.length !== 1 ? "s" : ""}
          </h3>
          <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border">
              <Bot className="w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No agents whitelisted
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first agent to grant access
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              New Agent
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {agents.map((agent) => (
              <div key={agent.id} className="px-5 py-4 hover:bg-accent/20 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 shrink-0">
                    <Bot
                      className="w-4 h-4 text-primary"
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {agent.name}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          agent.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {agent.status === "active" ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                        ) : null}
                        {agent.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {agent.agentKey.slice(0, 20)}••••
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        Last seen {agent.lastSeen}
                      </span>
                    </div>

                    {/* Allowed secrets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {agent.allowedSecrets.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-primary/8 text-primary border border-primary/20 px-2 py-0.5 rounded-full"
                        >
                          <KeyRound className="w-2.5 h-2.5" strokeWidth={2} />
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Policy preview */}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                      <span className="font-medium text-foreground/60">
                        Policy:
                      </span>{" "}
                      {agent.policy}
                    </p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors outline-none shrink-0">
                      <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => setRegenTarget(agent)}
                        className="gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Regenerate key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(agent.id)}
                        className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Revoke access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {regenTarget && (
        <RegenerateKeyDialog
          agent={regenTarget}
          open={!!regenTarget}
          onOpenChange={(v) => !v && setRegenTarget(null)}
          onRegenerated={handleRegenerated}
        />
      )}
    </div>
  );
}
