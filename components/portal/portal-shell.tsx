"use client";

import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/portal";
import { PortalModalsProvider } from "@/components/portal/portal-modals";
import { UserMenu } from "@/components/portal/user-menu";
import { Button } from "@/components/ui/button";
import {
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/beneficiaries", label: "Beneficiaries", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  {
    href: "/admin",
    label: "Admin Management",
    icon: Shield,
    adminOnly: true,
  },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  user,
  onNavigate,
}: {
  user: PortalUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navigation.filter(
    (item) => !("adminOnly" in item && item.adminOnly) || user.role === "admin",
  );

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-accent font-medium text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-14 items-center gap-3 border-b px-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FileText className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold leading-none">
          Invoice Portal
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Internal finance
        </span>
      </span>
    </div>
  );
}

export function PortalShell({
  user,
  children,
}: {
  user: PortalUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navigation.find((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <Brand />
        <SidebarNav user={user} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-card shadow-lg">
            <Brand />
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
            <p className="truncate text-sm font-medium">
              {current?.label ?? "Internal Invoice Portal"}
            </p>
          </div>
          <UserMenu user={user} />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <PortalModalsProvider>{children}</PortalModalsProvider>
        </main>
      </div>
    </div>
  );
}
