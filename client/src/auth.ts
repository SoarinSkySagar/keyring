import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and, gt } from "drizzle-orm";
import { compare } from "bcryptjs";
import { verifyMessage } from "viem";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  otpCodes,
  siweNonces,
} from "@/db/schema";
import authConfig from "./auth.config";

const providers: Provider[] = [
  // ── Email OTP + Password ──────────────────────────────────────
  Credentials({
    id: "credentials",
    credentials: {
      email: { type: "email" },
      otp: { type: "text" },
      password: { type: "password" }, // required for login; absent for signup (stored in OTP record)
      remember: { type: "text" },     // "true" | "false"
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const otp = credentials?.otp as string | undefined;
      const password = credentials?.password as string | undefined;
      const remember = credentials?.remember === "true";

      if (!email || !otp) return null;

      // 1. Verify OTP
      const stored = await db.query.otpCodes.findFirst({
        where: and(
          eq(otpCodes.email, email),
          gt(otpCodes.expiresAt, new Date())
        ),
      });
      if (!stored || stored.code !== otp) return null;

      // 2. Single-use: delete immediately
      await db.delete(otpCodes).where(eq(otpCodes.id, stored.id));

      // 3. Find existing user
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        // ── Login path: verify password ──
        if (!existingUser.passwordHash) {
          // Account was created via Google/MetaMask — no password auth allowed
          return null;
        }
        if (!password) return null;
        const valid = await compare(password, existingUser.passwordHash);
        if (!valid) return null;
        return { ...existingUser, remember };
      }

      // ── Signup path: password hash stored in OTP record ──
      if (!stored.passwordHash) return null;

      const [created] = await db
        .insert(users)
        .values({
          email,
          emailVerified: new Date(),
          passwordHash: stored.passwordHash,
        })
        .returning();

      // Record auth method
      await db.insert(accounts).values({
        userId: created.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: email,
      });

      return { ...created, remember };
    },
  }),

  // ── MetaMask / SIWE ───────────────────────────────────────────
  Credentials({
    id: "metamask",
    credentials: {
      address: { type: "text" },
      message: { type: "text" },
      signature: { type: "text" },
    },
    async authorize(credentials) {
      const address = credentials?.address as string | undefined;
      const message = credentials?.message as string | undefined;
      const signature = credentials?.signature as string | undefined;

      if (!address || !message || !signature) return null;

      // 1. Verify signature on-chain style
      try {
        const valid = await verifyMessage({
          address: address as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        });
        if (!valid) return null;
      } catch {
        return null;
      }

      // 2. Verify nonce (prevents replay attacks)
      const normalizedAddress = address.toLowerCase();
      const nonceRecord = await db.query.siweNonces.findFirst({
        where: and(
          eq(siweNonces.address, normalizedAddress),
          gt(siweNonces.expiresAt, new Date())
        ),
      });
      if (!nonceRecord || !message.includes(nonceRecord.nonce)) return null;

      // 3. Single-use nonce
      await db.delete(siweNonces).where(eq(siweNonces.id, nonceRecord.id));

      // 4. Find user by linked account
      const linkedAccount = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.provider, "metamask"),
          eq(accounts.providerAccountId, normalizedAddress)
        ),
      });

      if (linkedAccount) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, linkedAccount.userId),
        });
        return user ?? null;
      }

      // 5. New MetaMask user — create account (no email, no password)
      const [created] = await db
        .insert(users)
        .values({ emailVerified: new Date() })
        .returning();

      await db.insert(accounts).values({
        userId: created.id,
        type: "credentials",
        provider: "metamask",
        providerAccountId: normalizedAddress,
      });

      return created;
    },
  }),
];

// Google OAuth
const { default: Google } = await import("next-auth/providers/google");
providers.push(
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    allowDangerousEmailAccountLinking: true,
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // 1 day default; 30 days when "remember me"
  providers,
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // Extend session to 30 days when "remember me" is checked; default is 1 day
        if ((user as { remember?: boolean }).remember) {
          token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        }
      }
      // Capture provider + wallet address on first sign-in (account is only present then)
      if (account) {
        token.provider = account.provider; // "credentials" | "google" | "metamask"
        if (account.provider === "metamask") {
          token.walletAddress = account.providerAccountId; // lowercase hex address
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.provider) session.user.provider = token.provider as string;
      if (token.walletAddress) session.user.walletAddress = token.walletAddress as string;
      return session;
    },
  },
});
