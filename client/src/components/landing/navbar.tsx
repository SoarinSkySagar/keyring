"use client";

import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  KeyRound,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const navLinks = ["How it works", "Security", "Docs"];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLoggedIn = ready && authenticated;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? "bg-background/90 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
            <KeyRound className="w-4 h-4 text-primary" strokeWidth={1.8} />
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Keyring
          </span>
        </Link>

        {/* Center nav links — desktop only */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((label) => (
            <a
              key={label}
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Auth button — shows after Privy is ready */}
          {!mounted || !ready ? (
            <div className="h-9 w-24 sm:w-28 rounded-md bg-muted animate-pulse" />
          ) : isLoggedIn ? (
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm px-3 sm:px-4 h-9"
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          ) : (
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm px-3 sm:px-4 h-9"
            >
              Sign In
            </Button>
          )}

          {/* Mobile hamburger — md:hidden */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
          >
            {mobileOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile nav dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 sm:px-6 pb-4 flex flex-col gap-1">
          {navLinks.map((label) => (
            <a
              key={label}
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5 border-b border-border/40 last:border-0"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
