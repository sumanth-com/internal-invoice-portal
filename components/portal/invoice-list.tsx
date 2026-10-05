"use client";

import { setInvoiceStatus } from "@/app/(portal)/invoices/actions";
import { DeleteDraftDialog } from "@/components/portal/invoice-actions";
import { IconAction } from "@/components/portal/icon-action";
import { InvoiceNotice } from "@/components/portal/invoice-notice";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  dateOnOrAfter,
  formatInvoiceDate,
  formatMoney,
  invoiceListHref,
  paymentStandingAfterStatusChange,
  statusLabel,
  type InvoiceListData,
  type InvoiceStatus,
  type InvoiceSummary,
} from "@/lib/invoice";
import { requestNotificationRefresh } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Eye, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

const statuses: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

const invoiceColumns =
  "grid grid-cols-[minmax(11rem,1.3fr)_minmax(8.5rem,0.9fr)_minmax(11rem,1.3fr)_8.5rem_8rem_7.5rem_9.5rem_8.5rem_8rem] items-center";
const headCell =
  "bg-primary px-4 py-3 text-xs font-semibold tracking-wide text-primary-foreground whitespace-nowrap";
const bodyCell = "min-w-0 px-4 py-3";

function statusPillClass(status: InvoiceStatus) {
  if (status === "paid") return "bg-emerald-600 text-white";
  if (status === "cancelled") return "bg-destructive text-destructive-foreground";
  if (status === "issued") return "bg-primary text-primary-foreground";
  return "bg-secondary text-secondary-foreground";
}

function statusNotice(status: InvoiceStatus) {
  if (status === "draft") return "Invoice saved as draft successfully.";
  if (status === "issued") return "Invoice issued successfully.";
  if (status === "paid") return "Invoice marked as paid successfully.";
  return "Invoice cancelled successfully.";
}

