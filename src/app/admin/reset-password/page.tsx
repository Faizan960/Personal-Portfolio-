"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type RecoveryState =
  | "checking"
  | "ready"
  | "submitting"
  | "success"
  | "invalid"
  | "not-configured";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabaseConfigured = isSupabaseConfigured();

  const [state, setState] = useState<RecoveryState>(() =>
    supabaseConfigured ? "checking" : "not-configured",
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setState("not-configured");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setState("not-configured");
      return;
    }

    // Surface explicit Supabase error query/hash parameters (e.g. expired link)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const linkError =
        searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error");
      if (linkError) {
        setErrorMsg(linkError);
        setState("invalid");
        return;
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setState("ready");
        }
      },
    );

    // Also inspect current session in case token exchange completed on mount
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setErrorMsg(error.message);
          setState("invalid");
          return;
        }
        if (data.session) {
          setState("ready");
        } else {
          // Wait briefly for hash/PKCE recovery exchange before marking invalid
          setTimeout(() => {
            setState((prev) => (prev === "checking" ? "invalid" : prev));
          }, 1500);
        }
      })
      .catch(() => {
        setState("invalid");
      });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setState("not-configured");
      return;
    }

    setState("submitting");
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setErrorMsg(error.message);
        setState("ready");
        return;
      }
      setState("success");
      setTimeout(() => {
        router.replace("/admin/login/");
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to update password.",
      );
      setState("ready");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-base)] px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgb(157 198 216 / 0.045), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm">
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
              Reset Admin Password
            </h1>
            <p className="mt-1 text-small text-[var(--color-subtle)]">
              Choose a new password for your Portfolio CMS account
            </p>
          </div>
        </div>

        <div className="glass-2 glass-rim rounded-[var(--radius-card)] p-6 space-y-4">
          {state === "checking" && (
            <p className="py-4 text-center font-mono text-small text-[var(--color-subtle)]">
              Verifying password recovery link...
            </p>
          )}

          {state === "not-configured" && (
            <div className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4 text-small text-[var(--color-muted)]">
              Supabase is not configured in this environment. Password reset requires hosted Supabase Auth credentials.
            </div>
          )}

          {state === "invalid" && (
            <div className="space-y-4">
              <div
                role="alert"
                className="rounded-[var(--radius-control)] border border-red-500/30 bg-red-500/10 p-3.5 text-small text-red-200"
              >
                {errorMsg ||
                  "This password reset link is invalid or has expired. Please request a new reset email from the login page."}
              </div>
              <Link
                href="/admin/login/"
                className="block w-full rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2.5 text-center text-small font-medium text-[var(--color-void)] hover:opacity-90"
              >
                Return to Sign In
              </Link>
            </div>
          )}

          {state === "success" && (
            <div
              role="status"
              className="rounded-[var(--radius-control)] border border-[var(--color-live)]/35 bg-[var(--color-live)]/10 p-4 text-small text-[var(--color-live)]"
            >
              ✓ Password updated successfully! Redirecting to sign in...
            </div>
          )}

          {(state === "ready" || state === "submitting") && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-[var(--radius-control)] border border-red-500/30 bg-red-500/10 p-3 text-small text-red-200"
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="new-password"
                    className="block font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-subtle)]"
                  >
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="font-mono text-micro text-[var(--color-subtle)] hover:text-[var(--color-muted)]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={cn(
                    "w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3.5 py-2.5",
                    "text-small text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-subtle)]"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={cn(
                    "w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3.5 py-2.5",
                    "text-small text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "submitting" ? "Updating Password…" : "Update Password"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login/"
            className="text-small text-[var(--color-subtle)] hover:text-[var(--color-text)]"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
