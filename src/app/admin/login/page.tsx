"use client";

/**
 * /admin/login
 * ─────────────────────────────────────────────────────────────────────────────
 * Login form for the admin CMS backed by Supabase Auth with allowlist verification.
 * Gracefully handles unconfigured environment states.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signInAdmin } from "@/lib/supabase/auth";
import { buildPasswordResetRedirectUrl } from "@/lib/supabase/resetUrl";

type FormState = "idle" | "submitting" | "not-configured" | "error" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const supabaseConfigured = isSupabaseConfigured();

  async function handleForgotPassword() {
    setServerError(null);
    setResetMessage(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Enter your administrator email first to receive a reset link." });
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setState("not-configured");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildPasswordResetRedirectUrl(),
    });
    if (error) {
      setState("error");
      setServerError(error.message);
    } else {
      setResetMessage("If this email belongs to an account, a password reset link has been sent.");
    }
  }

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (!supabaseConfigured) {
      setState("not-configured");
      return;
    }

    setState("submitting");
    try {
      const result = await signInAdmin(email, password);
      if (result.isAdmin && result.user) {
        setState("success");
        router.push("/admin/dashboard");
      } else {
        setState("error");
        setServerError(result.error || "Authentication failed.");
      }
    } catch (err) {
      setState("error");
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-base)] px-4">
      {/* Subtle ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgb(157 198 216 / 0.045), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-10 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--color-accent)] text-[var(--color-void)]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-h4 font-medium text-[var(--color-text)]">
              Portfolio CMS
            </h1>
            <p className="mt-1 text-small text-[var(--color-subtle)]">
              Sign in to your admin workspace
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="glass-2 glass-rim rounded-[var(--radius-card)] p-6">
          {/* Not-configured notice */}
          {state === "not-configured" && (
            <div
              role="alert"
              className={cn(
                "mb-5 rounded-[var(--radius-control)] border border-[var(--hairline)] p-4",
                "bg-[var(--color-surface-2)]",
              )}
            >
              <p className="text-small font-medium text-[var(--color-accent-warm)]">
                Supabase credentials not configured
              </p>
              <p className="mt-1 text-small text-[var(--color-muted)]">
                Add your Supabase project URL and publishable key to{" "}
                <code className="font-mono text-micro text-[var(--color-accent)]">.env.local</code>{" "}
                to connect authentication.
              </p>
              <button
                type="button"
                onClick={() => setState("idle")}
                className="mt-3 text-small text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-text)]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Auth error notice */}
          {state === "error" && serverError && (
            <div
              role="alert"
              className="mb-5 rounded-[var(--radius-control)] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4"
            >
              <p className="text-small font-medium text-red-400">
                Sign-in failed
              </p>
              <p className="mt-1 text-small text-[var(--color-muted)]">
                {serverError}
              </p>
              <button
                type="button"
                onClick={() => setState("idle")}
                className="mt-3 text-small text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-text)]"
              >
                Dismiss
              </button>
            </div>
          )}

          {resetMessage && (
            <div
              role="status"
              className="mb-5 rounded-[var(--radius-control)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 p-4 text-small text-[var(--color-live)]"
            >
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-small font-medium text-[var(--color-muted)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="admin@example.com"
                className={cn(
                  "w-full rounded-[var(--radius-control)] border bg-[var(--color-surface-2)] px-3.5 py-2.5",
                  "text-small text-[var(--color-text)] placeholder:text-[var(--color-faint)]",
                  "transition-colors duration-[var(--dur-fast)]",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                  errors.email
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-[var(--hairline)] focus:border-[var(--color-accent)]",
                )}
              />
              {errors.email && (
                <p className="mt-1 text-micro text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-small font-medium text-[var(--color-muted)]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="font-mono text-micro text-[var(--color-subtle)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={cn(
                  "w-full rounded-[var(--radius-control)] border bg-[var(--color-surface-2)] px-3.5 py-2.5",
                  "text-small text-[var(--color-text)]",
                  "transition-colors duration-[var(--dur-fast)]",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                  errors.password
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-[var(--hairline)] focus:border-[var(--color-accent)]",
                )}
              />
              {errors.password && (
                <p className="mt-1 text-micro text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={state === "submitting"}
              className={cn(
                "w-full rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2.5",
                "text-small font-medium text-[var(--color-void)]",
                "transition-opacity duration-[var(--dur-fast)]",
                "hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {state === "submitting" ? "Signing in…" : "Sign In"}
            </button>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-micro text-[var(--color-subtle)] hover:text-[var(--color-accent)]"
              >
                Forgot password?
              </button>
            </div>
          </form>

          {/* Local development bypass shown ONLY when Supabase env vars are not configured */}
          {!supabaseConfigured && (
            <div className="mt-5 border-t border-[var(--hairline)] pt-4 text-center">
              <Link
                href="/admin/dashboard"
                className="text-micro font-medium text-[var(--color-subtle)] hover:text-[var(--color-text)] transition-colors"
              >
                Continue to Dashboard (Local Draft Mode) →
              </Link>
            </div>
          )}
        </div>

        {/* Back to public site */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-small text-[var(--color-subtle)] hover:text-[var(--color-text)]"
          >
            ← Back to portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
