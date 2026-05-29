"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const { ready, authenticated } = usePrivy();

  // If the user is already authenticated when they land here, send them to
  // dashboard immediately (handles refresh / direct URL visits).
  useEffect(() => {
    if (ready && authenticated) {
      window.location.replace("/dashboard");
    }
  }, [ready, authenticated]);

  // useLogin fires onComplete *after* all tokens and cookies are committed,
  // so window.location.href is guaranteed to carry the privy-id-token cookie.
  const { login } = useLogin({
    onComplete: () => {
      window.location.replace("/dashboard");
    },
  });

  // Auto-open the modal once Privy is ready and the user is not logged in.
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
        <KeyRound className="w-6 h-6 text-primary" strokeWidth={1.8} />
      </div>
      <p className="text-sm text-muted-foreground">Opening sign-in…</p>
    </div>
  );
}
