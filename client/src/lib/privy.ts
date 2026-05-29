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

/** Returns the current user from our DB, creating on first login.
 *  Memoized per request via React cache() — safe to call in multiple server
 *  components and server actions within a single request. */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("privy-id-token")?.value;
  if (!idToken) return null;

  try {
    const privyUser = await privyClient.getUser({ idToken });
    const privyId = privyUser.id;

    // Fast path: already in DB
    let user = await db.query.users.findFirst({
      where: eq(users.privyId, privyId),
    });

    if (!user) {
      const email =
        privyUser.email?.address ??
        privyUser.google?.email ??
        null;
      const name = privyUser.google?.name ?? null;

      // Migration path: existing email-based account → link Privy ID
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
        }
      }

      // Fresh account
      if (!user) {
        [user] = await db
          .insert(users)
          .values({ privyId, email, name })
          .returning();
      }
    }

    return user;
  } catch {
    return null;
  }
});
