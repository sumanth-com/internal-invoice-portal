import { ReportsView } from "@/components/portal/reports-view";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { loadReport } from "@/lib/reports-data";
import { Suspense } from "react";

export const metadata = {
  title: "Reports",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <StatCardsSkeleton count={5} />
      <TableSkeleton rows={4} label="Loading reports…" />
    </div>
  );
}

async function ReportsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  try {
    const { view } = await loadReport({
      range: read("range"),
      from: read("from"),
      to: read("to"),
    });
    return <ReportsView data={view} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reports could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title="Reports" description="View invoice, payment, GST, and collection summaries." />
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
