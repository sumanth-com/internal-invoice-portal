import { InvoiceNotice } from "@/components/portal/invoice-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatInvoiceDate,
  formatMoney,
  statusLabel,
  type InvoiceListData,
  type InvoiceSort,
  type InvoiceStatus,
} from "@/lib/invoice";
import { CreateInvoiceButton } from "@/components/portal/modal-triggers";
import { Search } from "lucide-react";
import Link from "next/link";

const sortOptions: { value: InvoiceSort; label: string }[] = [
  { value: "date_desc", label: "Newest date" },
  { value: "date_asc", label: "Oldest date" },
  { value: "number_asc", label: "Invoice number" },
  { value: "number_desc", label: "Invoice number, descending" },
  { value: "beneficiary_asc", label: "Beneficiary" },
  { value: "total_desc", label: "Highest total" },
  { value: "total_asc", label: "Lowest total" },
  { value: "status_asc", label: "Status" },
];

function statusVariant(status: InvoiceStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "issued") return "default" as const;
  return "secondary" as const;
}

export function InvoiceList({
  data,
  notice,
}: {
  data: InvoiceListData;
  notice: "saved" | "issued" | "cancelled" | "deleted" | null;
}) {
  const filtering =
    data.search.length > 0 ||
    data.status !== "all" ||
    data.from.length > 0 ||
    data.to.length > 0;
  const showFirstEmpty = data.total === 0 && !filtering;

  return (
    <>

      {notice ? <InvoiceNotice notice={notice} /> : null}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">
              {filtering ? "Matching invoices" : "All invoices"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Invoices matching your search and filters."
                : "Every invoice in the portal."}
            </p>
          </div>
          <form action="/invoices" className="grid gap-2 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={data.search}
                placeholder="Invoice number or beneficiary"
                aria-label="Search invoices"
                className="pl-8"
              />
            </div>
            <select
              name="status"
              defaultValue={data.status}
              aria-label="Invoice status"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Input
              name="from"
              type="date"
              defaultValue={data.from}
              aria-label="From date"
            />
            <Input name="to" type="date" defaultValue={data.to} aria-label="To date" />
            <select
              name="sort"
              defaultValue={data.sort}
              aria-label="Sort invoices"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 md:col-span-6">
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {filtering ? (
                <Button asChild variant="outline">
                  <Link href="/invoices">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {showFirstEmpty ? (
          <div className="px-4 py-10">
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
            <CreateInvoiceButton className="mt-4" />
          </div>
        ) : data.invoices.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            <p>No invoices match these filters.</p>
            <Link href="/invoices" className="mt-2 inline-block underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Beneficiary</th>
                  <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                  <th className="px-4 py-3 text-right font-medium">GST</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatInvoiceDate(invoice.invoiceDate)}</td>
                    <td className="px-4 py-3">{invoice.beneficiaryName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(invoice.subtotal, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(invoice.gstAmount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(invoice.status)}>
                        {statusLabel(invoice.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium underline"
                        >
                          View
                        </Link>
                        {invoice.status === "draft" ? (
                          <Link
                            href={`/invoices/${invoice.id}/edit`}
                            className="font-medium underline"
                          >
                            Edit
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {data.truncated
                ? `Showing the first ${data.invoices.length} invoices. Refine the filters to see more.`
                : data.invoices.length === 1
                  ? "1 invoice."
                  : `${data.invoices.length} invoices.`}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
