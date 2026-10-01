import { PortalBrand } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { PortalModalsProvider } from "@/components/portal/portal-modals";
import { CloseMobileNavOnNavigate, PortalNavProvider, PortalTopNav } from "@/components/portal/portal-shell";
import { getPortalUser } from "@/lib/portal-user";
import { Suspense } from "react";

function HeaderFallback() {
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <PortalBrand priority />
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

async function SignedInNav() {
  const user = await getPortalUser();
  if (!user?.isActive) return <HeaderFallback />;
  return (
    <PortalNavProvider>
      <CloseMobileNavOnNavigate />
      <PortalTopNav user={user} />
    </PortalNavProvider>
  );
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
    <div className="portal-shell flex h-dvh flex-col overflow-hidden bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SignedInNav />
      </Suspense>
      <main className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-muted/30 p-4 md:p-6">
        <PortalModalsProvider>{children}</PortalModalsProvider>
      </main>
      <Suspense fallback={null}>
        <PortalAccess />
      </Suspense>
    </div>
  );
}
