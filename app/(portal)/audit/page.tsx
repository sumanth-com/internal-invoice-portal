import { AuditLog } from "@/components/portal/audit-log";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { loadAuditLog } from "@/lib/audit-data";
import { getPortalUser } from "@/lib/portal-user";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Audit Log",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function AuditSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={6} label="Loading activity…" />
    </div>
  );
}

function AuditFallback() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div>
        <span className="block h-7 w-40 animate-pulse rounded bg-muted" />
        <span className="mt-3 block h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </div>
      <AuditSkeleton />
    </div>
  );
}

async function AuditGate({ searchParams }: { searchParams: SearchParams }) {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Audit Log"
          description="A history of invoice activity, including who did it and when."
        />
      </div>
      <Suspense fallback={<AuditSkeleton />}>
        <AuditContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AuditContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  try {
    const data = await loadAuditLog({
      q: read("q"),
      action: read("action"),
      user: read("user"),
      from: read("from"),
      to: read("to"),
      group: read("group"),
      page: read("page"),
    });
    return <AuditLog data={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activity could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuditFallback />}>
      <AuditGate searchParams={searchParams} />
    </Suspense>
  );
}
