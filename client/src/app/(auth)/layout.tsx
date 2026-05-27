import { KeyRound } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background kr-dot-grid flex flex-col">
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(232,168,53,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 h-14">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
            <KeyRound className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
          </div>
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Keyring
          </span>
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
