"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
import { base } from "viem/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "google", "wallet", "passkey"],
        appearance: {
          theme: "dark",
          accentColor: "#8b5cf6",
        },
        // Default chain for smart wallets — must match what you enable in
        // Privy Dashboard → Wallets → Smart Wallets → Supported networks.
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
      }}
    >
      <SmartWalletsProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider delay={300}>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
