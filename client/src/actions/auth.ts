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

// ── Password reset ────────────────────────────────────────────────

/**
 * Step 1: send OTP for password reset.
 * Only works for email/password accounts (not Google/MetaMask).
 * Always returns success=true for non-existent emails (prevents enumeration).
 */
export async function sendPasswordResetOTPAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existing) {
      // Silently succeed to prevent email enumeration
      return { success: true };
    }
    if (!existing.passwordHash) {
      return {
        success: false,
        error: "This account uses Google or MetaMask sign-in — there is no password to reset.",
      };
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.delete(otpCodes).where(eq(otpCodes.email, email));
    await db.insert(otpCodes).values({ email, code, expiresAt });
    await sendOTPEmail(email, code);

    return { success: true };
  } catch (err) {
    console.error("[sendPasswordResetOTPAction]", err);
    return { success: false, error: "Failed to send code. Please try again." };
  }
}

/**
 * Step 2: verify OTP without consuming it.
 * Lets the UI confirm the code is correct before showing the new-password form.
 */
export async function verifyResetOTPAction(
  email: string,
  otp: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const stored = await db.query.otpCodes.findFirst({
      where: and(eq(otpCodes.email, email), gt(otpCodes.expiresAt, new Date())),
    });
    if (!stored || stored.code !== otp) {
      return { ok: false, error: "Invalid or expired code." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[verifyResetOTPAction]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Step 3: consume OTP, update password hash, auto sign-in.
 */
export async function resetPasswordAction(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    // Final OTP check
    const stored = await db.query.otpCodes.findFirst({
      where: and(eq(otpCodes.email, email), gt(otpCodes.expiresAt, new Date())),
    });
    if (!stored || stored.code !== otp) {
      return { error: "Code expired. Please start over." };
    }

    // Consume OTP
    await db.delete(otpCodes).where(eq(otpCodes.id, stored.id));

    // Update password
    const passwordHash = await hash(newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.email, email));

    // Auto sign-in: issue a fresh short-lived OTP and sign in immediately
    const tempCode = generateOTP();
    await db.insert(otpCodes).values({
      email,
      code: tempCode,
      passwordHash: null,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min
    });

    await signIn("credentials", {
      email,
      otp: tempCode,
      password: newPassword,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Sign-in after reset failed. Please log in with your new password." };
    }
    throw error; // Re-throw NEXT_REDIRECT
  }
  return {};
}

// ── Sign out ──────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