function listDescription(data: InvoiceListData, filtering: boolean) {
  if (data.from && data.to) return `Invoices from ${formatInvoiceDate(data.from)} to ${formatInvoiceDate(data.to)}.`;
  if (data.from) return `Invoices from ${formatInvoiceDate(data.from)} onward.`;
  if (data.to) return `Invoices through ${formatInvoiceDate(data.to)}.`;
  if (filtering) return "Invoices matching your search and filters.";
  return "Every invoice in the portal.";
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
    <div className={cn("relative min-w-0", className)}>
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
  const [beneficiary, setBeneficiary] = useState(data.beneficiary);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [rows, setRows] = useState(data.invoices);
  const [deleting, setDeleting] = useState<InvoiceSummary | null>(null);
  const [confirming, setConfirming] = useState<{ invoice: InvoiceSummary; next: InvoiceStatus } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { notify, openEditInvoice } = usePortalModals();

  if (source !== data) {
    setSource(data);
    setSearch(data.search);
    setBeneficiary(data.beneficiary);
    setFrom(data.from);
    setTo(data.to);
    setRows(data.invoices);
  }

  const filtering =
    data.search.length > 0 || Boolean(data.beneficiary) || Boolean(data.from || data.to);

  const pushFilters = useCallback(
    (next?: {
      search?: string;
      beneficiary?: string;
      from?: string;
      to?: string;
    }) => {
      const href = invoiceListHref({
        search: next?.search ?? search,
        beneficiary: next?.beneficiary ?? beneficiary,
        from: next?.from ?? from,
        to: next?.to ?? to,
      });
      startTransition(() => router.push(href));
    },
    [search, beneficiary, from, to, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  const applyStatus = useCallback(
    async (invoice: InvoiceSummary, next: InvoiceStatus) => {
      setBusyId(invoice.id);
      const result = await setInvoiceStatus(invoice.id, next);
      setBusyId(null);
      if (!result.ok) {
        notify(result.error, "error");
        return;
      }
      const updated: InvoiceSummary = {
        ...invoice,
        status: result.status,
        paymentStanding: paymentStandingAfterStatusChange(invoice.paymentStanding, result.status),
      };
      setRows((current) =>
        current.flatMap((row) => {
          if (row.id !== invoice.id) return [row];
          if (data.status !== "all" && updated.status !== data.status) return [];
          if (data.payment !== "all" && updated.paymentStanding !== data.payment) return [];
          return [updated];
        }),
      );
      notify(statusNotice(result.status));
      if (result.status === "issued" || result.status === "paid" || result.status === "cancelled") {
        requestNotificationRefresh();
      }
    },
    [data.payment, data.status, notify],
  );

  function requestStatus(invoice: InvoiceSummary, next: InvoiceStatus) {
    if (next === invoice.status || busyId === invoice.id) return;
    if (next === "paid" || next === "cancelled") {
      setConfirming({ invoice, next });
      return;
    }
    void applyStatus(invoice, next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {notice ? <InvoiceNotice notice={notice} /> : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching invoices" : "All invoices"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{listDescription(data, filtering)}</p>
          </div>
          <form
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1.6fr)_minmax(12rem,1fr)_9.75rem_9.75rem]"
            onSubmit={(event) => {
              event.preventDefault();
              pushFilters({ search: search.trim() });
            }}
          >
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice number"
                aria-label="Search by invoice number"
                className="h-9 w-full py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
              />
            </div>
            <FilterSelect
              label="Beneficiary"
              value={beneficiary}
              onChange={(value) => {
                const next = data.beneficiaries.some((item) => item.id === value) ? value : "";
                setBeneficiary(next);
                pushFilters({ beneficiary: next });
              }}
              className="w-full"
            >
              <option value="">Beneficiary</option>
              {data.beneficiaries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FilterSelect>
            <Input
              type="date"
              value={from}
              aria-label="From date"
              onChange={(event) => {
                const value = event.target.value;
                const nextTo = dateOnOrAfter(value, to);
                setFrom(value);
                setTo(nextTo);
                pushFilters({ from: value, to: nextTo });
              }}
              className="h-9 w-full min-w-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
            <Input
              type="date"
              value={to}
              min={from || undefined}
              aria-label="To date"
              onChange={(event) => {
                const nextTo = dateOnOrAfter(from, event.target.value);
                setTo(nextTo);
                pushFilters({ to: nextTo });
              }}
              className="h-9 w-full min-w-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
          </form>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <div role="table" className="min-w-[80rem] text-sm">
              <div
                role="row"
                className={cn(invoiceColumns, "sticky top-0 z-10 border-b border-primary-foreground/20 bg-primary text-left")}
              >
                <div role="columnheader" className={headCell}>Invoice Number</div>
                <div role="columnheader" className={headCell}>Date</div>
                <div role="columnheader" className={headCell}>Beneficiary</div>
                <div role="columnheader" className={cn(headCell, "text-right")}>Taxable Amount</div>
                <div role="columnheader" className={cn(headCell, "text-right")}>GST</div>
                <div role="columnheader" className={cn(headCell, "text-right")}>TDS</div>
                <div role="columnheader" className={cn(headCell, "text-right")}>Balance Due</div>
                <div role="columnheader" className={cn(headCell, "text-center")}>Status</div>
                <div role="columnheader" className={cn(headCell, "text-center")}>Actions</div>
              </div>
              {rows.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center px-6 py-16 text-center">
                  <p className="text-sm font-medium">No invoices found</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {filtering
                      ? "Nothing matches this invoice number, beneficiary, or date range."
                      : "Invoices you create will appear in this list."}
                  </p>
                </div>
              ) : (
                rows.map((invoice) => (
                  <div key={invoice.id} role="row" className={cn(invoiceColumns, "border-b text-left hover:bg-muted/40")}>
                    <div role="cell" className={cn(bodyCell, "font-medium whitespace-nowrap")}>
                      <Link href={`/invoices/${invoice.id}`} className="underline-offset-4 hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </div>
                    <div role="cell" className={cn(bodyCell, "whitespace-nowrap text-muted-foreground")}>
                      {formatInvoiceDate(invoice.invoiceDate)}
                    </div>
                    <div role="cell" className={cn(bodyCell, "truncate")} title={invoice.beneficiaryName}>
                      {invoice.beneficiaryName}
                    </div>
                    <div role="cell" className={cn(bodyCell, "text-right tabular-nums whitespace-nowrap")}>
                      {formatMoney(invoice.subtotal, invoice.currency)}
                    </div>
                    <div role="cell" className={cn(bodyCell, "text-right tabular-nums whitespace-nowrap")}>
                      {formatMoney(invoice.gstAmount, invoice.currency)}
                    </div>
                    <div role="cell" className={cn(bodyCell, "text-right tabular-nums whitespace-nowrap")}>
                      {formatMoney(invoice.tdsAmount, invoice.currency)}
                    </div>
                    <div role="cell" className={cn(bodyCell, "text-right tabular-nums whitespace-nowrap")}>
                      {formatMoney(invoice.balanceDue, invoice.currency)}
                    </div>
                    <div role="cell" className={cn(bodyCell, "flex justify-center")}>
                      <StatusControl
                        invoice={invoice}
                        busy={busyId === invoice.id}
                        onChange={(next) => requestStatus(invoice, next)}
                      />
                    </div>
                    <div role="cell" className={cn(bodyCell, "flex justify-center")}>
                      <div className="flex justify-center gap-1">
                        <IconAction label="View" href={`/invoices/${invoice.id}`} tipAlign="end">
                          <Eye />
                        </IconAction>
                        {invoice.status === "draft" ? (
                          <IconAction
                            label="Edit"
                            onClick={() => openEditInvoice(invoice.id)}
                            tipAlign="end"
                          >
                            <Pencil />
                          </IconAction>
                        ) : null}
                        {invoice.status === "draft" && isAdmin ? (
                          <IconAction
                            label="Delete"
                            onClick={() => setDeleting(invoice)}
                            tipAlign="end"
                            className="hover:text-destructive"
                          >
                            <Trash2 />
                          </IconAction>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">
            {data.truncated
              ? `Showing the first ${rows.length} invoices. Refine the filters to see more.`
              : rows.length === 1
                ? "1 invoice."
                : `${rows.length} invoices.`}
          </p>
        </div>
      </section>

      <DeleteDraftDialog
        id={deleting?.id ?? null}
        number={deleting?.invoiceNumber ?? ""}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
      />
      {confirming ? (
        <StatusConfirm
          invoice={confirming.invoice}
          next={confirming.next}
          busy={busyId === confirming.invoice.id}
          onClose={() => {
            if (busyId !== confirming.invoice.id) setConfirming(null);
          }}
          onConfirm={() => {
            const pending = confirming;
            setConfirming(null);
            void applyStatus(pending.invoice, pending.next);
          }}
        />
      ) : null}
    </div>
  );
}

function StatusControl({
  invoice,
  busy,
  onChange,
}: {
  invoice: InvoiceSummary;
  busy: boolean;
  onChange: (status: InvoiceStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label={`Status for ${invoice.invoiceNumber}`}
        className={cn(
          "inline-flex h-7 w-[8.25rem] items-center justify-between gap-1 rounded-full px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
          statusPillClass(invoice.status),
        )}
      >
        <span>{statusLabel(invoice.status)}</span>
        <ChevronDown className="size-3 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[8.25rem] p-1">
        {statuses.map((status) => {
          const current = status === invoice.status;
          return (
            <DropdownMenuItem
              key={status}
              onSelect={() => onChange(status)}
              className={cn(
                "justify-between text-xs font-medium focus:bg-[hsl(262_83%_96%)] focus:text-[hsl(262_47%_28%)]",
                current &&
                  "bg-[hsl(262_83%_58%)] text-white focus:bg-[hsl(262_83%_58%)] focus:text-white",
              )}
            >
              {statusLabel(status)}
              {current ? <Check className="size-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusConfirm({
  invoice,
  next,
  busy,
  onClose,
  onConfirm,
}: {
  invoice: InvoiceSummary;
  next: InvoiceStatus;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const paid = next === "paid";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="status-change-title" className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg">
        <h2 id="status-change-title" className="text-base font-semibold">
          {paid ? `Mark ${invoice.invoiceNumber} as paid?` : `Cancel invoice ${invoice.invoiceNumber}?`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {paid
            ? "The invoice status changes to paid. Recorded payments stay on the invoice."
            : "The invoice status changes to cancelled. You can choose another status later."}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Keep status
          </Button>
          <Button type="button" variant={paid ? "default" : "destructive"} disabled={busy} onClick={onConfirm}>
            {busy ? "Saving…" : paid ? "Mark paid" : "Cancel invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
