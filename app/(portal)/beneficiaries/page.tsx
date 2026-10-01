import { BeneficiaryList } from "@/components/portal/beneficiary-list";
import { AddBeneficiaryButton, AutoOpenModal } from "@/components/portal/modal-triggers";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { beneficiaryNotice } from "@/lib/beneficiary";
import { beneficiaryIdsOnInvoices, loadBeneficiaries } from "@/lib/beneficiaries";
import { getPortalUser } from "@/lib/portal-user";
import { Suspense } from "react";

export const metadata = {
  title: "Beneficiaries",
};

type SearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
  notice?: string | string[];
  new?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function BeneficiariesFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardsSkeleton count={3} />
      <TableSkeleton label="Loading beneficiaries…" />
    </div>
  );
}

async function BeneficiariesContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const autoOpen = first(params.new) === "1";

  try {
    const [data, user] = await Promise.all([
      loadBeneficiaries(first(params.q), first(params.status)),
      getPortalUser(),
    ]);
    const usedOnInvoices =
      user?.role === "admin" ? await beneficiaryIdsOnInvoices(data.beneficiaries.map((item) => item.id)) : new Set<string>();
    const deletableIds =
      user?.role === "admin" ? data.beneficiaries.filter((item) => !usedOnInvoices.has(item.id)).map((item) => item.id) : [];
    return (
      <>
        {autoOpen ? <AutoOpenModal kind="beneficiary" /> : null}
        <BeneficiaryList
          data={data}
          notice={beneficiaryNotice(first(params.notice))}
          deletableIds={deletableIds}
          isAdmin={user?.role === "admin"}
        />
      </>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Beneficiaries could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function BeneficiariesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Beneficiaries"
          description="Companies and people invoices are raised to."
          actions={<AddBeneficiaryButton />}
        />
      </div>
      <Suspense fallback={<BeneficiariesFallback />}>
        <BeneficiariesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
