"use client";

import { IconAction } from "@/components/portal/icon-action";
import { DeletePaymentDialog, EditPaymentDialog } from "@/components/portal/payment-edit-dialog";
import { RecordPaymentDialog } from "@/components/portal/record-payment-dialog";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { datesAreCurrentMonth, formatInvoiceDate, formatMoney } from "@/lib/invoice";
import {
  PAYMENT_LIST_LIMIT,
  PAYMENT_MODES,
  paymentListHref,
  paymentModeLabel,
  type PayableInvoice,
  type PaymentBeneficiaryOption,
  type PaymentListData,
  type PaymentMode,
  type PaymentRecord,
  type RecordedPayment,
} from "@/lib/payment";
import { cn } from "@/lib/utils";
import { ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

function matchesFilters(data: PaymentListData, payment: PaymentRecord) {
  if (data.beneficiary !== "all" && payment.beneficiaryId !== data.beneficiary) return false;
  if (data.mode !== "all" && payment.paymentMode !== data.mode) return false;
  if (data.from && payment.paymentDate < data.from) return false;
  if (data.to && payment.paymentDate > data.to) return false;
  if (!data.search) return true;
  const needle = data.search.toLowerCase();
  return (
    payment.invoiceNumber.toLowerCase().includes(needle) ||
    payment.beneficiaryName.toLowerCase().includes(needle) ||
    (payment.reference ?? "").toLowerCase().includes(needle)
  );
}

function sortPayments(payments: PaymentRecord[]) {
  return [...payments].sort((left, right) => {
    if (left.paymentDate !== right.paymentDate) {
      return left.paymentDate < right.paymentDate ? 1 : -1;
    }
    return left.createdAt < right.createdAt ? 1 : -1;
  });
}

function applySaved(data: PaymentListData, payment: PaymentRecord): PaymentListData {
  const rest = data.payments.filter((item) => item.id !== payment.id);
  if (!matchesFilters(data, payment)) return { ...data, payments: rest };
  return { ...data, payments: sortPayments([payment, ...rest]) };
}

function applyBalance(invoices: PayableInvoice[], saved: RecordedPayment) {
  const others = invoices.filter((invoice) => invoice.id !== saved.payment.invoiceId);
  if (!(saved.outstanding > 0) || saved.invoiceStatus !== "issued") return others;
  return [
    {
      id: saved.payment.invoiceId,
      invoiceNumber: saved.payment.invoiceNumber,
      beneficiaryName: saved.payment.beneficiaryName,
      currency: saved.payment.currency,
      total: saved.total,
      amountPaid: saved.amountPaid,
      outstanding: saved.outstanding,
    },
    ...others,
  ];
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
    <div className={cn("relative w-full sm:w-44", className)}>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClass, "pl-3 pr-8")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function PaymentList({
  data: serverData,
  payable: serverPayable,
  beneficiaries,
}: {
  data: PaymentListData;
  payable: PayableInvoice[];
  beneficiaries: PaymentBeneficiaryOption[];
}) {
  const router = useRouter();
  const { notify } = usePortalModals();
  const [source, setSource] = useState(serverData);
  const [data, setData] = useState(serverData);
  const [payableSource, setPayableSource] = useState(serverPayable);
  const [payable, setPayable] = useState(serverPayable);
  const [search, setSearch] = useState(serverData.search);
  const [beneficiary, setBeneficiary] = useState(serverData.beneficiary);
  const [mode, setMode] = useState<PaymentMode | "all">(serverData.mode);
  const [from, setFrom] = useState(serverData.from);
  const [to, setTo] = useState(serverData.to);
  const [editing, setEditing] = useState<PaymentRecord | null>(null);
  const [deleting, setDeleting] = useState<PaymentRecord | null>(null);

  if (source !== serverData) {
    setSource(serverData);
    setData(serverData);
    setSearch(serverData.search);
    setBeneficiary(serverData.beneficiary);
    setMode(serverData.mode);
    setFrom(serverData.from);
    setTo(serverData.to);
  }
  if (payableSource !== serverPayable) {
    setPayableSource(serverPayable);
    setPayable(serverPayable);
  }

  const filtering =
    data.search.length > 0 ||
    data.beneficiary !== "all" ||
    data.mode !== "all" ||
    !datesAreCurrentMonth(data.from, data.to);

  const pushFilters = useCallback(
    (next?: {
      search?: string;
      beneficiary?: string;
      mode?: PaymentMode | "all";
      from?: string;
      to?: string;
    }) => {
      const href = paymentListHref({
        search: next?.search ?? search,
        beneficiary: next?.beneficiary ?? beneficiary,
        mode: next?.mode ?? mode,
        from: next?.from ?? from,
        to: next?.to ?? to,
      });
      startTransition(() => router.push(href));
    },
    [search, beneficiary, mode, from, to, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  function onChanged(saved: RecordedPayment, message: string) {
    setData((current) => applySaved(current, saved.payment));
    setPayable((current) => applyBalance(current, saved));
    notify(message);
    startTransition(() => router.refresh());
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex shrink-0 flex-col gap-4 border-b p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching payments" : "All payments"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Payments matching the selected filters."
                : "Payments already received from clients."}
            </p>
          </div>
          <RecordPaymentDialog
            invoices={payable}
            onSaved={(saved) =>
              onChanged(
                saved,
                saved.invoiceStatus === "paid"
                  ? "Payment recorded. The invoice is now paid."
                  : "Payment recorded.",
              )
            }
          />
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            pushFilters({ search: search.trim() });
          }}
        >
          <div className="relative min-w-0 flex-1 sm:min-w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Invoice, beneficiary, or reference"
              aria-label="Search payments"
              className="h-9 bg-transparent py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
          </div>
          <FilterSelect
            label="Beneficiary"
            value={beneficiary}
            onChange={(value) => {
              setBeneficiary(value);
              pushFilters({ beneficiary: value });
            }}
            className="sm:w-52"
          >
            <option value="all">All beneficiaries</option>
            {beneficiaries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Payment mode"
            value={mode}
            onChange={(value) => {
              const next = value === "all" || PAYMENT_MODES.includes(value as PaymentMode) ? (value as PaymentMode | "all") : "all";
              setMode(next);
              pushFilters({ mode: next });
            }}
          >
            <option value="all">All modes</option>
            {PAYMENT_MODES.map((item) => (
              <option key={item} value={item}>
                {paymentModeLabel(item)}
              </option>
            ))}
          </FilterSelect>
          <Input
            type="date"
            value={from}
            aria-label="From date"
            onChange={(event) => {
              setFrom(event.target.value);
              pushFilters({ from: event.target.value });
            }}
            className="h-9 w-full bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0 sm:w-36"
          />
          <Input
            type="date"
            value={to}
            aria-label="To date"
            onChange={(event) => {
              setTo(event.target.value);
              pushFilters({ to: event.target.value });
            }}
            className="h-9 w-full bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0 sm:w-36"
          />
        </form>
      </div>

      {data.payments.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {filtering ? "No payments match these filters." : "No payments recorded yet."}
          </p>
          {filtering ? (
            <Button asChild variant="outline" className="mt-4">
              <Link href="/payments">Show all payments</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="border-b bg-muted px-4 py-3 font-medium">Invoice</th>
                  <th className="border-b bg-muted px-4 py-3 font-medium">Beneficiary</th>
                  <th className="border-b bg-muted px-4 py-3 font-medium whitespace-nowrap">Payment date</th>
                  <th className="border-b bg-muted px-4 py-3 font-medium">Mode</th>
                  <th className="border-b bg-muted px-4 py-3 font-medium">Reference / UTR</th>
                  <th className="border-b bg-muted px-4 py-3 text-right font-medium">Amount</th>
                  <th className="border-b bg-muted px-4 py-3 font-medium whitespace-nowrap">Created by</th>
                  <th className="border-b bg-muted px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/40">
                    <td className="border-b px-4 py-3 font-medium whitespace-nowrap">
                      <Link href={`/invoices/${payment.invoiceId}`} className="underline-offset-4 hover:underline">
                        {payment.invoiceNumber}
                      </Link>
                    </td>
                    <td className="border-b px-4 py-3">{payment.beneficiaryName}</td>
                    <td className="border-b px-4 py-3 whitespace-nowrap">{formatInvoiceDate(payment.paymentDate)}</td>
                    <td className="border-b px-4 py-3 whitespace-nowrap">{paymentModeLabel(payment.paymentMode)}</td>
                    <td className="border-b px-4 py-3">{payment.reference?.trim() || "—"}</td>
                    <td className="border-b px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="border-b px-4 py-3">{payment.createdByName}</td>
                    <td className="border-b px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconAction label="Edit" onClick={() => setEditing(payment)}>
                          <Pencil />
                        </IconAction>
                        <IconAction label="Delete" onClick={() => setDeleting(payment)} className="hover:text-destructive">
                          <Trash2 />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">
            {data.truncated
              ? `Showing the first ${PAYMENT_LIST_LIMIT} payments. Refine the filters to see more.`
              : data.payments.length === 1
                ? "1 payment."
                : `${data.payments.length} payments.`}
          </p>
        </div>
      )}

      <EditPaymentDialog
        payment={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={(saved) =>
          onChanged(
            saved,
            saved.invoiceStatus === "paid" ? "Payment saved. The invoice is now paid." : "Payment saved.",
          )
        }
      />
      <DeletePaymentDialog
        payment={deleting}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onDeleted={(saved) => onChanged(saved, "Payment deleted.")}
      />
    </section>
  );
}
