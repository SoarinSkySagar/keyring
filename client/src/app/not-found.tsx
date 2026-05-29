import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(232,168,53,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-8">
          <KeyRound className="w-7 h-7 text-primary" strokeWidth={1.6} />
        </div>

        {/* 404 */}
        <p
          className="text-8xl font-extrabold text-primary leading-none tracking-tight mb-4"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          404
        </p>

        {/* Headline */}
        <h1
          className="text-2xl font-bold text-foreground mb-3"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Access denied — vault not found
        </h1>

        {/* Sub */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          This route doesn&apos;t exist or you don&apos;t have a grant to reach
          it. Double-check the URL, or head back to safety.
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-border mb-8" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>

      {/* Bottom wordmark */}
      <p className="absolute bottom-8 text-xs text-muted-foreground/50 font-mono tracking-wider">
        KEYRING · ON-CHAIN SECRET ACCESS
      </p>
    </main>
  );
}
