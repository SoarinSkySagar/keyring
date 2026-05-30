"use client";

import { useInView } from "@/hooks/use-in-view";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function CTA() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className="relative py-32 border-t border-border overflow-hidden"
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, var(--kr-amber-glow), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 kr-dot-grid opacity-40"
      />

      {/* Top gradient line */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--kr-amber) 50%, transparent)",
          opacity: 0.2,
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <div className={`kr-reveal ${inView ? "in-view" : ""}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            Now Live
          </p>
          <h2
            className="text-4xl sm:text-6xl font-extrabold text-foreground mb-5 leading-tight"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Scoped access.
            <br />
            <span className="kr-text-shimmer">No exposure.</span>
          </h2>
          <p className="text-muted-foreground text-[1rem] leading-relaxed mb-10 max-w-lg mx-auto">
            On-chain, scoped, revocable, metered secret grants for your agents —
            running on the Aeneid testnet today.
          </p>

          <Button
            asChild
            size="lg"
            className="group bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-12"
          >
            <Link href="/signup" className="flex items-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              "Built on Story Foundation CDR",
              "Phala TDX attestation",
              "Open-source contracts",
            ].map((t) => (
              <span key={t} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
