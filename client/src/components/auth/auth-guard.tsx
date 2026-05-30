"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Wraps any subtree that requires authentication.
 * Privy keeps auth state in localStorage — this is the only reliable place
 * to check it. Middleware-based cookie checks break because Privy only writes
 * cookies during the login flow, not on session restore from localStorage.
 *
 * After the client session becomes ready, we call router.refresh() once.
 * This re-runs all server components (including getCurrentUser() calls) with
 * the now-present Privy cookies. Without this, session-restore logins serve
 * the stale SSR output that was rendered before cookies were set, showing an
 * empty dashboard on the first page load of a session.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const refreshed = useRef(false);

  useEffect(() => {
    if (ready && !authenticated) {
      window.location.replace("/login");
    }
  }, [ready, authenticated]);

  // Re-run server components once auth is established so getCurrentUser()
  // sees the correct cookies. Track via useTransition so we keep rendering
  // null (not stale empty content) while the refresh is in flight.
  useEffect(() => {
    if (ready && authenticated && !refreshed.current) {
      refreshed.current = true;
      startTransition(() => {
        router.refresh();
      });
    }
  }, [ready, authenticated, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render nothing until: ready, authenticated, AND the post-auth refresh done.
  if (!ready || !authenticated || isRefreshing) return null;

  return <>{children}</>;
}
