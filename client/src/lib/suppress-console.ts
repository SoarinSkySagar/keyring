/**
 * Suppress known third-party console noise that we cannot fix upstream.
 * Called once at app startup (imported in the root layout).
 *
 * Filters applied:
 *  - "Unable to fetch token price" — Privy queries a price feed for chain 1315 (Aeneid)
 *    which doesn't exist. Harmless; only affects USD display in Privy's wallet UI.
 *  - "React does not recognize the `isActive` prop" — a Privy component passes a custom
 *    boolean prop to a DOM element. Privy bug; no functional impact.
 */
export function suppressThirdPartyConsoleNoise(): void {
  if (typeof window === "undefined") return; // server — nothing to suppress

  const SUPPRESSED = [
    "Unable to fetch token price",
    'React does not recognize the `isActive` prop',
  ];

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => String(a ?? "")).join(" ");
    if (SUPPRESSED.some((s) => msg.includes(s))) return;
    originalError(...args);
  };

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const msg = args.map((a) => String(a ?? "")).join(" ");
    if (SUPPRESSED.some((s) => msg.includes(s))) return;
    originalWarn(...args);
  };
}
