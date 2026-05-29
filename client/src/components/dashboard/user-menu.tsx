"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { Copy, Check, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function UserMenu() {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [copied, setCopied] = useState(false);

  const email = user?.email?.address ?? user?.google?.email ?? null;
  const name = user?.google?.name ?? null;

  // For wallet-login users who have no email/name, show their truncated
  // external wallet address instead of the generic "Account" fallback.
  // connectorType === 'embedded' covers both 'privy' and 'privy-v2' wallet
  // client types; checking walletClientType === 'privy' alone misses v2.
  const walletAccounts = user?.linkedAccounts?.filter(
    (acc): acc is import("@privy-io/react-auth").WalletWithMetadata =>
      acc.type === "wallet",
  ) ?? [];
  const externalWallet = walletAccounts.find((w) => w.connectorType !== "embedded");
  const externalAddress = externalWallet?.address ?? null;

  const displayName = name ?? email ?? (externalAddress ? truncate(externalAddress) : "Account");
  const initials = (name ?? email ?? externalAddress ?? "AC").slice(0, 2).toUpperCase();

  // Prefer the live connected wallet from useWallets(); fall back to
  // linkedAccounts so the address shows even when the Privy session hasn't
  // re-connected the embedded wallet (common for external-wallet-login users).
  const isEmbedded = (w: { connectorType?: string; walletClientType?: string }) =>
    w.connectorType === "embedded" || (w.walletClientType ?? "").startsWith("privy");

  const embeddedFromHook = wallets.find(isEmbedded);
  const embeddedFromAccounts = walletAccounts.find(isEmbedded);
  const walletAddress = embeddedFromHook?.address ?? embeddedFromAccounts?.address ?? null;

  // Debug: log wallet data so you can inspect in browser DevTools.
  useEffect(() => {
    if (!user) return;
    console.log("[UserMenu] wallets from useWallets():", wallets.map(w => ({
      address: w.address, walletClientType: w.walletClientType, connectorType: w.connectorType,
    })));
    console.log("[UserMenu] wallet linkedAccounts:", walletAccounts.map(w => ({
      address: w.address, walletClientType: w.walletClientType, connectorType: w.connectorType,
    })));
    console.log("[UserMenu] resolved embedded wallet address:", walletAddress);
  }, [user, wallets]); // eslint-disable-line react-hooks/exhaustive-deps

  // If no embedded wallet found after Privy is ready, create one.
  // This handles users who authenticated via external wallet before
  // createOnLogin was configured, or when it silently failed.
  useEffect(() => {
    if (!user || walletAddress) return;
    createWallet().catch(() => {
      // Silently ignore — most likely the wallet already exists and
      // Privy just needs a moment to surface it.
    });
  }, [user, walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSignOut = async () => {
    await logout();
    window.location.replace("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none cursor-pointer">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground leading-tight">
            {displayName}
          </p>
          {name && email && (
            <p className="text-xs text-muted-foreground leading-tight">
              {email}
            </p>
          )}
        </div>
        <Avatar className="w-8 h-8 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
        {/* Identity */}
        <div className="px-4 py-3 border-b border-border">
          {name && (
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {name}
            </p>
          )}
          {email && (
            <p className={`text-xs leading-tight truncate ${name ? "text-muted-foreground mt-0.5" : "text-sm font-semibold text-foreground"}`}>
              {email}
            </p>
          )}
          {!name && !email && (
            <p className="text-sm font-semibold text-foreground">Account</p>
          )}
        </div>

        {/* Embedded wallet */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Embedded Wallet
          </p>
          {walletAddress ? (
            <button
              onClick={copyAddress}
              className="flex items-center justify-between w-full group"
            >
              <span className="text-xs font-mono text-foreground">
                {truncate(walletAddress)}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors ml-2 flex-shrink-0">
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </span>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground italic">Creating…</p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.8} />
          Sign out
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
