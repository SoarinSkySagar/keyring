"use client";

import { useState, useEffect, useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { Plus, Trash2, KeyRound, ShieldCheck, X, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useContractSetupContext } from "@/context/contract-setup-context";
import { toUpperSnakeCase, isUpperSnakeCase } from "@/lib/secrets";
import { generateSecretId } from "@/lib/cdr";
import { uploadSecretToCDR } from "@/lib/cdr";
import { KeyringAccessConditionABI } from "@/lib/contracts";
import { createPublicClient, http } from "viem";
import { aeneid } from "@/lib/chains";
import {
  getSecretsAction,
  createSecretAction,
  deleteSecretAction,
  type SecretRow,
} from "@/actions/secrets";

// Public client for receipt confirmation — reuses same RPC as cdr.ts
const aeneidPublicClient = createPublicClient({
  chain: aeneid,
  transport: http("https://aeneid.storyrpc.io"),
});

// ── Add Secret Dialog ─────────────────────────────────────────────────────────

type KeyValuePair = { key: string; value: string };

function AddSecretDialog({
  open,
  onOpenChange,
  onAdd,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (pairs: KeyValuePair[]) => Promise<void>;
  saving: boolean;
}) {
  const [pairs, setPairs] = useState<KeyValuePair[]>([{ key: "", value: "" }]);
  const [keyErrors, setKeyErrors] = useState<Record<number, string>>({});

  const reset = () => {
    setPairs([{ key: "", value: "" }]);
    setKeyErrors({});
  };

  const addPair = () => setPairs((p) => [...p, { key: "", value: "" }]);

  const removePair = (i: number) => {
    setPairs((p) => p.filter((_, idx) => idx !== i));
    setKeyErrors((e) => {
      const next = { ...e };
      delete next[i];
      return next;
    });
  };

  const updateKey = (i: number, raw: string) => {
    const transformed = toUpperSnakeCase(raw);
    setPairs((p) =>
      p.map((pair, idx) => (idx === i ? { ...pair, key: transformed } : pair))
    );
    if (keyErrors[i]) setKeyErrors((e) => { const n = { ...e }; delete n[i]; return n; });
  };

  const updateValue = (i: number, val: string) =>
    setPairs((p) =>
      p.map((pair, idx) => (idx === i ? { ...pair, value: val } : pair))
    );

  const handleSave = async () => {
    const errors: Record<number, string> = {};
    pairs.forEach((p, i) => {
      if (!p.key) return;
      if (!isUpperSnakeCase(p.key))
        errors[i] = "Must be UPPER_SNAKE_CASE (e.g. MY_SECRET_KEY)";
    });

    const valid = pairs.filter((p) => p.key.trim() && p.value.trim());
    if (!valid.length) {
      toast.error("Enter at least one key + value pair");
      return;
    }
    if (Object.keys(errors).length) {
      setKeyErrors(errors);
      return;
    }

    await onAdd(valid);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
              <KeyRound className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            <DialogTitle>Add Secrets</DialogTitle>
          </div>
          <DialogDescription>
            Values are encrypted and locked in the CDR. Only{" "}
            <strong className="text-foreground">names</strong> are visible after
            saving. Names must be{" "}
            <code className="bg-muted px-1 rounded text-xs">UPPER_SNAKE_CASE</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {pairs.map((pair, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div>
                  {i === 0 && (
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                      Key name
                    </label>
                  )}
                  <Input
                    placeholder="e.g. STRIPE_SECRET_KEY"
                    value={pair.key}
                    onChange={(e) => updateKey(i, e.target.value)}
                    disabled={saving}
                    className={`font-mono text-sm ${keyErrors[i] ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                    spellCheck={false}
                  />
                  {keyErrors[i] && (
                    <p className="text-xs text-destructive mt-1">{keyErrors[i]}</p>
                  )}
                </div>
                <div>
                  {i === 0 && (
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                      Value
                    </label>
                  )}
                  <Input
                    type="password"
                    placeholder="Paste secret value…"
                    value={pair.value}
                    onChange={(e) => updateValue(i, e.target.value)}
                    disabled={saving}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              {pairs.length > 1 && (
                <button
                  onClick={() => removePair(i)}
                  disabled={saving}
                  className={`flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ${i === 0 ? "mt-6" : "mt-0"}`}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addPair}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add another key
        </button>

        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={1.8} />
          <p className="text-xs text-muted-foreground">
            Values are encrypted before storage. They are never exposed in plain
            text — not even to Keyring.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Encrypting…
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
                Save to vault
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SecretsContent() {
  const { client: smartClient } = useSmartWallets();
  const { contracts } = useContractSetupContext();

  const [secretsList, setSecretsList] = useState<SecretRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Smart account address — this is the Kernel v3 account address, NOT the embedded EOA.
  // The CDR write condition bypass requires msg.sender == writeConditionAddr; since the
  // smart wallet sends from smartClient.account.address (not the EOA), we must use that.
  const smartWalletAddress = smartClient?.account.address as `0x${string}` | undefined;

  // Load secrets from DB on mount
  const loadSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getSecretsAction();
      setSecretsList(rows);
    } catch (err) {
      console.error("[Secrets] load failed", err);
      toast.error("Failed to load secrets — please refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  // ── Save flow ───────────────────────────────────────────────────────────────
  // For each pair:
  //  1. CDR allocate + encrypt + write  (uses SmartAccountClient → bundler)
  //  2. condition.registerVault(secretId) (uses SmartAccountClient → bundler)
  //  3. DB createSecretAction(name, secretId, cdrVaultUuid)

  const handleAdd = async (pairs: KeyValuePair[]) => {
    if (!smartClient || !contracts || !smartWalletAddress) {
      toast.error("Wallet or contracts not ready");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(
      pairs.length === 1
        ? "Encrypting secret…"
        : `Encrypting ${pairs.length} secrets…`
    );

    const saved: string[] = [];

    try {
      for (const pair of pairs) {
        // Generate a stable identifier for this secret vault
        const secretId = generateSecretId();

        toast.loading(`Encrypting ${pair.key}… (CDR allocate + write)`, { id: toastId });

        // Step 1: CDR allocate → encrypt → write
        const cdrVaultUuid = await uploadSecretToCDR(
          pair.value,
          secretId,
          smartWalletAddress,
          contracts.conditionAddress as `0x${string}`,
          smartClient
        );

        console.log(`[Secrets] CDR vault uuid=${cdrVaultUuid} for ${pair.key}`);

        // Step 2: Register vault ownership in condition contract
        toast.loading(`Registering vault for ${pair.key}…`, { id: toastId });

        const registerHash = await smartClient.writeContract({
          address: contracts.conditionAddress as `0x${string}`,
          abi: KeyringAccessConditionABI,
          functionName: "registerVault",
          args: [secretId as `0x${string}`],
        });

        // Wait for confirmation and hard-fail if it reverted — prevents saving
        // a secretId to the DB that has no on-chain owner, which would make
        // grant/revoke calls fail silently later.
        const registerReceipt = await aeneidPublicClient.waitForTransactionReceipt({
          hash: registerHash,
        });
        if (registerReceipt.status !== "success") {
          throw new Error(`registerVault transaction reverted (txHash: ${registerHash})`);
        }

        console.log(`[Secrets] registerVault confirmed for secretId=${secretId}`);

        // Step 3: Persist name + identifiers to DB
        const { error } = await createSecretAction(pair.key, secretId, cdrVaultUuid);
        if (error) throw new Error(error);

        saved.push(pair.key);
      }

      toast.success(
        saved.length === 1
          ? `${saved[0]} saved to vault`
          : `${saved.length} secrets saved to vault`,
        { id: toastId }
      );

      // Refresh list from DB
      await loadSecrets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save secret";
      console.error("[Secrets] Error:", err);
      toast.error("Failed to save secret", { id: toastId, description: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    const { error } = await deleteSecretAction(id);
    if (error) {
      toast.error("Failed to delete secret");
      return;
    }
    setSecretsList((s) => s.filter((sec) => sec.id !== id));
    toast.success(`${name} removed from vault`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const notReady = !smartClient || !contracts;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Secrets Vault
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Encrypted secrets stored in the CDR. Only names are visible —
            values are never exposed.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setDialogOpen(true)}
          disabled={notReady || saving}
          title={notReady ? "Waiting for wallet & contracts…" : undefined}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Secret
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[
          { label: "Total secrets", value: loading ? "—" : secretsList.length },
          {
            label: "In use",
            value: loading ? "—" : secretsList.length, // updated when Access tab is wired
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

      {/* Secrets list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {loading
              ? "Loading…"
              : `${secretsList.length} Secret${secretsList.length !== 1 ? "s" : ""}`}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : secretsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground">No secrets yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first secret — it will be encrypted and stored on-chain.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {secretsList.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 shrink-0">
                  <KeyRound className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium text-foreground truncate">
                    {secret.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added{" "}
                    {new Date(secret.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · vault #{secret.cdrVaultUuid}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">••••••••</span>
                  <button
                    onClick={() => handleDelete(secret.id, secret.name)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete secret"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSecretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
        saving={saving}
      />
    </div>
  );
}
