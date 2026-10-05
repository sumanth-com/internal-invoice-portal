"use client";

import { RecordPaymentDialog } from "@/components/portal/record-payment-dialog";
import { usePortalModals } from "@/components/portal/portal-modals";
import { formatInvoiceDate, formatMoney, roundMoney } from "@/lib/invoice";
import { requestNotificationRefresh } from "@/lib/notifications";
import { paymentBalance, paymentModeLabel, type PaymentRecord, type RecordedPayment } from "@/lib/payment";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function InvoicePayments({
  invoice,
  payments: serverPayments,
}: {
  invoice: {
    id: string;
    invoiceNumber: string;
    beneficiaryName: string;
    currency: string;
    total: number;
    balanceDue: number;
    status: string;
  };
  payments: PaymentRecord[];
}) {
  const router = useRouter();
  const { notify } = usePortalModals();
  const [source, setSource] = useState(serverPayments);
  const [payments, setPayments] = useState(serverPayments);

  if (source !== serverPayments) {
    setSource(serverPayments);
    setPayments(serverPayments);
  }

  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const balance = paymentBalance(invoice.balanceDue, paid, invoice.status);
  const payable =
    invoice.status === "issued" && balance.outstanding > 0
      ? [
          {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            beneficiaryName: invoice.beneficiaryName,
            currency: invoice.currency,
            total: invoice.total,
            amountPaid: balance.amountPaid,
            outstanding: balance.outstanding,
          },
        ]
      : [];

  function onSaved(saved: RecordedPayment) {
    setPayments((current) =>
      current.some((payment) => payment.id === saved.payment.id)
        ? current
        : [saved.payment, ...current],
    );
    notify(
      saved.invoiceStatus === "paid"
        ? "Payment recorded. The invoice is now paid."
        : "Payment recorded.",
    );
    if (saved.invoiceStatus === "paid") requestNotificationRefresh();
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.status === "draft"
              ? "Payments can be recorded after this invoice is issued."
              : invoice.status === "cancelled"
                ? "Cancelled invoices cannot receive payments."
                : invoice.status === "paid"
                  ? "Recorded payments cover the balance due."
                  : "This invoice stays issued until recorded payments cover the balance due."}
          </p>
        </div>
        {payable.length > 0 ? (
          <RecordPaymentDialog
            invoices={payable}
            presetId={invoice.id}
            onSaved={onSaved}
            variant="outline"
          />
        ) : null}
      </div>

      {payments.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No payments recorded.</p>
      ) : (
        <ul className="divide-y">
          {payments.map((payment) => (
            <li key={payment.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{formatInvoiceDate(payment.paymentDate)}</p>
                <p className="font-semibold tabular-nums">{formatMoney(payment.amount, invoice.currency)}</p>
              </div>
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Mode</dt>
                  <dd className="text-right text-foreground">{paymentModeLabel(payment.paymentMode)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Reference</dt>
                  <dd className="text-right text-foreground">{payment.reference?.trim() || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Recorded by</dt>
                  <dd className="text-right text-foreground">{payment.createdByName}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
