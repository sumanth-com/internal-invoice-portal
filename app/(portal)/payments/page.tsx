import { PaymentList } from "@/components/portal/payment-list";
import { PageHeader, TableSkeleton } from "@/components/portal/skeletons";
import { loadPayableInvoices, loadPaymentBeneficiaries, loadPayments } from "@/lib/payments";
import { Suspense } from "react";

export const metadata = {
  title: "Payments",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function PaymentsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  try {
    const [data, payable, beneficiaries] = await Promise.all([
      loadPayments({
        q: read("q"),
        beneficiary: read("beneficiary"),
        mode: read("mode"),
        from: read("from"),
        to: read("to"),
      }),
      loadPayableInvoices(),
      loadPaymentBeneficiaries(),
    ]);
    return <PaymentList data={data} payable={payable} beneficiaries={beneficiaries} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payments could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Payments"
          description="Record payments the company has already received. This is not an online checkout."
        />
      </div>
      <Suspense fallback={<TableSkeleton rows={6} label="Loading payments…" />}>
        <PaymentsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
