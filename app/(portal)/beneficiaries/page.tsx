import { BeneficiaryList } from "@/components/portal/beneficiary-list";
import { AddBeneficiaryButton, AutoOpenModal } from "@/components/portal/modal-triggers";
import { PageHeader, StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { beneficiaryNotice } from "@/lib/beneficiary";
import { loadBeneficiaries } from "@/lib/beneficiaries";
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
    <>
      <StatCardsSkeleton count={3} />
      <TableSkeleton label="Loading beneficiaries…" />
    </>
  );
}

async function BeneficiariesContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const autoOpen = first(params.new) === "1";

  try {
    const data = await loadBeneficiaries(first(params.q), first(params.status));
    return (
      <>
        {autoOpen ? <AutoOpenModal kind="beneficiary" /> : null}
        <BeneficiaryList data={data} notice={beneficiaryNotice(first(params.notice))} />
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Beneficiaries"
        description="Companies and people invoices are raised to."
        actions={<AddBeneficiaryButton />}
      />
      <Suspense fallback={<BeneficiariesFallback />}>
        <BeneficiariesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
