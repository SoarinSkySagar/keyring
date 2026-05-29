"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";

/**
 * Wraps any subtree that requires authentication.
 * Privy keeps auth state in localStorage — this is the only reliable place
 * to check it. Middleware-based cookie checks break because Privy only writes
 * cookies during the login flow, not on session restore from localStorage.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      window.location.replace("/login");
    }
  }, [ready, authenticated]);

  // While Privy initialises, render nothing (avoids a flash of content).
  if (!ready || !authenticated) return null;

  return <>{children}</>;
}
