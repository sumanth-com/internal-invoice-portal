import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export function StatCardsSkeleton({ count }: { count: number }) {
  return (
    <div className={cn("grid gap-4", count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border bg-card p-4 shadow-sm">
          <Bar className="h-4 w-24" />
          <Bar className="mt-3 h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Bar className="h-5 w-40" />
          <Bar className="mt-2 h-4 w-56" />
        </div>
        <Bar className="h-9 w-full md:max-w-md" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-6 px-4 py-4">
            <Bar className="h-4 w-1/4" />
            <Bar className="h-4 w-1/6" />
            <Bar className="h-4 w-1/5" />
            <Bar className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">
        {label}
      </p>
    </section>
  );
}

export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Bar className="h-4 w-24" />
        <Bar className="mt-3 h-7 w-56" />
        <Bar className="mt-3 h-4 w-72" />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <Bar className="h-3 w-20" />
              <Bar className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        {label}
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
