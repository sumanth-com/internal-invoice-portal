import { DashboardActions, DashboardView } from "@/components/portal/dashboard-view";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { loadDashboard } from "@/lib/dashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Dashboard",
};

function DashboardFallback() {
  return (
    <>
      <StatCardsSkeleton count={4} />
      <TableSkeleton label="Loading invoices…" />
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Invoice activity for the portal."
        actions={<DashboardActions />}
      />
      <Suspense fallback={<DashboardFallback />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
