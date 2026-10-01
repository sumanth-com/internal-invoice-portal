"use client";

import { PASSWORD_RULES } from "@/lib/auth-password";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string | null;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-10 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  confirmError,
}: {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  confirmError?: string | null;
}) {
  return (
    <div className="grid gap-4">
      <Field
        id="password"
        label="Password"
        value={password}
        onChange={onPassword}
        autoComplete="new-password"
      />
      <ul className="grid gap-1.5 text-sm">
        {PASSWORD_RULES.map((rule) => {
          const met = password.length > 0 && rule.test(password);
          return (
            <li key={rule.id} className={cn("text-muted-foreground", met && "text-emerald-700 dark:text-emerald-300")}>
              {met ? "✓" : "•"} {rule.label}
            </li>
          );
        })}
      </ul>
      <Field
        id="confirm-password"
        label="Confirm password"
        value={confirm}
        onChange={onConfirm}
        autoComplete="new-password"
        error={confirmError}
      />
    </div>
  );
}
