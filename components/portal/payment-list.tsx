"use client";

import { RecordPaymentDialog } from "@/components/portal/record-payment-dialog";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInvoiceDate, formatMoney } from "@/lib/invoice";
import {
  PAYMENT_LIST_LIMIT,
  PAYMENT_MODES,
  paymentModeLabel,
  type PayableInvoice,
  type PaymentListData,
  type PaymentRecord,
  type RecordedPayment,
} from "@/lib/payment";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function matchesFilters(data: PaymentListData, payment: PaymentRecord) {
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

function applySaved(data: PaymentListData, payment: PaymentRecord): PaymentListData {
  if (!matchesFilters(data, payment) || data.payments.some((item) => item.id === payment.id)) {
    return data;
  }
  const payments = [payment, ...data.payments.filter((item) => item.id !== payment.id)].sort(
    (left, right) => {
      if (left.paymentDate !== right.paymentDate) {
        return left.paymentDate < right.paymentDate ? 1 : -1;
      }
      return left.createdAt < right.createdAt ? 1 : -1;
    },
  );
  return { ...data, payments };
}

function applyBalance(invoices: PayableInvoice[], saved: RecordedPayment) {
  return invoices.flatMap((invoice) => {
    if (invoice.id !== saved.payment.invoiceId) return [invoice];
    if (!(saved.outstanding > 0) || saved.invoiceStatus !== "issued") return [];
    return [
      {
        ...invoice,
        total: saved.total,
        amountPaid: saved.amountPaid,
        outstanding: saved.outstanding,
      },
    ];
  });
}

export function PaymentList({
  data: serverData,
  payable: serverPayable,
}: {
  data: PaymentListData;
  payable: PayableInvoice[];
}) {
  const { notify } = usePortalModals();
  const [source, setSource] = useState(serverData);
  const [data, setData] = useState(serverData);
  const [payableSource, setPayableSource] = useState(serverPayable);
  const [payable, setPayable] = useState(serverPayable);

  if (source !== serverData) {
    setSource(serverData);
    setData(serverData);
  }
  if (payableSource !== serverPayable) {
    setPayableSource(serverPayable);
    setPayable(serverPayable);
  }

  const filtering =
    data.search.length > 0 || data.mode !== "all" || data.from.length > 0 || data.to.length > 0;

  function onSaved(saved: RecordedPayment) {
    setData((current) => applySaved(current, saved.payment));
    setPayable((current) => applyBalance(current, saved));
    notify(
      saved.invoiceStatus === "paid"
        ? "Payment recorded. The invoice is now paid."
        : "Payment recorded.",
    );
  }

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              {filtering ? "Matching payments" : "All payments"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Payments matching your search and filters."
                : "Payments already received from clients. Records cannot be edited or deleted."}
            </p>
          </div>
          <RecordPaymentDialog invoices={payable} onSaved={onSaved} />
        </div>
        <form action="/payments" className="grid gap-2 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={data.search}
              placeholder="Invoice, beneficiary, or reference"
              aria-label="Search payments"
              className="pl-8"
            />
          </div>
          <select
            name="mode"
            defaultValue={data.mode}
            aria-label="Payment mode"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            <option value="all">All modes</option>
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {paymentModeLabel(mode)}
              </option>
            ))}
          </select>
          <Input name="from" type="date" defaultValue={data.from} aria-label="From date" />
          <Input name="to" type="date" defaultValue={data.to} aria-label="To date" />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {filtering ? (
              <Button asChild variant="outline">
                <Link href="/payments">Clear</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {data.payments.length === 0 ? (
        <div className="px-4 py-10 text-sm text-muted-foreground">
          <p>{filtering ? "No payments match these filters." : "No payments recorded yet."}</p>
          {filtering ? (
            <Link href="/payments" className="mt-2 inline-block underline">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Beneficiary</th>
                <th className="px-4 py-3 font-medium">Payment date</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Reference / UTR</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Created by</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/invoices/${payment.invoiceId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {payment.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{payment.beneficiaryName}</td>
                  <td className="px-4 py-3">{formatInvoiceDate(payment.paymentDate)}</td>
                  <td className="px-4 py-3">{paymentModeLabel(payment.paymentMode)}</td>
                  <td className="px-4 py-3">{payment.reference?.trim() || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                  <td className="px-4 py-3">{payment.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {data.truncated
              ? `Showing the first ${PAYMENT_LIST_LIMIT} payments. Refine the filters to see more.`
              : data.payments.length === 1
                ? "1 payment."
                : `${data.payments.length} payments.`}
          </p>
        </div>
      )}
    </section>
  );
}
