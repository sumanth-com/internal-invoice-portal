import { DashboardDateCard } from "@/components/portal/dashboard-date";
import { DashboardView } from "@/components/portal/dashboard-view";
import { StatCardsSkeleton } from "@/components/portal/skeletons";
import { loadDashboard } from "@/lib/dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Dashboard",
};

function DashboardFallback() {
  return (
    <>
      <StatCardsSkeleton count={4} />
      <div className="grid overflow-hidden rounded-[28px] lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="h-80 animate-pulse bg-muted" />
        <div className="h-80 animate-pulse bg-primary/30" />
      </div>
      <p className="sr-only" role="status">
        Loading invoices…
      </p>
    </>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;

  try {
    const data = await loadDashboard(query);
    return <DashboardView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invoices could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{message}</p>
      </section>
    );
  }
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <div className="flex w-full flex-col gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invoice activity for the portal.</p>
        </div>
        <DashboardDateCard />
      </div>
      <Suspense fallback={<DashboardFallback />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
