"use client";

import { PortalLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function emailError(value: string) {
  const email = value.trim();
  if (!email) return "Enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

const fieldClass =
  "h-11 rounded-lg border-neutral-200 bg-white px-3.5 text-neutral-950 shadow-none placeholder:text-neutral-400 focus-visible:border-[hsl(262,83%,58%)] focus-visible:ring-[hsl(262,83%,58%)] dark:border-[hsl(220,28%,22%)] dark:bg-[hsl(223,46%,11%)] dark:text-white dark:placeholder:text-[hsl(217,16%,62%)]";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextEmailError = emailError(email);
    const nextPasswordError = password ? null : "Enter your password.";
    setFieldErrors({
      email: nextEmailError ?? undefined,
      password: nextPasswordError ?? undefined,
    });
    if (nextEmailError || nextPasswordError) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      const message = /not confirmed|not verified/i.test(signInError.message)
        ? "Activate your account from the invitation email before signing in."
        : "Email or password is incorrect.";
      setError(message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="grid gap-4" noValidate>
      <div className="mb-3 text-center">
        <div className="flex justify-center">
          <PortalLogo size={44} priority />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-[hsl(217,18%,70%)]">Sign in to your account</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 text-left">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-neutral-800 dark:text-[hsl(210,20%,92%)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            className={cn(fieldClass, fieldErrors.email && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500")}
          />
          {fieldErrors.email ? <p className="text-sm text-red-600">{fieldErrors.email}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm font-medium text-neutral-800 dark:text-[hsl(210,20%,92%)]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
              className={cn(
                fieldClass,
                "pr-11",
                fieldErrors.password && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500",
              )}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password ? <p className="text-sm text-red-600">{fieldErrors.password}</p> : null}
          <div className="flex justify-end pt-1">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-neutral-900 hover:text-neutral-600 dark:text-[hsl(210,20%,92%)] dark:hover:text-white">
              Forgot password
            </Link>
          </div>
        </div>
      </div>
      <Button
        type="submit"
        className="mt-1 h-11 w-full rounded-lg bg-[hsl(262,83%,58%)] text-white shadow-none hover:bg-[hsl(262,83%,52%)]"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
