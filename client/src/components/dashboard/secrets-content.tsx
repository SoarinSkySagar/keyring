"use client";

import { useState } from "react";
import { Plus, Trash2, KeyRound, ShieldCheck, X, ChevronRight } from "lucide-react";
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
import { HARDCODED_SECRETS, toUpperSnakeCase, isUpperSnakeCase } from "@/lib/secrets";

type Secret = {
  id: string;
  name: string;
  addedAt: string;
  usedBy: number;
  hardcoded?: boolean;
};

const INITIAL_SECRETS: Secret[] = HARDCODED_SECRETS.map((name) => ({
  id: `hardcoded_${name}`,
  name,
  addedAt: "Built-in",
  usedBy: 0,
  hardcoded: true,
}));

// ── Add Secret Dialog ──────────────────────────────────────────────────────────

type KeyValuePair = { key: string; value: string };

function AddSecretDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (pairs: KeyValuePair[]) => void;
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
    setPairs((p) => p.map((pair, idx) => (idx === i ? { ...pair, key: transformed } : pair)));
    if (keyErrors[i]) {
      setKeyErrors((e) => { const n = { ...e }; delete n[i]; return n; });
    }
  };

  const updateValue = (i: number, val: string) => {
    setPairs((p) => p.map((pair, idx) => (idx === i ? { ...pair, value: val } : pair)));
  };

  const handleSave = () => {
    const errors: Record<number, string> = {};
    pairs.forEach((p, i) => {
      if (!p.key) return;
      if (!isUpperSnakeCase(p.key)) {
        errors[i] = "Must be UPPER_SNAKE_CASE (e.g. MY_SECRET_KEY)";
      }
    });

    const valid = pairs.filter((p) => p.key.trim());
    if (!valid.length) {
      toast.error("Enter at least one secret name");
      return;
    }
    if (Object.keys(errors).length) {
      setKeyErrors(errors);
      return;
    }

    onAdd(valid);
    toast.success(`${valid.length} secret${valid.length > 1 ? "s" : ""} added to vault`);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
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
            Secret values are encrypted and locked in the CDR. Only secret{" "}
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
                    placeholder="Paste secret value..."
                    value={pair.value}
                    onChange={(e) => updateValue(i, e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              {pairs.length > 1 && (
                <button
                  onClick={() => removePair(i)}
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
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add another key
        </button>

        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={1.8} />
          <p className="text-xs text-muted-foreground">
            Values are encrypted before storage and never retrievable in plain text.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
            Save to vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SecretsContent() {
  const [secrets, setSecrets] = useState<Secret[]>(INITIAL_SECRETS);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdd = (pairs: KeyValuePair[]) => {
    const newSecrets: Secret[] = pairs.map((p, i) => ({
      id: `sec_${Date.now()}_${i}`,
      name: p.key.trim(),
      addedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      usedBy: 0,
    }));
    setSecrets((s) => [...newSecrets, ...s]);
  };

  const handleDelete = (id: string) => {
    setSecrets((s) => s.filter((sec) => sec.id !== id));
    toast.success("Secret removed from vault");
  };

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
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Secret
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Total secrets", value: secrets.length },
          { label: "In use", value: secrets.filter((s) => s.usedBy > 0).length },
          { label: "Built-in", value: secrets.filter((s) => s.hardcoded).length },
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
            {secrets.length} Secret{secrets.length !== 1 ? "s" : ""}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        </div>

        <div className="divide-y divide-border">
          {secrets.map((secret) => (
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
                  {secret.hardcoded ? (
                    <span className="text-primary/60">Built-in demo secret</span>
                  ) : (
                    <>
                      Added {secret.addedAt} ·{" "}
                      {secret.usedBy > 0
                        ? `Used by ${secret.usedBy} agent${secret.usedBy > 1 ? "s" : ""}`
                        : "Not in use"}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {secret.hardcoded && (
                  <span className="hidden sm:inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border bg-primary/8 text-primary border-primary/20">
                    Demo
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-mono">••••••••</span>

                {!secret.hardcoded && (
                  <button
                    onClick={() => handleDelete(secret.id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete secret"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddSecretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
      />
    </div>
  );
}
