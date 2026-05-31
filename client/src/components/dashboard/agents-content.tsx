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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getAgentsAction,
  createAgentAction,
  deleteAgentAction,
  regenerateAgentKeyAction,
  type AgentRow,
} from "@/actions/agents";
import { getSecretsAction, type SecretRow } from "@/actions/secrets";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useContractSetupContext } from "@/context/contract-setup-context";
import { AgentRegistryABI, KeyringAccessConditionABI } from "@/lib/contracts";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { aeneid } from "@/lib/chains";

// ── Shared public client ───────────────────────────────────────────────────────
const aeneidPublicClient = createPublicClient({
  chain: aeneid,
  transport: http("https://aeneid.storyrpc.io"),
});

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
  availableSecrets,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (agent: AgentRow) => void;
  availableSecrets: SecretRow[];
}) {
  const { client: smartClient } = useSmartWallets();
  const { contracts } = useContractSetupContext();

  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [selectedSecrets, setSelectedSecrets] = useState<SecretRow[]>([]);
  const [policy, setPolicy] = useState("");
  const [createdAgent, setCreatedAgent] = useState<AgentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const reset = () => {
    setStep(1);
    setAgentName("");
    setSelectedSecrets([]);
    setPolicy("");
    setCreatedAgent(null);
    setSaving(false);
    setLoadingMsg("");
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const toggleSecret = (secret: SecretRow) =>
    setSelectedSecrets((s) =>
      s.some((x) => x.id === secret.id)
        ? s.filter((x) => x.id !== secret.id)
        : [...s, secret]
    );

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
    if (!smartClient || !contracts) {
      toast.error("Smart wallet not ready — please wait");
      return;
    }

    setSaving(true);
    try {
      // 1. Generate agent keypair — private key is the agent's credential
      const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
      const privateKey = ("0x" + Array.from(privateKeyBytes).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;

      // Derive the SimpleAccount smart wallet address (not EOA) — this is
      // what gets registered in AgentRegistry and what CDR sees as msg.sender.
      // Pimlico pays gas for UserOps sent from this address (zero cost to user).
      setLoadingMsg("Generating agent wallet…");
      const smartAccount = await toSimpleSmartAccount({
        client: aeneidPublicClient,
        owner: privateKeyToAccount(privateKey),
        entryPoint: { address: entryPoint07Address, version: "0.7" },
      });
      const agentWalletAddress = smartAccount.address;

      // 2. Register agent as Story Protocol IP Asset
      setLoadingMsg("Registering on Story Protocol…");
      const createTxHash = await smartClient.writeContract({
        address: contracts.agentRegistryAddress as `0x${string}`,
        abi: AgentRegistryABI,
        functionName: "createAgent",
        args: [agentName.trim(), agentWalletAddress],
        chain: aeneid,
      }) as `0x${string}`;

      const createReceipt = await aeneidPublicClient.waitForTransactionReceipt({ hash: createTxHash });
      if (createReceipt.status !== "success")
        throw new Error(`createAgent transaction reverted (${createTxHash})`);

      // 3. Read ipId from contract (view call — simpler than event parsing)
      const ipId = await aeneidPublicClient.readContract({
        address: contracts.agentRegistryAddress as `0x${string}`,
        abi: AgentRegistryABI,
        functionName: "getIpId",
        args: [agentWalletAddress],
      }) as `0x${string}`;

      if (!ipId || ipId === "0x0000000000000000000000000000000000000000")
        throw new Error("Could not retrieve IP Asset ID after createAgent");

      // 4. Batch grantAccess for all selected secrets in a single UserOp
      if (selectedSecrets.length > 0) {
        setLoadingMsg("Granting vault access…");
        const grantCalls = selectedSecrets.map((s) => ({
          to: contracts.conditionAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: KeyringAccessConditionABI,
            functionName: "grantAccess",
            args: [s.secretId as `0x${string}`, ipId, 0n],
          }),
          value: 0n,
        }));

        const grantTxHash = await (smartClient as any).sendTransaction({ calls: grantCalls }) as `0x${string}`;
        const grantReceipt = await aeneidPublicClient.waitForTransactionReceipt({ hash: grantTxHash });
        if (grantReceipt.status !== "success")
          throw new Error(`grantAccess transaction reverted (${grantTxHash})`);
      }

      // 5. Save everything to DB
      setLoadingMsg("Saving…");
      const result = await createAgentAction(
        agentName.trim(),
        selectedSecrets.map((s) => s.name),
        selectedSecrets.map((s) => s.secretId),
        policy.trim(),
        privateKey,
        ipId
      );

      if (result.error || !result.agent) {
        throw new Error(result.error ?? "Failed to save agent");
      }

      setCreatedAgent(result.agent);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Agent creation failed");
    } finally {
      setSaving(false);
      setLoadingMsg("");
    }
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
          <StepIndicator step={3} current={step} label="Agent Key" />
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
                <input
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors"
                  placeholder="e.g. TradingBot v3"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Allowed secrets
                </label>
                {availableSecrets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-lg border border-dashed border-border text-center">
                    <KeyRound className="w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
                    <p className="text-xs text-muted-foreground">
                      No secrets found — add secrets in the Secrets tab first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableSecrets.map((secret) => {
                      const selected = selectedSecrets.some((x) => x.id === secret.id);
                      return (
                        <button
                          key={secret.id}
                          onClick={() => toggleSecret(secret)}
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
                          {secret.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleStep1Next}
                disabled={availableSecrets.length === 0}
              >
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
                    key={s.id}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full"
                  >
                    <KeyRound className="w-2.5 h-2.5" strokeWidth={2} />
                    {s.name}
                  </span>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Policy description
                </label>
                <textarea
                  className="w-full min-h-32 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-none transition-colors"
                  placeholder={`This agent is a ${agentName.toLowerCase() || "trading bot"} that… It should only use the keys to… It must never…`}
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
                  This will mint a Story Protocol IP Asset for the agent and grant
                  on-chain vault access. Two transaction confirmations required.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={saving}>Back</Button>
              <Button size="sm" className="gap-1.5" onClick={handleStep2Next} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {loadingMsg || "Creating…"}</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> Create agent</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Agent Key ── */}
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
                <strong className="text-foreground">{createdAgent.name}</strong> is now registered
                on Story Protocol with vault access. Copy the agent key — the agent uses it to
                decrypt secrets from CDR.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <p className="text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
                  Agent Private Key — keep this secret
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground flex-1 break-all">
                    {createdAgent.agentKey}
                  </span>
                  <CopyInline value={createdAgent.agentKey} />
                </div>
              </div>

              {createdAgent.ipId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground shrink-0">IP Asset</span>
                  <span className="font-mono text-xs text-foreground truncate flex-1">
                    {createdAgent.ipId}
                  </span>
                  <a
                    href={`https://aeneid.storyscan.io/address/${createdAgent.ipId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title="View on StoryScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </a>
                </div>
              )}

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

// ── View Key Dialog ────────────────────────────────────────────────────────

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
            <DialogTitle>Agent Key</DialogTitle>
          </div>
          <DialogDescription>
            The private key for <strong className="text-foreground">{agent.name}</strong>.
            Use this to authenticate with Keyring and decrypt secrets via CDR.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <p className="text-xs font-medium text-amber-500 uppercase tracking-wide mb-2">
            Agent Private Key
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-foreground flex-1 break-all">
              {agent.agentKey}
            </span>
            <CopyInline value={agent.agentKey} />
          </div>
        </div>

        {agent.ipId && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-xs text-muted-foreground shrink-0">IP Asset</span>
            <span className="font-mono text-xs text-foreground truncate flex-1">{agent.ipId}</span>
            <a
              href={`https://aeneid.storyscan.io/address/${agent.ipId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
            </a>
          </div>
        )}

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
    toast.success("Agent key regenerated — old key is now invalid");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Agent Key</DialogTitle>
          <DialogDescription>
            This will immediately invalidate{" "}
            <strong className="text-foreground">{agent.name}</strong>&apos;s current key.
            All requests using the old key will fail.
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
            I understand the old agent key will stop working immediately
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

// ── Main component ─────────────────────────────────────────────────────────

export function AgentsContent() {
  const { client: smartClient } = useSmartWallets();
  const { contracts } = useContractSetupContext();

  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [availableSecrets, setAvailableSecrets] = useState<SecretRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<AgentRow | null>(null);
  const [regenTarget, setRegenTarget] = useState<AgentRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rows, secrets] = await Promise.all([getAgentsAction(), getSecretsAction()]);
    setAgentList(rows);
    setAvailableSecrets(secrets);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreated = (agent: AgentRow) => setAgentList((a) => [agent, ...a]);

  const handleDelete = async (agent: AgentRow) => {
    if (!smartClient || !contracts) {
      toast.error("Smart wallet not ready");
      return;
    }

    setDeletingId(agent.id);
    try {
      // Batch on-chain cleanup: deleteAgent + revokeAccess for each secret
      if (agent.ipId) {
        const calls: { to: `0x${string}`; data: `0x${string}`; value: bigint }[] = [
          {
            to: contracts.agentRegistryAddress as `0x${string}`,
            data: encodeFunctionData({
              abi: AgentRegistryABI,
              functionName: "deleteAgent",
              args: [agent.ipId as `0x${string}`],
            }),
            value: 0n,
          },
          ...agent.allowedSecretIds.map((secretId) => ({
            to: contracts.conditionAddress as `0x${string}`,
            data: encodeFunctionData({
              abi: KeyringAccessConditionABI,
              functionName: "revokeAccess",
              args: [secretId as `0x${string}`, agent.ipId as `0x${string}`],
            }),
            value: 0n,
          })),
        ];

        const txHash = await (smartClient as any).sendTransaction({ calls }) as `0x${string}`;
        const receipt = await aeneidPublicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success")
          throw new Error(`Agent deletion reverted (${txHash})`);
      }

      const result = await deleteAgentAction(agent.id);
      if (result.error) throw new Error(result.error);

      setAgentList((a) => a.filter((ag) => ag.id !== agent.id));
      toast.success("Agent removed and access revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerated = (id: string, newKey: string) => {
    setAgentList((a) => a.map((ag) => ag.id === id ? { ...ag, agentKey: newKey } : ag));
  };

  const activeCount = agentList.filter((a) => a.status === "active").length;
  const inactiveCount = agentList.filter((a) => a.status === "inactive").length;

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
            Only whitelisted agents can decrypt your secrets. Each agent is a Story Protocol IP Asset.
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
          { label: "Total agents", value: loading ? "—" : agentList.length },
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
            {loading ? "Loading…" : `${agentList.length} Whitelisted Agent${agentList.length !== 1 ? "s" : ""}`}
          </h3>
          <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading agents…</span>
          </div>
        ) : agentList.length === 0 ? (
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
            {agentList.map((agent) => (
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
                      {agent.ipId && (
                        <a
                          href={`https://aeneid.storyscan.io/address/${agent.ipId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                          title="View IP Asset on StoryScan"
                        >
                          IP Asset
                          <ExternalLink className="w-2.5 h-2.5" strokeWidth={2} />
                        </a>
                      )}
                    </div>

                    {/* Agent key — truncated + copy */}
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
                        View agent key
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRegenTarget(agent)} className="gap-2">
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                        Regenerate key
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(agent)}
                        disabled={deletingId === agent.id}
                        className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        {deletingId === agent.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.8} />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        )}
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
        availableSecrets={availableSecrets}
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
