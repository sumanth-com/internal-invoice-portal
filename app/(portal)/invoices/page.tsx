import { InvoiceList } from "@/components/portal/invoice-list";
import { AutoOpenModal, CreateInvoiceButton } from "@/components/portal/modal-triggers";
import { PageHeader, TableSkeleton } from "@/components/portal/skeletons";
import { invoiceNotice } from "@/lib/invoice";
import { loadInvoices } from "@/lib/invoices";
import { Suspense } from "react";

export const metadata = {
  title: "Invoices",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function InvoicesContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const autoOpen = read("new") === "1";

  try {
    const data = await loadInvoices({
      q: read("q"),
      status: read("status"),
      from: read("from"),
      to: read("to"),
      sort: read("sort"),
    });
    return (
      <>
        {autoOpen ? <AutoOpenModal kind="invoice" /> : null}
        <InvoiceList data={data} notice={invoiceNotice(read("notice"))} />
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoices could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Invoices"
        description="Draft, issued, paid, and cancelled invoices."
        actions={<CreateInvoiceButton />}
      />
      <Suspense fallback={<TableSkeleton rows={6} label="Loading invoices…" />}>
        <InvoicesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
