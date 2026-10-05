import { InvoiceMissing } from "@/components/portal/invoice-detail";
import { loadInvoice } from "@/lib/invoices";
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
    redirect(`/invoices/${invoice.id}?edit=1`);
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
