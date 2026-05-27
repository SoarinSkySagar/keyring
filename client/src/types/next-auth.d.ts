import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      provider?: string;       // "credentials" | "google" | "metamask"
      walletAddress?: string;  // set for metamask sessions
    } & DefaultSession["user"];
  }
}
