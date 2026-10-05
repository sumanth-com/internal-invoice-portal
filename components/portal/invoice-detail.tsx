import {
  CancelInvoiceButton,
  DeleteDraftButton,
  IssueInvoiceButton,
} from "@/components/portal/invoice-actions";
import { InvoiceNotice } from "@/components/portal/invoice-notice";
import { InvoicePayments } from "@/components/portal/invoice-payments";
import { InvoicePdfActions } from "@/components/portal/invoice-pdf-actions";
import { InvoicePreview } from "@/components/portal/invoice-preview";
import { EditDraftButton } from "@/components/portal/modal-triggers";
import { Button } from "@/components/ui/button";
import {
  formatInvoiceDate,
  formatMoney,
  issueBlockers,
  roundMoney,
  type BankAccountOption,
  type InvoiceDetail as InvoiceDetailData,
  type InvoiceStatus,
} from "@/lib/invoice";
import { paymentBalance, paymentModeLabel, type PaymentRecord } from "@/lib/payment";
import { Check, ChevronLeft, Landmark } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function InvoiceMissing() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Invoice not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This invoice does not exist, or you cannot view it.
      </p>
      <Link
        href="/invoices"
        className="mt-4 inline-block text-sm font-medium underline"
      >
        Back to invoices
      </Link>
    </section>
  );
}

export function InvoiceDetailView({
  invoice,
  payments,
  isAdmin,
  notice,
}: {
  invoice: InvoiceDetailData;
  payments: PaymentRecord[];
  isAdmin: boolean;
  notice: "saved" | "issued" | "cancelled" | "deleted" | null;
}) {
  const blockers = invoice.status === "draft" ? issueBlockers(invoice) : [];
  const canCancel = isAdmin && invoice.status !== "cancelled";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="sticky -top-4 z-30 -mx-4 -mt-4 mb-2 flex flex-col gap-3 border-b bg-background px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between md:-top-6 md:-mx-6 md:-mt-6 md:px-6 md:pt-6">
        <Button asChild variant="outline" size="icon" className="rounded-full">
          <Link href="/invoices" aria-label="Back to invoices">
            <ChevronLeft />
            <span className="sr-only">Back to invoices</span>
          </Link>
        </Button>
        <h1 className="sr-only">Invoice {invoice.invoiceNumber}</h1>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status !== "draft" ? (
              <InvoicePdfActions
                id={invoice.id}
                number={invoice.invoiceNumber}
                beneficiaryId={invoice.beneficiaryId}
                beneficiaryName={invoice.beneficiaryName}
                beneficiaryEmail={invoice.beneficiaryEmail}
                total={invoice.balanceDue}
                currency={invoice.currency}
              />
            ) : null}
            {invoice.status === "draft" ? <EditDraftButton id={invoice.id} /> : null}
            {invoice.status === "draft" ? (
              <IssueInvoiceButton
                id={invoice.id}
                disabled={blockers.length > 0}
              />
            ) : null}
            {invoice.status === "draft" && isAdmin ? (
              <DeleteDraftButton id={invoice.id} number={invoice.invoiceNumber} />
            ) : null}
            {canCancel ? (
              <CancelInvoiceButton
                id={invoice.id}
                number={invoice.invoiceNumber}
              />
            ) : null}
          </div>
        </div>
      </div>

      {notice ? <InvoiceNotice notice={notice} /> : null}

      {blockers.length > 0 ? (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">
          <p className="font-medium">This draft cannot be issued yet.</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 min-w-0 lg:order-1">
          <InvoicePreview invoice={invoice} />
        </div>
        <aside className="order-1 flex min-w-0 flex-col gap-4 lg:sticky lg:top-16 lg:z-10 lg:order-2">
          <PaymentStatusCard invoice={invoice} payments={payments} />
          <InvoicePayments
            invoice={{
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              beneficiaryName: invoice.beneficiaryName,
              currency: invoice.currency,
              total: invoice.total,
              balanceDue: invoice.balanceDue,
              status: invoice.status,
            }}
            payments={payments}
          />
          {invoice.bank ? <BankAccountCard bank={invoice.bank} /> : null}
        </aside>
      </div>
    </div>
  );
}

function BankAccountCard({ bank }: { bank: BankAccountOption }) {
  const rows = [
    ["Bank", bank.bankName],
    ["Account name", bank.accountHolderName],
    ["Account number", bank.accountNumber],
    ["IFSC", bank.ifscCode],
    ["Branch", bank.branch],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Landmark className="size-4" />
        </span>
        Bank account
      </h2>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function paymentStanding(status: InvoiceStatus, amountPaid: number, outstanding: number) {
  if (status === "cancelled") return "Cancelled";
  if (status === "paid" || (status !== "draft" && outstanding <= 0 && amountPaid > 0)) return "Paid";
  if (status !== "draft" && amountPaid > 0 && outstanding > 0) return "Partial";
  return "Unpaid";
}

function PaymentStatusCard({
  invoice,
  payments,
}: {
  invoice: InvoiceDetailData;
  payments: PaymentRecord[];
}) {
  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const balance = paymentBalance(invoice.balanceDue, paid, invoice.status);
  const standing = paymentStanding(invoice.status, balance.amountPaid, balance.outstanding);
  const progress =
    invoice.status === "paid"
      ? 100
      : invoice.status === "issued" && invoice.balanceDue > 0
        ? Math.min(100, Math.round((balance.amountPaid / invoice.balanceDue) * 100))
        : 0;
  const latest = payments[0];

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Payment status</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
            standing === "Paid" && "bg-emerald-600 text-white",
            standing === "Partial" && "bg-primary/20 text-primary",
            standing === "Unpaid" && "bg-muted text-muted-foreground",
            standing === "Cancelled" && "bg-destructive/10 text-destructive",
          )}
        >
          {standing === "Paid" ? <Check className="size-3.5" strokeWidth={3} /> : null}
          {standing.toUpperCase()}
        </span>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Invoice total</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(invoice.total, invoice.currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(balance.amountPaid, invoice.currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Outstanding</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(balance.outstanding, invoice.currency)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full", standing === "Paid" ? "bg-emerald-600" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{progress}% of the balance due</span>
          {standing === "Paid" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 font-medium text-white">
              <Check className="size-3.5" strokeWidth={3} />
              Paid
            </span>
          ) : null}
        </p>
      </div>

      {latest ? (
        <p className="mt-4 border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            {payments.length > 1 ? "Latest payment " : "Payment "}
          </span>
          {formatInvoiceDate(latest.paymentDate)} · {paymentModeLabel(latest.paymentMode)}
        </p>
      ) : (
        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          {invoice.status === "draft"
            ? "Payments can be recorded after this invoice is issued."
            : invoice.status === "cancelled"
              ? "Cancelled invoices cannot receive payments."
              : "No payments recorded."}
        </p>
      )}
    </section>
  );
}
