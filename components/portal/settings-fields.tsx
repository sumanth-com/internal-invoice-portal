"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const settingsTextareaClass =
  "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function useTimedFlag(source: unknown, ms = 2500) {
  const [visible, setVisible] = useState(false);
  const seen = useRef<unknown>(undefined);

  useEffect(() => {
    if (source == null || seen.current === source) return;
    seen.current = source;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(timer);
  }, [source, ms]);

  return visible;
}

export function SettingsSaved({
  show,
  children,
  className,
}: {
  show: boolean;
  children: string;
  className?: string;
}) {
  if (!show) return null;
  return (
    <p
      role="status"
      className={cn(
        "pointer-events-none absolute right-4 bottom-16 z-10 whitespace-nowrap rounded-md border border-emerald-600/20 bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm dark:text-emerald-200 sm:bottom-auto sm:right-6 sm:top-14",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SettingsSection({
  title,
  description,
  meta,
  className,
  children,
}: {
  title: string;
  description: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("relative flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-6", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {meta ? <div className="shrink-0 text-xs text-muted-foreground sm:pt-0.5 sm:text-right">{meta}</div> : null}
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function SettingsNotice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-600/20 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
      )}
    >
      {children}
    </p>
  );
}

export function SettingsField({
  id,
  label,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldProps(id: string, error?: string) {
  return {
    id,
    name: id,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}
