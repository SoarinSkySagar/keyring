"use server";

import { db } from "@/db";
import { otpCodes, siweNonces, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hash } from "bcryptjs";
import { sendOTPEmail } from "@/lib/resend";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// ── Email OTP ───────────────────────────────────────────────────

/**
 * Login flow: just email — no password at this stage.
 * Signup flow: email + plaintext password → hash stored in OTP record.
 */
export async function sendOTPAction(
  email: string,
  password?: string // plaintext — only during signup
): Promise<{ success: boolean; error?: string }> {
  try {
    const isSignup = !!password;

    if (isSignup) {
      // Block signup if an account already exists for this email
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        };
      }
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Hash password server-side before storage (only for signup)
    const passwordHash = password ? await hash(password, 12) : null;

    // Remove any existing OTPs for this email
    await db.delete(otpCodes).where(eq(otpCodes.email, email));

    // Store OTP (+ passwordHash for signup)
    await db.insert(otpCodes).values({
      email,
      code,
      passwordHash,
      expiresAt,
    });

    await sendOTPEmail(email, code);

    return { success: true };
  } catch (err) {
    console.error("[sendOTPAction]", err);
    return { success: false, error: "Failed to send code. Please try again." };
  }
}

/**
 * Verify OTP.
 * For login: also pass password (verified against DB hash in auth.ts).
 * For signup: no password needed here (it was stored in the OTP record).
 * rememberMe: extends session to 30 days when true.
 */
export async function verifyOTPAction(
  email: string,
  otp: string,
  password?: string, // login only
  rememberMe?: boolean
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email,
      otp,
      password: password ?? "",
      remember: rememberMe ? "true" : "false",
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid code or password. Please try again." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error; // Re-throw NEXT_REDIRECT
  }
  return {};
}

// ── Google OAuth ─────────────────────────────────────────────────

export async function signInWithGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

// ── MetaMask / SIWE ───────────────────────────────────────────────

export async function getMetaMaskNonce(
  address: string
): Promise<{ nonce: string; error?: string }> {
  try {
    const normalized = address.toLowerCase();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await db
      .delete(siweNonces)
      .where(eq(siweNonces.address, normalized));

    await db.insert(siweNonces).values({ address: normalized, nonce, expiresAt });

    return { nonce };
  } catch (err) {
    console.error("[getMetaMaskNonce]", err);
    return { nonce: "", error: "Failed to generate nonce." };
  }
}

export async function signInWithMetaMaskAction(
  address: string,
  message: string,
  signature: string
): Promise<{ error?: string }> {
  try {
    await signIn("metamask", {
      address,
      message,
      signature,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Signature verification failed. Please try again." };
    }
    throw error;
  }
  return {};
}

// ── Sign out ──────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
