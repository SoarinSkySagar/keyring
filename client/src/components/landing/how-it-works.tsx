"use client";

import { useInView } from "@/hooks/use-in-view";
import { PenLine, CheckCircle2, Cpu, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    number: "01",
    title: "Sign an Intent",
    description:
      "The agent sends a signed request binding the exact operation and resource to its registered key. Each request is scoped to one specific action.",
    detail: "Request binds to one specific operation — no reuse.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    icon: CheckCircle2,
    number: "02",
    title: "Gateway Authorization",
    description:
      "Two on-chain condition contracts run 9 + 8 deterministic checks: identity, scope, budget, kill-switch, time window, attestation, single-use, TTL.",
    detail: "Venice can only veto — never grant. No off-chain assumptions.",
    color: "text-teal",
    bgColor: "bg-teal/10",
    borderColor: "border-teal/20",
    teal: true,
  },
  {
    icon: Cpu,
    number: "03",
    title: "TEE Executes, Agent Gets Result",
    description:
      "The key is recombined inside an attested Phala TDX enclave, the bound operation executes, then the key is immediately zeroized. The agent receives only the result.",
    detail: "Plaintext exists for milliseconds, in hardware nobody can observe.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className="relative py-28 border-t border-border overflow-hidden"
    >
      {/* Top gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--kr-amber) 30%, var(--kr-teal) 70%, transparent)",
          opacity: 0.25,
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div
          className={`kr-reveal ${inView ? "in-view" : ""} mb-16 text-center`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            How It Works
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Three steps. Zero key exposure.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-[3.75rem] left-[calc(33.33%+1.5rem)] right-[calc(33.33%+1.5rem)] h-px border-t border-dashed border-border"
          />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`kr-reveal kr-reveal-delay-${i + 1} ${inView ? "in-view" : ""}`}
            >
              <div className="group relative rounded-xl border border-border bg-card p-8 h-full transition-all duration-300 hover:border-border/80 hover:-translate-y-1">
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: step.teal
                      ? "radial-gradient(ellipse at top left, var(--kr-teal-glow), transparent 60%)"
                      : "radial-gradient(ellipse at top left, var(--kr-amber-glow), transparent 60%)",
                  }}
                />

                <div className="relative z-10 flex flex-col gap-5">
                  {/* Icon + number */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-xl ${step.bgColor} border ${step.borderColor}`}
                    >
                      <step.icon
                        className={`w-5 h-5 ${step.color}`}
                        strokeWidth={1.8}
                      />
                    </div>
                    <span
                      className="text-4xl font-black text-border"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {step.number}
                    </span>
                  </div>

                  {/* Text */}
                  <div>
                    <h3
                      className="text-lg font-bold text-foreground mb-2"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <p
                      className={`text-xs font-medium ${step.color} flex items-center gap-1.5`}
                    >
                      <ArrowRight className="w-3 h-3" />
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key insight callout */}
        <div
          className={`kr-reveal kr-reveal-delay-4 ${inView ? "in-view" : ""} mt-10`}
        >
          <div className="relative rounded-xl border border-primary/20 bg-primary/5 px-8 py-6 overflow-hidden">
            <div
              aria-hidden
              className="absolute right-6 top-1/2 -translate-y-1/2 text-[80px] font-black text-primary/5 select-none pointer-events-none"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              CDR + TEE
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 border border-primary/25">
                <span className="text-lg">🔑</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  The key insight
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  CDR gates decryption via on-chain condition contracts. TEE
                  attestation proves exactly what code holds the key. Together:
                  the agent never has the key — and neither does the host.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
