"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  Lock,
  Users,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/secrets", label: "Secrets", icon: KeyRound },
  { href: "/dashboard/authorization", label: "Authorization", icon: Lock },
  { href: "/dashboard/access", label: "Access", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Mobile hamburger trigger ─────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-9 h-9 rounded-lg bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors backdrop-blur-sm"
      >
        <Menu className="w-4 h-4" strokeWidth={2} />
      </button>

      {/* ── Backdrop overlay ─────────────────────────────────────────── */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      />

      {/* ── Sidebar panel ────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 lg:w-60 flex flex-col border-r border-border bg-card z-50",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo row */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20">
            <KeyRound className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
          </div>
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Keyring
          </span>
          <span className="ml-auto text-[9px] font-mono font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
            Beta
          </span>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="lg:hidden ml-1 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground px-2 mb-2">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary border border-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon
                  className={cn("w-4 h-4 shrink-0", active && "text-primary")}
                  strokeWidth={1.8}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            Back to website
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
