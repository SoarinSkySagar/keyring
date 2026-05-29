/**
 * Hardcoded demo secrets available in the vault.
 * These are placeholders until CDR integration is complete.
 * All names are UPPER_SNAKE_CASE per the naming convention.
 */
export const HARDCODED_SECRETS = [
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "WALLET_PRIVATE_KEY",
  "DATABASE_URL",
  "COINBASE_API_KEY",
  "TWITTER_BEARER_TOKEN",
] as const;

export type HardcodedSecret = (typeof HARDCODED_SECRETS)[number];

/** Returns true if a string is valid UPPER_SNAKE_CASE. */
export function isUpperSnakeCase(s: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(s);
}

/** Transforms any string into UPPER_SNAKE_CASE. */
export function toUpperSnakeCase(val: string): string {
  return val
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
