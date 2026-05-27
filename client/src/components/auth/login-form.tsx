"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  sendOTPAction,
  verifyOTPAction,
  signInWithGoogleAction,
  getMetaMaskNonce,
  signInWithMetaMaskAction,
} from "@/actions/auth";
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

// ── Icons ─────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 318 318" fill="none" aria-hidden>
      <path d="M274.1 35.5L174.7 109.5L193 65.5L274.1 35.5Z" fill="#E17726" />
      <path d="M44.4 35.5L143 110.2L125.5 65.5L44.4 35.5Z" fill="#E27625" />
      <path d="M238.3 206.8L211.7 247.4L268.5 263.1L284.9 207.7L238.3 206.8Z" fill="#E27625" />
      <path d="M33.9 207.7L50.2 263.1L107 247.4L80.4 206.8L33.9 207.7Z" fill="#E27625" />
      <path d="M103.6 138.2L87.8 162.1L144.2 164.6L142.1 103.9L103.6 138.2Z" fill="#E27625" />
      <path d="M214.9 138.2L175.9 103.2L174.7 164.6L231 162.1L214.9 138.2Z" fill="#E27625" />
      <path d="M107 247.4L140.6 230.9L111.4 208.1L107 247.4Z" fill="#E27625" />
      <path d="M178 230.9L211.7 247.4L207.1 208.1L178 230.9Z" fill="#E27625" />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#3B99FC" />
      <path
        d="M9.6 12.8c3.5-3.5 9.3-3.5 12.8 0l.4.4c.2.2.2.5 0 .7l-1.4 1.4c-.1.1-.3.1-.4 0l-.6-.6c-2.5-2.5-6.5-2.5-9 0l-.6.6c-.1.1-.3.1-.4 0L8.8 13.9c-.2-.2-.2-.5 0-.7l.8-.4zm15.8 2.9l1.2 1.2c.2.2.2.5 0 .7l-5.6 5.6c-.2.2-.5.2-.7 0l-3.9-3.9c-.1-.1-.2-.1-.4 0l-3.9 3.9c-.2.2-.5.2-.7 0L5.4 17.6c-.2-.2-.2-.5 0-.7l1.2-1.2c.2-.2.5-.2.7 0l3.9 3.9c.1.1.2.1.4 0l3.9-3.9c.2-.2.5-.2.7 0l3.9 3.9c.1.1.2.1.4 0l3.9-3.9c.2-.2.5-.2.7 0z"
        fill="white"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMetaMaskPending, setIsMetaMaskPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: send OTP
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendOTPAction(email);
      if (result.success) {
        setStep("verify");
        toast.success("Code sent — check your inbox.");
      } else {
        setError(result.error ?? "Failed to send code.");
      }
    });
  };

  // Step 2: verify OTP + password
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyOTPAction(email, otp, password, rememberMe);
      if (result.error) setError(result.error);
    });
  };

  // MetaMask SIWE
  const handleMetaMask = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast.error("MetaMask not detected. Please install it.");
      return;
    }
    setIsMetaMaskPending(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];

      const { nonce, error: nonceErr } = await getMetaMaskNonce(address);
      if (nonceErr || !nonce) {
        setError("Failed to get nonce. Please try again.");
        return;
      }

      const message = [
        "Sign in to Keyring",
        "",
        `Address: ${address}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
        `Chain: Aeneid Testnet`,
      ].join("\n");

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      })) as string;

      const result = await signInWithMetaMaskAction(address, message, signature);
      if (result.error) setError(result.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rejected") || msg.includes("denied")) {
        toast.info("Signature cancelled.");
      } else {
        setError("MetaMask sign-in failed. Please try again.");
      }
    } finally {
      setIsMetaMaskPending(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.8} />
          </div>
          <h1
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {step === "email" ? "Sign in" : "Enter your code"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your email to receive a sign-in code."
              : `Code sent to ${email}. Enter it along with your password.`}
          </p>
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
                  className="pl-9 h-11 bg-background border-border focus-visible:ring-primary/50"
                />
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors group-hover:border-primary/60" />
                <svg
                  className="absolute inset-0 w-4 h-4 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                  viewBox="0 0 16 16" fill="none"
                >
                  <path d="M3.5 8L6.5 11L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Remember me for 30 days
              </span>
            </label>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Send code <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>
        )}

        {/* Step 2 — OTP + Password */}
        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            {/* OTP */}
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

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <Button
              type="submit"
              disabled={isPending || otp.length !== 6 || !password}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>

            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setPassword(""); setError(null); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {/* OAuth / Web3 buttons */}
        <div className="space-y-3">
          {/* Google */}
          <Button
            type="button"
            variant="outline"
            disabled={!googleEnabled || isPending || isMetaMaskPending}
            onClick={() => googleEnabled && startTransition(() => signInWithGoogleAction())}
            className="w-full h-11 border-border hover:bg-accent text-foreground font-medium disabled:opacity-50"
          >
            <GoogleIcon />
            <span className="ml-2">Continue with Google</span>
            {!googleEnabled && (
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Not configured
              </span>
            )}
          </Button>

          {/* MetaMask */}
          <Button
            type="button"
            variant="outline"
            disabled={isMetaMaskPending || isPending}
            onClick={handleMetaMask}
            className="w-full h-11 border-border hover:bg-accent text-foreground font-medium disabled:opacity-50"
          >
            {isMetaMaskPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MetaMaskIcon />
            )}
            <span className="ml-2">
              {isMetaMaskPending ? "Waiting for MetaMask…" : "Sign in with MetaMask"}
            </span>
          </Button>

          {/* WalletConnect — coming soon */}
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full h-11 border-border text-foreground font-medium opacity-50 cursor-not-allowed"
          >
            <WalletConnectIcon />
            <span className="ml-2">WalletConnect</span>
            <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          </Button>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </a>
      </p>
    </div>
  );
}
