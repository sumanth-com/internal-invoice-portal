"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
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
  "h-12 rounded-xl border-transparent bg-[#f3f6fb] pl-11 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-[#5B2BD6] focus-visible:ring-[#5B2BD6] dark:border-white/10 dark:bg-[#121a30] dark:text-white dark:placeholder:text-slate-500";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
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
      <div className="mb-1 text-center">
        <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-white">Welcome Back</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Please sign in to your enterprise account</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 text-left">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Corporate ID or Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="treasury.officer@domain.corp"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
              className={cn(fieldClass, fieldErrors.email && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500")}
            />
          </div>
          {fieldErrors.email ? <p className="text-sm text-red-600">{fieldErrors.email}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password ? <p className="text-sm text-red-600">{fieldErrors.password}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            className="size-4 rounded border-slate-300 text-[#5B2BD6] focus:ring-[#5B2BD6]"
          />
          Remember this device
        </label>
        <Link href="/auth/forgot-password" className="text-sm font-medium text-[#5B2BD6] hover:text-[#4c22b8]">
          Forgot Password?
        </Link>
      </div>
      <Button
        type="submit"
        className="mt-1 h-12 w-full rounded-xl bg-[#5B2BD6] text-sm font-semibold tracking-[0.12em] text-white shadow-none hover:bg-[#4c22b8]"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {isLoading ? "SIGNING IN" : "SIGN IN"}
        {isLoading ? null : <ArrowRight className="size-4" />}
      </Button>
      <div className="mt-3 text-center">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Secure access</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Your workplace data is protected with enterprise-grade security.
        </p>
      </div>
    </form>
  );
}
