import { KeyRound } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-border bg-kr-surface py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20">
              <KeyRound className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
            </div>
            <span
              className="text-sm font-semibold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Keyring
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6">
            {[
              { label: "GitHub", href: "https://github.com/SoarinSkySagar/keyring" },
              { label: "Story Foundation", href: "https://www.story.foundation/" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <Separator className="bg-border mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Built for the Story Foundation CDR Hackathon · Aeneid Testnet
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            On-chain · Revocable · Metered
          </p>
        </div>
      </div>
    </footer>
  );
}
