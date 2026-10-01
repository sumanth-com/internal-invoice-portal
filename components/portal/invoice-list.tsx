"use client";

import { DeleteDraftDialog } from "@/components/portal/invoice-actions";
import { IconAction } from "@/components/portal/icon-action";
import { InvoiceNotice } from "@/components/portal/invoice-notice";
import { CreateInvoiceButton } from "@/components/portal/modal-triggers";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  datesAreCurrentMonth,
  formatInvoiceDate,
  formatMoney,
  invoiceListHref,
  statusLabel,
  type InvoiceListData,
  type InvoiceSort,
  type InvoiceStatus,
  type InvoiceSummary,
} from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { ChevronDown, Eye, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

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

const statuses: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

function statusVariant(status: InvoiceStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "issued") return "default" as const;
  return "secondary" as const;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClass, "pl-3 pr-8")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function InvoiceList({
  data,
  notice,
  isAdmin,
}: {
  data: InvoiceListData;
  notice: "saved" | "issued" | "cancelled" | "deleted" | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [search, setSearch] = useState(data.search);
  const [status, setStatus] = useState<InvoiceStatus | "all">(data.status);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [sort, setSort] = useState<InvoiceSort>(data.sort);
  const [deleting, setDeleting] = useState<InvoiceSummary | null>(null);

  if (source !== data) {
    setSource(data);
    setSearch(data.search);
    setStatus(data.status);
    setFrom(data.from);
    setTo(data.to);
    setSort(data.sort);
  }

  const filtering = data.search.length > 0 || data.status !== "all" || !datesAreCurrentMonth(data.from, data.to);
  const emptyPortal = data.total === 0 && !filtering;

  const pushFilters = useCallback(
    (next?: {
      search?: string;
      status?: InvoiceStatus | "all";
      from?: string;
      to?: string;
      sort?: InvoiceSort;
    }) => {
      const href = invoiceListHref({
        search: next?.search ?? search,
        status: next?.status ?? status,
        from: next?.from ?? from,
        to: next?.to ?? to,
        sort: next?.sort ?? sort,
      });
      startTransition(() => router.push(href));
    },
    [search, status, from, to, sort, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {notice ? (
        <div className="shrink-0">
          <InvoiceNotice notice={notice} />
        </div>
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching invoices" : "All invoices"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering ? "Invoices matching your search and filters." : "Every invoice in the portal."}
            </p>
          </div>
          <form
            className="flex items-center gap-2 overflow-x-auto"
            onSubmit={(event) => {
              event.preventDefault();
              pushFilters({ search: search.trim() });
            }}
          >
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice number or beneficiary"
                aria-label="Search invoices"
                className="h-9 py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
              />
            </div>
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => {
                const next = value === "all" || statuses.includes(value as InvoiceStatus) ? (value as InvoiceStatus | "all") : "all";
                setStatus(next);
                pushFilters({ status: next });
              }}
              className="w-40"
            >
              <option value="all">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
            </FilterSelect>
            <Input
              type="date"
              value={from}
              aria-label="From date"
              onChange={(event) => {
                const value = event.target.value;
                setFrom(value);
                if (value && to) pushFilters({ from: value, to });
              }}
              className="h-9 w-40 shrink-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
            <Input
              type="date"
              value={to}
              aria-label="To date"
              onChange={(event) => {
                const value = event.target.value;
                setTo(value);
                if (from && value) pushFilters({ from, to: value });
              }}
              className="h-9 w-40 shrink-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
            <FilterSelect
              label="Sort invoices"
              value={sort}
              onChange={(value) => {
                const next = sortOptions.find((option) => option.value === value)?.value ?? "date_desc";
                setSort(next);
                pushFilters({ sort: next });
              }}
              className="w-52"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </form>
        </div>

        {data.invoices.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">No invoices found</p>
            {emptyPortal ? <CreateInvoiceButton className="mt-4" /> : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b bg-muted px-4 py-3 font-medium">Invoice</th>
                    <th className="border-b bg-muted px-4 py-3 font-medium">Date</th>
                    <th className="border-b bg-muted px-4 py-3 font-medium">Beneficiary</th>
                    <th className="border-b bg-muted px-4 py-3 text-right font-medium">Subtotal</th>
                    <th className="border-b bg-muted px-4 py-3 text-right font-medium">GST</th>
                    <th className="border-b bg-muted px-4 py-3 text-right font-medium">Total</th>
                    <th className="border-b bg-muted px-4 py-3 font-medium">Status</th>
                    <th className="border-b bg-muted px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/40">
                      <td className="border-b px-4 py-3 font-medium whitespace-nowrap">
                        <Link href={`/invoices/${invoice.id}`} className="underline-offset-4 hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatInvoiceDate(invoice.invoiceDate)}
                      </td>
                      <td className="border-b px-4 py-3">{invoice.beneficiaryName}</td>
                      <td className="border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatMoney(invoice.subtotal, invoice.currency)}
                      </td>
                      <td className="border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatMoney(invoice.gstAmount, invoice.currency)}
                      </td>
                      <td className="border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                      <td className="border-b px-4 py-3">
                        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </td>
                      <td className="border-b px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconAction label="View" href={`/invoices/${invoice.id}`}>
                            <Eye />
                          </IconAction>
                          {invoice.status === "draft" ? (
                            <IconAction label="Edit" href={`/invoices/${invoice.id}/edit`}>
                              <Pencil />
                            </IconAction>
                          ) : null}
                          {invoice.status === "draft" && isAdmin ? (
                            <IconAction
                              label="Delete"
                              onClick={() => setDeleting(invoice)}
                              className="hover:text-destructive"
                            >
                              <Trash2 />
                            </IconAction>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">
              {data.truncated
                ? `Showing the first ${data.invoices.length} invoices. Refine the filters to see more.`
                : data.invoices.length === 1
                  ? "1 invoice."
                  : `${data.invoices.length} invoices.`}
            </p>
          </div>
        )}
      </section>

      <DeleteDraftDialog
        id={deleting?.id ?? null}
        number={deleting?.invoiceNumber ?? ""}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
