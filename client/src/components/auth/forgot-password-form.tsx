"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendPasswordResetOTPAction,
  verifyResetOTPAction,
  resetPasswordAction,
} from "@/actions/auth";
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Step = "email" | "otp" | "password";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  // Step 1 — send OTP to email
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendPasswordResetOTPAction(email);
      if (result.success) {
        setStep("otp");
        toast.success("Code sent — check your inbox.");
      } else {
        setError(result.error ?? "Failed to send code.");
      }
    });
  };

  // Step 2 — verify OTP (non-consuming check)
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyResetOTPAction(email, otp);
      if (result.ok) {
        setStep("password");
      } else {
        setError(result.error ?? "Invalid code.");
      }
    });
  };

  // Step 3 — set new password + auto sign-in
  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid) { setError("Password must be at least 8 characters."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    startTransition(async () => {
      const result = await resetPasswordAction(email, otp, password);
      if (result.error) setError(result.error);
    });
  };

  const stepTitle: Record<Step, string> = {
    email: "Forgot password?",
    otp: "Check your email",
    password: "Set new password",
  };

  const stepDesc: Record<Step, string> = {
    email: "Enter your email and we'll send you a reset code.",
    otp: `Enter the 6-digit code we sent to ${email}.`,
    password: "Choose a strong password for your account.",
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            {step === "password" ? (
              <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.8} />
            ) : (
              <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.8} />
            )}
          </div>
          <h1
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {stepTitle[step]}
          </h1>
          <p className="text-sm text-muted-foreground">{stepDesc[step]}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["email", "otp", "password"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s
                  ? "w-6 bg-primary"
                  : i < ["email", "otp", "password"].indexOf(step)
                  ? "w-3 bg-primary/50"
                  : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step 1 — Email */}
        {step === "email" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="pl-9 h-11 bg-background border-border focus-visible:ring-primary/50"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Send reset code <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>
        )}

        {/* Step 2 — OTP */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                6-digit code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="h-11 text-center text-xl font-mono tracking-[0.4em] bg-background border-border focus-visible:ring-primary/50"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || otp.length !== 6}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Verify code <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(null); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* Step 3 — New password */}
        {step === "password" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  className="pl-9 pr-10 h-11 bg-background border-border focus-visible:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`pl-9 pr-10 h-11 bg-background border-border focus-visible:ring-primary/50 ${
                    confirmPassword && !passwordsMatch
                      ? "border-destructive focus-visible:ring-destructive/50"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending || !passwordValid || !passwordsMatch || !confirmPassword}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Reset password <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember it?{" "}
        <a href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </a>
      </p>
    </div>
  );
}
