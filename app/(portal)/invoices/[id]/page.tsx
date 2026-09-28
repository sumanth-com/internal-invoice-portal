import { InvoiceDetailView, InvoiceMissing } from "@/components/portal/invoice-detail";
import { invoiceNotice } from "@/lib/invoice";
import { loadInvoice } from "@/lib/invoices";
import { getPortalUser } from "@/lib/portal-user";
import { DetailSkeleton } from "@/components/portal/skeletons";
import { Suspense } from "react";

export const metadata = {
  title: "Invoice",
};

function InvoiceFallback() {
  return <DetailSkeleton label="Loading invoice…" />;
}

async function InvoiceContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const noticeValue = Array.isArray(query.notice) ? query.notice[0] : query.notice;

  try {
    const [invoice, user] = await Promise.all([loadInvoice(id), getPortalUser()]);
    if (!invoice || !user) return <InvoiceMissing />;
    return (
      <InvoiceDetailView
        invoice={invoice}
        isAdmin={user.role === "admin"}
        notice={invoiceNotice(noticeValue)}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "This invoice could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<InvoiceFallback />}>
      <InvoiceContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
