"use client";

import { saveAccountPassword } from "@/app/auth/actions";
import { AuthSuccess } from "@/components/auth/auth-screen";
import { PasswordFields } from "@/components/auth/password-fields";
import { Button } from "@/components/ui/button";
import { passwordIsValid } from "@/lib/auth-password";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SetPasswordForm({
  mode,
  name,
  email,
  roleLabel,
}: {
  mode: "activate" | "reset";
  name?: string | null;
  email?: string | null;
  roleLabel?: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      if (mode === "reset") {
        const supabase = createClient();
        void supabase.auth.signOut().finally(() => {
          router.push("/auth/login");
          router.refresh();
        });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [done, mode, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordIsValid(password)) {
      setConfirmError(null);
      setError("Use at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }
    if (password !== confirm) {
      setError(null);
      setConfirmError("Passwords do not match.");
      return;
    }
    setConfirmError(null);
    setError(null);
    setIsLoading(true);
    const result = await saveAccountPassword(password);
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthSuccess
        title={mode === "activate" ? "Account activated" : "Password updated"}
        detail={mode === "activate" ? "Taking you to the dashboard." : "Taking you to sign in."}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "activate" ? "Activate your account" : "Choose a new password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "activate"
            ? "Create a password to finish setting up your account. Your access is already assigned."
            : "Enter a new password for your Internal Invoice Portal account."}
        </p>
      </div>
      {mode === "activate" ? (
        <dl className="grid gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium">{name?.trim() || "—"}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all text-right font-medium">{email || "—"}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Access</dt>
            <dd className="text-right font-medium">{roleLabel || "Team Member"}</dd>
          </div>
        </dl>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <PasswordFields
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={(value) => {
          setConfirm(value);
          setConfirmError(null);
        }}
        confirmError={confirmError}
      />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {isLoading ? "Saving…" : mode === "activate" ? "Activate account" : "Update password"}
      </Button>
    </form>
  );
}
