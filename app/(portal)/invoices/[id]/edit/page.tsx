import { InvoiceForm } from "@/components/portal/invoice-form";
import { InvoiceMissing } from "@/components/portal/invoice-detail";
import { invoiceToday } from "@/lib/invoice";
import { loadInvoice, loadInvoiceFormOptions } from "@/lib/invoices";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DetailSkeleton } from "@/components/portal/skeletons";
import { Suspense } from "react";

export const metadata = {
  title: "Edit invoice",
};

function EditInvoiceFallback() {
  return <DetailSkeleton label="Loading invoice…" />;
}

async function EditInvoiceContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const invoice = await loadInvoice(id);
    if (!invoice) return <InvoiceMissing />;
    if (invoice.status !== "draft") redirect(`/invoices/${invoice.id}`);

    const { beneficiaries, bankAccounts, defaults } = await loadInvoiceFormOptions({
      beneficiaryId: invoice.beneficiaryId,
      bankAccountId: invoice.bankAccountId,
    });

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Link
            href={`/invoices/${invoice.id}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {invoice.invoiceNumber}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit draft</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The invoice number stays with this draft. The date must remain in{" "}
            {invoice.invoiceNumber.slice(0, 4)}-{invoice.invoiceNumber.slice(4, 6)}.
          </p>
        </div>
        <InvoiceForm
          mode="edit"
          invoice={invoice}
          beneficiaries={beneficiaries}
          bankAccounts={bankAccounts}
          defaults={defaults}
          today={invoiceToday()}
        />
      </div>
    );
  } catch (error) {
    const digest =
      typeof error === "object" && error !== null && "digest" in error
        ? String((error as { digest: unknown }).digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;
    const message =
      error instanceof Error ? error.message : "This invoice could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Edit draft</h1>
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditInvoiceFallback />}>
      <EditInvoiceContent params={params} />
    </Suspense>
  );
}
