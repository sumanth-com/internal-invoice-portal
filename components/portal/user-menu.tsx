"use client";

import { createClient } from "@/lib/supabase/client";
import { displayName, roleLabel, userInitials, type PortalUser } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Loader2, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function UserMenu({ user }: { user: PortalUser }) {
  const router = useRouter();
  const name = displayName(user);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setPending(false);
      setError("Sign out could not be completed. Try again.");
      return;
    }
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="relative size-9 overflow-hidden rounded-full p-0 text-xs font-medium text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground focus-visible:text-primary-foreground data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
            aria-label="Account menu"
          >
            {user.avatarUrl ? (
              <span
                aria-hidden
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(user.avatarUrl)})` }}
              />
            ) : (
              <span className="text-primary-foreground">{userInitials(user)}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="px-2 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound />
              Profile ({roleLabel(user.role)})
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <p className="px-1 text-xs font-medium text-muted-foreground">Theme</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {themes.map((item) => {
                const Icon = item.icon;
                const selected = mounted && theme === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTheme(item.value)}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                      selected ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirming ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setConfirming(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg"
          >
            <h2 id={titleId} className="text-base font-semibold">
              Are you sure you want to sign out?
            </h2>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={() => void signOut()}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {pending ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
