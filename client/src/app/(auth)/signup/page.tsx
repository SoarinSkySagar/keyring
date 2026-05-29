"use client";

// Signup is handled entirely by Privy — redirect to login.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
