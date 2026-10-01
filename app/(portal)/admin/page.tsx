import { AdminUsers } from "@/components/portal/admin-users";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { loadPortalUsers } from "@/lib/portal-user-data";
import { getPortalUser } from "@/lib/portal-user";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Admin Management",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={5} label="Loading users…" />
    </div>
  );
}

function AdminFallback() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <span className="block h-7 w-56 animate-pulse rounded bg-muted" />
        <span className="mt-3 block h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </div>
      <AdminSkeleton />
    </div>
  );
}

async function AdminGate({ searchParams }: { searchParams: SearchParams }) {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Admin Management"
        description="Invite internal users and manage roles and access."
      />
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent searchParams={searchParams} currentUserId={user.id} />
      </Suspense>
    </div>
  );
}

async function AdminContent({
  searchParams,
  currentUserId,
}: {
  searchParams: SearchParams;
  currentUserId: string;
}) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  try {
    const data = await loadPortalUsers({
      q: read("q"),
      role: read("role"),
      status: read("status"),
    });
    return <AdminUsers data={data} currentUserId={currentUserId} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Users could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminGate searchParams={searchParams} />
    </Suspense>
  );
}
