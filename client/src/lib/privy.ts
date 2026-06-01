import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

async function findOrCreateUser(privyId: string, email: string | null, name: string | null) {
  // Fast path — already in DB
  let user = await db.query.users.findFirst({
    where: eq(users.privyId, privyId),
  });
  if (user) return user;

  // Migration path: existing email account without privyId → link it
  if (email) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing && !existing.privyId) {
      [user] = await db
        .update(users)
        .set({ privyId })
        .where(eq(users.id, existing.id))
        .returning();
      return user;
    }
  }

  // Fresh account
  [user] = await db
    .insert(users)
    .values({ privyId, email, name })
    .returning();
  return user;
}

/**
 * Returns the current user from our DB, creating on first login.
 * Tries privy-id-token first (no rate limits), falls back to privy-token
 * (access token) + verifyAuthToken. Both cookies are set by the Privy SDK
 * but privy-id-token is only written during the login flow while
 * privy-token is refreshed more reliably.
 * Memoised per request via React cache().
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();

  // ── Strategy 1: identity token (preferred, no rate limits) ──────────
  const idToken = cookieStore.get("privy-id-token")?.value;
  if (idToken) {
    try {
      const privyUser = await privyClient.getUser({ idToken });
      const email = privyUser.email?.address ?? privyUser.google?.email ?? null;
      const name = privyUser.google?.name ?? null;
      return await findOrCreateUser(privyUser.id, email, name);
    } catch (err) {
      console.error("[privy] idToken strategy failed:", err);
    }
  }

  // ── Strategy 2: access token (present after auto-refresh) ───────────
  const accessToken = cookieStore.get("privy-token")?.value;
  if (accessToken) {
    try {
      const claims = await privyClient.verifyAuthToken(accessToken);
      const privyId = claims.userId;

      // Check DB first — avoids hitting Privy for returning users
      const existing = await db.query.users.findFirst({
        where: eq(users.privyId, privyId),
      });
      if (existing) return existing;

      // First login via this path — need user details from Privy
      const privyUser = await privyClient.getUserById(privyId);
      const email = privyUser.email?.address ?? privyUser.google?.email ?? null;
      const name = privyUser.google?.name ?? null;
      return await findOrCreateUser(privyId, email, name);
    } catch (err) {
      console.error("[privy] accessToken strategy failed:", err);
    }
  }

  return null;
});
