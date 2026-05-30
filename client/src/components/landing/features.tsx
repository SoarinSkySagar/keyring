"use client";

import { useInView } from "@/hooks/use-in-view";
import {
  Target,
  Ban,
  Gauge,
  BookOpen,
  Fingerprint,
  Link2,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Scoped",
    description:
      'Not “access to the key” — permission to perform exactly this operation on exactly this resource, bound by paramsHash to specific calldata.',
    accent: true,
  },
  {
    icon: Ban,
    title: "Revocable in real-time",
    description:
      "One transaction kills access for all future requests, globally. Revocation is checked at both gateways — even between G1 and G2.",
    accent: false,
  },
  {
    icon: Gauge,
    title: "Metered by the chain",
    description:
      "Budget is enforced by the contract, not by the agent's own reporting. The on-chain read is the metered event — no self-reporting.",
    accent: false,
  },
  {
    icon: BookOpen,
    title: "Fully auditable",
    description:
      "Every step is an on-chain event. Permanent, public, requires no trusted third party to maintain. Immutable audit trail from intent to result.",
    accent: false,
  },
  {
    icon: Fingerprint,
    title: "TEE-backed",
    description:
      "Key material exists only inside an attested Phala/TDX enclave running the exact published Docker image. Zeroized immediately after use.",
    accent: true,
  },
  {
    icon: Link2,
    title: "On-chain composable",
    description:
      "Condition contracts are Solidity — auditable by anyone, composable with any protocol. Access logic lives on-chain, not in a closed API.",
    accent: false,
  },
];

export function Features() {
  const { ref, inView } = useInView();

  return (
    <section
      id="capabilities"
      ref={ref}
      className="relative py-28 border-t border-border bg-kr-surface overflow-hidden"
    >
      {/* Background texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 kr-dot-grid opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, var(--kr-amber-glow), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Header */}
        <div
          className={`kr-reveal ${inView ? "in-view" : ""} mb-14 text-center`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Capabilities
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Every property you need.
            <br />
            <span className="text-muted-foreground font-normal">
              None of the tradeoffs.
            </span>
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`kr-reveal kr-reveal-delay-${(i % 3) + 1} ${inView ? "in-view" : ""}`}
            >
              <div
                className={`group relative rounded-xl p-7 h-full border transition-all duration-300 hover:-translate-y-1 ${
                  feature.accent
                    ? "border-primary/25 bg-primary/5 hover:border-primary/40"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                {/* Hover glow for accented cards */}
                {feature.accent && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "radial-gradient(ellipse at top left, var(--kr-amber-glow), transparent 60%)",
                    }}
                  />
                )}

                <div className="relative z-10 flex flex-col gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg border ${
                      feature.accent
                        ? "bg-primary/15 border-primary/25"
                        : "bg-muted border-border"
                    }`}
                  >
                    <feature.icon
                      className={`w-5 h-5 ${feature.accent ? "text-primary" : "text-muted-foreground"}`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div>
                    <h3
                      className="text-[1rem] font-semibold text-foreground mb-1.5"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
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
