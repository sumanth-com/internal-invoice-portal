import {
  BeneficiaryDetail,
  BeneficiaryMissing,
} from "@/components/portal/beneficiary-detail";
import { beneficiaryNotice, isBeneficiaryId } from "@/lib/beneficiary";
import { beneficiaryHasInvoices, loadBeneficiary } from "@/lib/beneficiaries";
import { getPortalUser } from "@/lib/portal-user";
import { DetailSkeleton } from "@/components/portal/skeletons";
import { Suspense } from "react";

export const metadata = {
  title: "Beneficiary",
};

function BeneficiaryFallback() {
  return <DetailSkeleton label="Loading beneficiary…" />;
}

async function BeneficiaryContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[]; edit?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const noticeValue = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const editValue = Array.isArray(query.edit) ? query.edit[0] : query.edit;

  try {
    if (!isBeneficiaryId(id)) return <BeneficiaryMissing />;
    const [beneficiary, user, hasInvoices] = await Promise.all([
      loadBeneficiary(id),
      getPortalUser(),
      beneficiaryHasInvoices(id),
    ]);
    if (!beneficiary || !user) return <BeneficiaryMissing />;

    return (
      <BeneficiaryDetail
        beneficiary={beneficiary}
        isAdmin={user.role === "admin"}
        hasInvoices={hasInvoices}
        notice={beneficiaryNotice(noticeValue)}
        autoOpenEdit={editValue === "1"}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "This beneficiary could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Beneficiary</h1>
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function BeneficiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[]; edit?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<BeneficiaryFallback />}>
      <BeneficiaryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
