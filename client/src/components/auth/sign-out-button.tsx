"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  className?: string;
  /** Render as a full-width sidebar item (default false = header style) */
  sidebar?: boolean;
}

export function SignOutButton({ className, sidebar = false }: SignOutButtonProps) {
  const { logout } = usePrivy();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  if (sidebar) {
    return (
      <button
        onClick={handleSignOut}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors",
          className
        )}
      >
        <LogOut className="w-4 h-4" strokeWidth={1.8} />
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className={cn(
        "flex items-center gap-2 w-full px-1.5 py-1 text-destructive",
        className
      )}
    >
      <LogOut className="w-4 h-4" /> Sign out
    </button>
  );
}
