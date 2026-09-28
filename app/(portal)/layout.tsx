import { LogoutButton } from "@/components/logout-button";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPortalUser } from "@/lib/portal-user";
import { Suspense } from "react";

function PortalFallback() {
  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <span className="size-8 rounded-md bg-primary" />
          <span className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-2 px-3 py-4">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="h-9 animate-pulse rounded-md bg-muted/70" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <span className="h-4 w-24 animate-pulse rounded bg-muted" />
          <span className="size-8 animate-pulse rounded-full bg-muted" />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <span className="block h-7 w-48 animate-pulse rounded bg-muted" />
            <span className="mt-3 block h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <p className="sr-only" role="status">
            Loading…
          </p>
        </main>
      </div>
    </div>
  );
}

async function AuthenticatedPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPortalUser();

  if (!user || !user.isActive) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
        <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Access unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? "This account is inactive. Contact an administrator."
              : "No profile was found for this account."}
          </p>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </section>
      </main>
    );
  }

  return <PortalShell user={user}>{children}</PortalShell>;
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PortalFallback />}>
      <AuthenticatedPortal>{children}</AuthenticatedPortal>
    </Suspense>
  );
}
