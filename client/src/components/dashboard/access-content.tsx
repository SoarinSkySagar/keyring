"use client";

import { useState, useEffect, useCallback } from "react";
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
  Eye,
  Loader2,
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
import { HARDCODED_SECRETS } from "@/lib/secrets";
import {
  getAgentsAction,
  createAgentAction,
  deleteAgentAction,
  regenerateAgentKeyAction,
  type AgentRow,
} from "@/actions/agents";

// All secrets available for selection — hardcoded until CDR integration
const AVAILABLE_SECRETS: string[] = [...HARDCODED_SECRETS];

// ── Helpers ────────────────────────────────────────────────────────────────────

function CopyInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
      ) : (
        <Copy className="w-3 h-3" strokeWidth={1.8} />
      )}
    </button>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border transition-colors",
          done ? "bg-primary border-primary text-primary-foreground"
            : active ? "border-primary text-primary bg-primary/10"
            : "border-border text-muted-foreground"
        )}
      >
        {done ? <Check className="w-3 h-3" strokeWidth={2.5} /> : step}
      </div>
      <span className={cn("text-xs font-medium hidden sm:block", active ? "text-foreground" : "text-muted-foreground")}>
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
  onCreated: (agent: AgentRow) => void;
}) {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
  const [policy, setPolicy] = useState("");
  const [createdAgent, setCreatedAgent] = useState<AgentRow | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(1);
    setAgentName("");
    setSelectedSecrets([]);
    setPolicy("");
    setCreatedAgent(null);
    setSaving(false);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const toggleSecret = (name: string) =>
    setSelectedSecrets((s) => s.includes(name) ? s.filter((x) => x !== name) : [...s, name]);

  const handleStep1Next = () => {
    if (!agentName.trim()) { toast.error("Enter an agent name"); return; }
    if (!selectedSecrets.length) { toast.error("Select at least one secret"); return; }
    setStep(2);
  };

  const handleStep2Next = async () => {
    if (policy.trim().length < 20) {
      toast.error("Write at least 20 characters for the policy");
      return;
    }
    setSaving(true);
    const result = await createAgentAction(agentName.trim(), selectedSecrets, policy.trim());
    setSaving(false);
    if (result.error || !result.agent) {
      toast.error(result.error ?? "Failed to create agent");
      return;
    }
    setCreatedAgent(result.agent);
    setStep(3);
  };

  const handleFinish = () => {
    if (createdAgent) onCreated(createdAgent);
    handleClose();
    toast.success(`Agent "${createdAgent?.name}" created and whitelisted`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <StepIndicator step={1} current={step} label="Configure" />
          <ChevronRight className="w-3 h-3 text-border shrink-0" />
          <StepIndicator step={2} current={step} label="Policy" />
          <ChevronRight className="w-3 h-3 text-border shrink-0" />
          <StepIndicator step={3} current={step} label="Agent ID" />
        </div>

        {/* ── Step 1 ── */}
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
                Name your agent and choose which secrets it&apos;s allowed to access.
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
                            selected ? "bg-primary border-primary" : "border-border bg-transparent"
                          )}
                        >
                          {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} />}
                        </div>
                        <KeyRound className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleStep1Next}>
                Next <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2 ── */}
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
                Describe what{" "}
                <strong className="text-foreground">{agentName}</strong> should be able to do
                — and what it <em>must not</em> do.
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
                    <span className="text-amber-500">Write at least 20 characters</span>
                  ) : (
                    <span className="text-emerald-500">Looks good</span>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-xs text-muted-foreground">
                  This policy is used by Keyring&apos;s access enforcement layer to decide
                  whether a request is within scope.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" className="gap-1.5" onClick={handleStep2Next} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> Create agent</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Agent ID (viewable any time) ── */}
        {step === 3 && createdAgent && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                </div>
                <DialogTitle>Agent Created</DialogTitle>
              </div>
              <DialogDescription>
                <strong className="text-foreground">{createdAgent.name}</strong> is now
                whitelisted. Use this ID in every API call as the{" "}
                <code className="bg-muted px-1 rounded text-xs">agentId</code> field.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Agent ID
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground flex-1 break-all">
                    {createdAgent.agentKey}
                  </span>
                  <CopyInline value={createdAgent.agentKey} />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                <Eye className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-xs text-muted-foreground">
                  You can view this ID again any time from the Access tab — it&apos;s
                  always available in your agent&apos;s card.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Summary</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="text-foreground font-medium">{createdAgent.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Secrets</span>
                  <span className="text-foreground font-medium">{createdAgent.allowedSecrets.length} granted</span>
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
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── View Key Dialog ────────────────────────────────────────────────────────────

function ViewKeyDialog({
  agent,
  open,
  onOpenChange,
}: {
  agent: AgentRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
              <Eye className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            <DialogTitle>Agent ID</DialogTitle>
          </div>
          <DialogDescription>
            The agent ID for <strong className="text-foreground">{agent.name}</strong>.
            Pass this as <code className="bg-muted px-1 rounded text-xs">agentId</code> in every API call.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Agent ID
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground flex-1 break-all">
              {agent.agentKey}
            </span>
            <CopyInline value={agent.agentKey} />
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
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
  agent: AgentRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegenerated: (id: string, newKey: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const result = await regenerateAgentKeyAction(agent.id);
    setLoading(false);
    if (result.error || !result.agentKey) {
      toast.error(result.error ?? "Failed to regenerate key");
      return;
    }
    onRegenerated(agent.id, result.agentKey);
    onOpenChange(false);
    toast.success("Agent ID regenerated — old ID is now invalid");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Agent ID</DialogTitle>
          <DialogDescription>
            This will immediately invalidate{" "}
            <strong className="text-foreground">{agent.name}</strong>&apos;s current ID.
            All requests using the old ID will fail.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <div
            onClick={() => setConfirmed((v) => !v)}
            className={cn(
              "flex items-center justify-center w-4 h-4 rounded border mt-0.5 shrink-0 transition-colors cursor-pointer",
              confirmed ? "bg-primary border-primary" : "border-border bg-transparent"
            )}
          >
            {confirmed && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            I understand the old agent ID will stop working immediately
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!confirmed || loading}
            onClick={handleConfirm}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
            )}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccessContent() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<AgentRow | null>(null);
  const [regenTarget, setRegenTarget] = useState<AgentRow | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const rows = await getAgentsAction();
    setAgents(rows);
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleCreated = (agent: AgentRow) => setAgents((a) => [agent, ...a]);

  const handleDelete = async (id: string) => {
    const result = await deleteAgentAction(id);
    if (result.error) { toast.error(result.error); return; }
    setAgents((a) => a.filter((ag) => ag.id !== id));
    toast.success("Agent removed and access revoked");
  };

  const handleRegenerated = (id: string, newKey: string) => {
    setAgents((a) => a.map((ag) => ag.id === id ? { ...ag, agentKey: newKey } : ag));
  };

  const activeCount = agents.filter((a) => a.status === "active").length;
  const inactiveCount = agents.filter((a) => a.status === "inactive").length;

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
            Only whitelisted agents with a valid agent ID can access your secrets.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          New Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Total agents", value: loading ? "—" : agents.length },
          { label: "Active", value: loading ? "—" : activeCount },
          { label: "Inactive", value: loading ? "—" : inactiveCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-syne)" }}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agents list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-syne)" }}>
            {loading ? "Loading…" : `${agents.length} Whitelisted Agent${agents.length !== 1 ? "s" : ""}`}
          </h3>
          <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading agents…</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted border border-border">
              <Bot className="w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No agents whitelisted</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first agent to grant access</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              New Agent
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {agents.map((agent) => (
              <div key={agent.id} className="px-5 py-4 hover:bg-accent/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 shrink-0">
                    <Bot className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                      <span
                        className={cn(
                          "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          agent.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {agent.status === "active" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                        )}
                        {agent.status}
                      </span>
                    </div>

                    {/* Agent ID — always visible, copyable */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {agent.agentKey}
                      </span>
                      <CopyInline value={agent.agentKey} />
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
                      <span className="font-medium text-foreground/60">Policy:</span>{" "}
                      {agent.policy}
                    </p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors outline-none shrink-0">
                      <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setViewTarget(agent)} className="gap-2">
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                        View agent ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRegenTarget(agent)} className="gap-2">
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Regenerate ID
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

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {viewTarget && (
        <ViewKeyDialog
          agent={viewTarget}
          open={!!viewTarget}
          onOpenChange={(v) => !v && setViewTarget(null)}
        />
      )}

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
