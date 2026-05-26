"use client";

import { useInView } from "@/hooks/use-in-view";
import { XCircle } from "lucide-react";

const problems = [
  {
    label: "Give it the raw key",
    description:
      "Permanent exposure with no auditing and no revocation until you manually rotate. If the agent is compromised, so is every secret it held.",
    tag: "No revocation",
  },
  {
    label: "Build a custom proxy",
    description:
      "Expensive, one-off, non-composable. Still requires trusting the proxy host, and you end up rebuilding the same wheel for every agent integration.",
    tag: "Not composable",
  },
  {
    label: "Don't use agents",
    description:
      "The nuclear option — but not the direction the world is going. Abandoning autonomous agents to avoid secret exposure isn't a long-term strategy.",
    tag: "Not viable",
  },
];

export function Problem() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      {/* Background accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(232,168,53,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div
          className={`kr-reveal ${inView ? "in-view" : ""} mb-14 text-center`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            The Problem
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            The current default
            <br />
            <span className="text-muted-foreground font-normal">
              is structurally broken.
            </span>
          </h2>
          <p className="max-w-lg mx-auto text-muted-foreground text-[0.95rem] leading-relaxed">
            When you deploy an autonomous agent, you hand it your secrets.
            Exchange API keys. Database credentials. Wallet seeds. There are
            only three options — and none of them are good enough.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((problem, i) => (
            <div
              key={problem.label}
              className={`kr-reveal kr-reveal-delay-${i + 1} ${inView ? "in-view" : ""}`}
            >
              <div className="group relative h-full rounded-xl border border-border bg-card p-7 overflow-hidden transition-colors duration-300 hover:border-destructive/30">
                {/* Hover tint */}
                <div className="absolute inset-0 bg-destructive/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

                <div className="relative z-10 flex flex-col h-full gap-4">
                  {/* Icon + tag row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/15">
                      <XCircle
                        className="w-4.5 h-4.5 text-destructive"
                        strokeWidth={1.8}
                      />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-destructive/70 bg-destructive/8 border border-destructive/15 px-2 py-0.5 rounded-full">
                      {problem.tag}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="text-[1.05rem] font-semibold text-foreground mb-2"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {problem.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
