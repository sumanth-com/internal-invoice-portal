"use client";

import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/portal";
import { PortalLogo } from "@/components/brand-logo";
import { UserMenu } from "@/components/portal/user-menu";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  BarChart3,
  FileText,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/beneficiaries", label: "Beneficiaries", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: Banknote },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  {
    href: "/audit",
    label: "Audit Log",
    icon: ScrollText,
    adminOnly: true,
  },
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
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
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
      <PortalLogo size={32} priority />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-none">Invoice Portal</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">Internal finance</span>
      </span>
    </div>
  );
}

const NavContext = createContext<{
  mobileOpen: boolean;
  setMobileOpen: (open: boolean | ((value: boolean) => boolean)) => void;
} | null>(null);

export function PortalNavProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <NavContext.Provider value={{ mobileOpen, setMobileOpen }}>{children}</NavContext.Provider>;
}

export function CloseMobileNavOnNavigate() {
  const pathname = usePathname();
  const { setMobileOpen } = usePortalNav();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return null;
}

function usePortalNav() {
  const value = useContext(NavContext);
  if (!value) throw new Error("Portal navigation is unavailable.");
  return value;
}

export function DesktopSidebar({ user }: { user: PortalUser }) {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r bg-card lg:flex">
      <Brand />
      <SidebarNav user={user} />
    </aside>
  );
}

export function MobileDrawer({ user }: { user: PortalUser }) {
  const { mobileOpen, setMobileOpen } = usePortalNav();
  if (!mobileOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside className="relative flex h-full w-64 flex-col overflow-hidden bg-card shadow-lg">
        <Brand />
        <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
      </aside>
    </div>
  );
}

export function PortalHeader({ user }: { user: PortalUser }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = usePortalNav();
  const current = navigation.find((item) => isActive(pathname, item.href));

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
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
        <PortalLogo size={32} className="lg:hidden" />
        <p className="truncate text-sm font-medium">{current?.label ?? "Internal Invoice Portal"}</p>
      </div>
      <UserMenu user={user} />
    </header>
  );
}
