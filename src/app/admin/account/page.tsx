"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";

export default function AdminAccountPage() {
  const router = useRouter();
  const { adminUser, isAdminVerified, signOut } = usePortfolioDraft();
  const supabaseConfigured = isSupabaseConfigured();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setToast(null);

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
      setErrorMsg("Supabase Auth is not configured in this environment.");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setToast("Account password updated successfully.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/admin/login/");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Admin Account"
        description="Manage your authenticated administrator session, security status, and credentials."
        action={
          supabaseConfigured ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-[var(--radius-control)] border border-red-500/35 bg-red-500/10 px-4 py-2 text-small font-medium text-red-200 hover:bg-red-500/20"
            >
              Sign Out
            </button>
          ) : undefined
        }
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {errorMsg}
        </div>
      )}

      <FormSection
        title="Session & Access Status"
        description="Database writes are protected by PostgreSQL Row-Level Security and the administrator allowlist."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4">
            <p className="font-mono text-micro uppercase text-[var(--color-subtle)]">
              Signed-in Account
            </p>
            <p className="text-small font-medium text-[var(--color-text)] mt-1">
              {adminUser?.email ??
                (supabaseConfigured ? "Not signed in" : "Local Developer Session")}
            </p>
          </div>
          <div className="rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4">
            <p className="font-mono text-micro uppercase text-[var(--color-subtle)]">
              Permission Level
            </p>
            <p className="text-small font-medium text-[var(--color-live)] mt-1">
              {isAdminVerified
                ? "Verified Portfolio Administrator"
                : supabaseConfigured
                ? "Verification Required"
                : "Local Browser Draft Mode"}
            </p>
          </div>
        </div>
      </FormSection>

      {supabaseConfigured && (
        <FormSection
          title="Change Password"
          description="Update the password used for signing in to the Portfolio CMS."
        >
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <FormField label="New Password">
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </FormField>
            <FormField label="Confirm New Password">
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </FormField>
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update Password"}
            </button>
          </form>
        </FormSection>
      )}
    </div>
  );
}
