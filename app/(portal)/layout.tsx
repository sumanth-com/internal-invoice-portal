import { PortalLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { PortalModalsProvider } from "@/components/portal/portal-modals";
import {
  CloseMobileNavOnNavigate,
  DesktopSidebar,
  MobileDrawer,
  PortalHeader,
  PortalNavProvider,
} from "@/components/portal/portal-shell";
import { getPortalUser } from "@/lib/portal-user";
import { Suspense } from "react";

function DesktopAsideFallback() {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r bg-card lg:flex">
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <PortalLogo size={32} priority />
        <span className="h-4 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-2 px-3 py-4">
        {[0, 1, 2, 3].map((item) => (
          <span key={item} className="h-9 animate-pulse rounded-md bg-muted/70" />
        ))}
      </div>
    </aside>
  );
}

function HeaderFallback() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
      <span className="flex items-center gap-3">
        <PortalLogo size={32} className="lg:hidden" />
        <span className="h-4 w-24 animate-pulse rounded bg-muted" />
      </span>
      <span className="size-8 animate-pulse rounded-full bg-muted" />
    </header>
  );
}

function AccessUnavailable({ inactive }: { inactive: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Access unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {inactive
            ? "This account is inactive. Contact an administrator."
            : "No profile was found for this account."}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}

async function SignedInSidebar() {
  const user = await getPortalUser();
  if (!user?.isActive) return null;
  return <DesktopSidebar user={user} />;
}

async function SignedInDrawer() {
  const user = await getPortalUser();
  if (!user?.isActive) return null;
  return <MobileDrawer user={user} />;
}

async function SignedInHeader() {
  const user = await getPortalUser();
  if (!user?.isActive) return <HeaderFallback />;
  return <PortalHeader user={user} />;
}

async function PortalAccess() {
  const user = await getPortalUser();
  if (user?.isActive) return null;
  return <AccessUnavailable inactive={Boolean(user)} />;
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalNavProvider>
      <Suspense fallback={null}>
        <CloseMobileNavOnNavigate />
      </Suspense>
      <div className="flex h-dvh overflow-hidden bg-muted/40">
        <Suspense fallback={<DesktopAsideFallback />}>
          <SignedInSidebar />
        </Suspense>
        <Suspense fallback={null}>
          <SignedInDrawer />
        </Suspense>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Suspense fallback={<HeaderFallback />}>
            <SignedInHeader />
          </Suspense>
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 md:p-6">
            <PortalModalsProvider>{children}</PortalModalsProvider>
          </main>
        </div>
        <Suspense fallback={null}>
          <PortalAccess />
        </Suspense>
      </div>
    </PortalNavProvider>
  );
}
