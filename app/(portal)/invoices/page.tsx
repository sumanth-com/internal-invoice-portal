import { InvoiceList } from "@/components/portal/invoice-list";
import { AutoOpenModal, CreateInvoiceButton } from "@/components/portal/modal-triggers";
import { PageHeader, TableSkeleton } from "@/components/portal/skeletons";
import { invoiceNotice } from "@/lib/invoice";
import { loadInvoices } from "@/lib/invoices";
import { getPortalUser } from "@/lib/portal-user";
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
    const [data, user] = await Promise.all([
      loadInvoices({
        q: read("q"),
        beneficiary: read("beneficiary"),
        status: read("status"),
        payment: read("payment"),
        from: read("from"),
        to: read("to"),
        sort: read("sort"),
      }),
      getPortalUser(),
    ]);
    return (
      <>
        {autoOpen ? <AutoOpenModal kind="invoice" /> : null}
        <InvoiceList data={data} notice={invoiceNotice(read("notice"))} isAdmin={user?.role === "admin"} />
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
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Invoices"
          description="Draft, issued, paid, and cancelled invoices."
          actions={<CreateInvoiceButton />}
        />
      </div>
      <Suspense fallback={<TableSkeleton rows={6} label="Loading invoices…" />}>
        <InvoicesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
