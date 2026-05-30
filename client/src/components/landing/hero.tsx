"use client";

import { useRef, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Lock } from "lucide-react";

/* Floating geometric shape */
function HexShape({
  size,
  className,
  style,
}: {
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const r = size / 2;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${r + r * Math.cos(angle)},${r + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
      aria-hidden
    >
      <polygon
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

/* Floating info chip */
function FloatingChip({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs text-muted-foreground ${className}`}
    >
      <Icon className="w-3 h-3 text-primary shrink-0" strokeWidth={2} />
      {label}
    </div>
  );
}

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 });
  const [heroHeight, setHeroHeight] = useState(0);

  useEffect(() => {
    if (heroRef.current) {
      setHeroHeight(heroRef.current.offsetHeight);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -9999, y: -9999 });
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden kr-dot-grid"
    >
      {/* Cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, var(--kr-amber-glow), transparent 45%)`,
        }}
      />

      {/* Secondary cursor teal ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, var(--kr-teal-glow), transparent 60%)`,
        }}
      />

      {/* Top radial glow (static) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(232,168,53,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Floating hex shapes */}
      <HexShape
        size={180}
        className="absolute top-24 left-[8%] text-primary kr-float-a opacity-[0.12]"
      />
      <HexShape
        size={90}
        className="absolute top-40 left-[18%] text-teal kr-float-b opacity-[0.10]"
        style={{ color: "var(--kr-teal)" }}
      />
      <HexShape
        size={240}
        className="absolute bottom-32 right-[6%] text-primary kr-float-c opacity-[0.08]"
      />
      <HexShape
        size={110}
        className="absolute top-32 right-[20%] text-primary kr-float-b opacity-[0.10]"
      />
      <HexShape
        size={60}
        className="absolute bottom-48 left-[25%] text-teal kr-float-a opacity-[0.12]"
        style={{ color: "var(--kr-teal)", animationDelay: "2s" }}
      />

      {/* Main content */}
      <div className="relative z-20 mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-20 text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-xs font-medium text-primary tracking-wide">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          Built on Story Foundation CDR · Aeneid Testnet
        </div>

        {/* Tagline */}
        <h1
          className="text-[clamp(3.2rem,9vw,7.5rem)] font-extrabold leading-[0.95] tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          <span className="block">The agent</span>
          <span className="block">never has</span>
          <span className="block kr-text-shimmer">the key.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-[1.05rem] leading-relaxed text-muted-foreground mt-2">
          On-chain, scoped, revocable, metered access to secrets for AI agents.
          Every operation audited. Every grant revocable in one transaction.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Button
            size="lg"
            className="group bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-7 h-12 text-[0.95rem]"
          >
            Join the Waitlist
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-border hover:bg-accent font-medium px-7 h-12 text-[0.95rem] text-muted-foreground hover:text-foreground"
          >
            Read the Docs
          </Button>
        </div>

        {/* Floating info chips */}
        <div className="relative w-full max-w-2xl mt-6 hidden lg:block h-12">
          <FloatingChip
            icon={Lock}
            label="On-chain Access Control"
            className="absolute left-0 top-0"
          />
          <FloatingChip
            icon={Shield}
            label="Phala TDX Attestation"
            className="absolute left-1/2 -translate-x-1/2 top-0"
          />
          <FloatingChip
            icon={Zap}
            label="CDR Threshold Encryption"
            className="absolute right-0 top-0"
          />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 inset-x-0 h-40 z-10"
        style={{
          background:
            "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />
    </section>
  );
}
