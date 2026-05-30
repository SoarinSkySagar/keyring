"use client";

import { useInView } from "@/hooks/use-in-view";
import { Monitor, Cpu, Database } from "lucide-react";

const zones = [
  {
    icon: Monitor,
    emoji: "🔵",
    zone: "Client Side",
    description:
      "The calling agent. Sends a signed request with its registered key. Receives only the operation result — never the credential.",
    detail: "Sends requests · Receives results · Never sees a key",
    color: "border-blue-500/20 bg-blue-500/5",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Cpu,
    emoji: "🔴",
    zone: "TEE Enclave",
    description:
      "Phala Confidential VM on Intel TDX. The only place plaintext ever exists — for the duration of one operation, then zeroized.",
    detail: "Hardware isolated · Attested · Key zeroized after use",
    color: "border-primary/25 bg-primary/5",
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
    featured: true,
  },
  {
    icon: Database,
    emoji: "🟢",
    zone: "CDR + Blockchain",
    description:
      "Threshold-encrypted vault, validator network for partial decryptions, and the immutable on-chain audit log. All access logic lives in condition contracts.",
    detail: "Threshold encryption · On-chain audit · Composable contracts",
    color: "border-teal/20 bg-teal/5",
    iconColor: "text-teal",
    iconBg: "bg-teal/10 border-teal/20",
    teal: true,
  },
];

export function Architecture() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className="relative py-28 border-t border-border overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(232,168,53,0.03) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Header */}
        <div
          className={`kr-reveal ${inView ? "in-view" : ""} mb-14 text-center`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Architecture
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Three trust zones.
            <br />
            <span className="text-muted-foreground font-normal">
              One coherent security model.
            </span>
          </h2>
        </div>

        {/* Zone cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {zones.map((zone, i) => (
            <div
              key={zone.zone}
              className={`kr-reveal kr-reveal-delay-${i + 1} ${inView ? "in-view" : ""}`}
            >
              <div
                className={`group relative rounded-xl border p-8 h-full transition-all duration-300 hover:-translate-y-1 ${zone.color} ${zone.featured ? "shadow-[0_0_40px_-10px_rgba(232,168,53,0.15)]" : ""}`}
              >
                <div className="flex flex-col gap-5">
                  {/* Icon */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-11 h-11 rounded-xl border ${zone.iconBg}`}
                    >
                      <zone.icon
                        className={`w-5 h-5 ${zone.iconColor}`}
                        strokeWidth={1.8}
                      />
                    </div>
                    <span className="text-xl">{zone.emoji}</span>
                  </div>

                  {/* Text */}
                  <div>
                    <h3
                      className="text-lg font-bold text-foreground mb-2"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {zone.zone}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {zone.description}
                    </p>
                    {/* Detail chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {zone.detail.split(" · ").map((d) => (
                        <span
                          key={d}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            zone.featured
                              ? "border-primary/20 bg-primary/8 text-primary"
                              : zone.teal
                                ? "border-teal/20 bg-teal/8 text-teal"
                                : "border-blue-500/20 bg-blue-500/8 text-blue-400"
                          }`}
                          style={
                            zone.teal
                              ? { color: "var(--kr-teal)", backgroundColor: "var(--kr-teal-glow)", borderColor: "rgba(0,212,180,0.2)" }
                              : undefined
                          }
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Flow arrow */}
        <div
          className={`kr-reveal kr-reveal-delay-4 ${inView ? "in-view" : ""} mt-10`}
        >
          <div className="overflow-x-auto">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono min-w-max mx-auto px-4">
              <span className="px-3 py-1 rounded border border-border bg-card text-foreground">
                Agent Intent
              </span>
              <span className="text-border">──▶</span>
              <span className="px-3 py-1 rounded border border-border bg-card">
                G1 Auth
              </span>
              <span className="text-border">──▶</span>
              <span className="px-3 py-1 rounded border border-primary/25 bg-primary/8 text-primary">
                TEE Enclave
              </span>
              <span className="text-border">──▶</span>
              <span className="px-3 py-1 rounded border border-border bg-card">
                G2 CDR
              </span>
              <span className="text-border">──▶</span>
              <span className="px-3 py-1 rounded border border-border bg-card text-foreground">
                Result Only
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
