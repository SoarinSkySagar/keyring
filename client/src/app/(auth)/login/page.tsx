"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      router.replace("/dashboard");
    } else {
      login();
    }
  }, [ready, authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
        <KeyRound className="w-6 h-6 text-primary" strokeWidth={1.8} />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Opening sign-in…</p>
      </div>
    </div>
  );
}
