"use client";

import { PortalBrand } from "@/components/brand-logo";
import { UserMenu } from "@/components/portal/user-menu";
import { Button } from "@/components/ui/button";
import type { PortalUser } from "@/lib/portal";
import { cn } from "@/lib/utils";
import {
  Banknote,
  BarChart3,
  FileText,
  Bell,
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
import { createContext, useContext, useEffect, useState, type ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/beneficiaries", label: "Beneficiaries", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: Banknote },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const moreNav: NavItem[] = [
  { href: "/audit", label: "Audit Log", icon: ScrollText, adminOnly: true },
  { href: "/admin", label: "Admin Management", icon: Shield, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function allowed(items: NavItem[], user: PortalUser) {
  return items.filter((item) => !item.adminOnly || user.role === "admin");
}

function pillLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
    active
      ? "bg-primary font-medium text-white"
      : "text-zinc-300 hover:bg-white/10 hover:text-white",
  );
}

function mobileLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors duration-150",
    active
      ? "bg-primary font-medium text-white"
      : "text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:text-white",
  );
}

const headerIconClass =
  "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors duration-150";

const headerIconHover =
  "hover:bg-accent dark:hover:border-[hsl(262,40%,42%)] dark:hover:text-white";

function headerIconState(active: boolean) {
  return cn(
    headerIconClass,
    active
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
      : headerIconHover,
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

function usePortalNav() {
  const value = useContext(NavContext);
  if (!value) throw new Error("Portal navigation is unavailable.");
  return value;
}

export function CloseMobileNavOnNavigate() {
  const pathname = usePathname();
  const { setMobileOpen } = usePortalNav();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return null;
}

function Brand() {
  return (
    <Link href="/dashboard" aria-label="Invoice Portal" className="flex shrink-0 items-center">
      <PortalBrand priority />
    </Link>
  );
}

function HeaderIconLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={headerIconState(active)}
    >
      <Icon className="size-4" />
    </Link>
  );
}

function NotificationsLink({ pathname }: { pathname: string }) {
  const active = isActive(pathname, "/notifications");
  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      aria-current={active ? "page" : undefined}
      className={headerIconState(active)}
    >
      <Bell className="size-4" />
    </Link>
  );
}

export function PortalTopNav({ user }: { user: PortalUser }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = usePortalNav();
  const primary = allowed(primaryNav, user);
  const more = allowed(moreNav, user);
  const canOpenSettings = user.role === "admin";
  const settingsActive = isActive(pathname, "/settings");

  return (
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="relative flex h-[72px] items-center px-4 md:px-6">
        <Brand />
        <div className="pointer-events-none absolute inset-x-0 hidden justify-center xl:flex">
          <nav
            className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-neutral-900 p-1 shadow-sm dark:bg-[hsl(223,42%,14%)] dark:shadow-[0_0_0_1px_hsl(220_28%_24%)]"
            aria-label="Portal"
          >
            {primary.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={pillLinkClass(active)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationsLink pathname={pathname} />
          {more.map((item) => (
            <HeaderIconLink key={item.href} item={item} pathname={pathname} />
          ))}
          {canOpenSettings ? (
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={settingsActive ? "page" : undefined}
              className={headerIconState(settingsActive)}
            >
              <Settings className="size-4" />
            </Link>
          ) : null}
          <UserMenu user={user} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(headerIconClass, headerIconHover, "xl:hidden")}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>
      {mobileOpen ? (
        <nav className="border-t bg-card px-3 py-3 xl:hidden" aria-label="Portal">
          <div className="flex flex-col gap-1">
            <Link
              href="/notifications"
              aria-current={isActive(pathname, "/notifications") ? "page" : undefined}
              className={mobileLinkClass(isActive(pathname, "/notifications"))}
              onClick={() => setMobileOpen(false)}
            >
              <Bell className="size-4" />
              Notifications
            </Link>
            {[...primary, ...more].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={mobileLinkClass(active)}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
            {canOpenSettings ? (
              <Link
                href="/settings"
                aria-current={settingsActive ? "page" : undefined}
                className={mobileLinkClass(settingsActive)}
                onClick={() => setMobileOpen(false)}
              >
                <Settings className="size-4" />
                Settings
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
