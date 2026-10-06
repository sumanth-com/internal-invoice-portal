import { PortalLogo, PortalMark } from "@/components/brand-logo";

export function AuthScreen({
  children,
  logo = "above",
}: {
  children: React.ReactNode;
  logo?: "above" | "inside";
}) {
  if (logo === "inside") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8 sm:py-10">
        <section className="w-full max-w-md rounded-xl border bg-card px-6 py-7 shadow-sm sm:px-8">
          <div className="mb-6">
            <PortalMark size={44} priority />
          </div>
          {children}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <PortalLogo size={56} priority />
        </div>
        <section className="rounded-xl border bg-card px-6 py-7 shadow-sm sm:px-8">{children}</section>
      </div>
    </main>
  );
}

export function AuthSuccess({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 animate-in fade-in zoom-in-95 duration-300 dark:text-emerald-300">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
