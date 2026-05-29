"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
import { aeneid } from "@/lib/chains";
import { KeyRound } from "lucide-react";

// React element logo — matches the rounded icon used throughout the app.
// Privy accepts ReactElement here, which lets us replicate the exact
// border-radius and amber palette without needing a separate image file.
const AppLogo = (
  <span style={{ display: "inline-flex" }}>
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: "rgba(232,168,53,0.12)",
        border: "1px solid rgba(232,168,53,0.22)",
      }}
    >
      <KeyRound
        style={{ width: "24px", height: "24px", color: "#e8a835" }}
        strokeWidth={1.8}
      />
    </span>
  </span>
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "dark",
          logo: AppLogo,
          // accentColor comes from the Privy dashboard UI components settings.
        },
        defaultChain: aeneid,
        supportedChains: [aeneid],
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
