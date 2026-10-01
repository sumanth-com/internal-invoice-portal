"use client";

import { AuthSuccess } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(nextEmail, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setIsLoading(false);
    if (resetError && !/user not found|not registered/i.test(resetError.message)) {
      setError("The reset email could not be sent. Try again in a moment.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="grid gap-6">
        <AuthSuccess
          title="Check your email"
          detail="If an account exists for that address, a reset link is on its way."
        />
        <Link href="/auth/login" className="text-center text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email. We will send a link to choose a new password.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/auth/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
