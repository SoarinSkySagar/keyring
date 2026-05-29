"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";

export default function LoginPage() {
  const { ready, authenticated } = usePrivy();

  // Already authenticated? Send straight to dashboard.
  useEffect(() => {
    if (ready && authenticated) {
      window.location.replace("/dashboard");
    }
  }, [ready, authenticated]);

  const { login } = useLogin({
    onComplete: () => {
      window.location.replace("/dashboard");
    },
    // User clicked the × to close the modal — go back to landing page.
    onError: (error) => {
      if (error === "exited_auth_flow") {
        window.location.replace("/");
      }
    },
  });

  // Auto-open the modal once Privy is ready and the user is not logged in.
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
