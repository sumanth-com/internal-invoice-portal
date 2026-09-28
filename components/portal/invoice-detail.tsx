import {
  CancelInvoiceButton,
  DeleteDraftButton,
  IssueInvoiceButton,
} from "@/components/portal/invoice-actions";
import { InvoiceNotice } from "@/components/portal/invoice-notice";
import { InvoicePdfActions } from "@/components/portal/invoice-pdf-actions";
import { InvoicePreview } from "@/components/portal/invoice-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatInvoiceTimestamp,
  issueBlockers,
  statusLabel,
  type InvoiceDetail as InvoiceDetailData,
  type InvoiceStatus,
} from "@/lib/invoice";
import Link from "next/link";

function statusVariant(status: InvoiceStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "issued") return "default" as const;
  return "secondary" as const;
}

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
  isAdmin,
  notice,
}: {
  invoice: InvoiceDetailData;
  isAdmin: boolean;
  notice: "saved" | "issued" | "cancelled" | "deleted" | null;
}) {
  const blockers = invoice.status === "draft" ? issueBlockers(invoice) : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Invoices
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(invoice.status)}>
              {statusLabel(invoice.status)}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Added {formatInvoiceTimestamp(invoice.createdAt)}
              {invoice.issuedAt
                ? ` · Issued ${formatInvoiceTimestamp(invoice.issuedAt)}`
                : ""}
              {invoice.paidAt
                ? ` · Paid ${formatInvoiceTimestamp(invoice.paidAt)}`
                : ""}
              {invoice.cancelledAt
                ? ` · Cancelled ${formatInvoiceTimestamp(invoice.cancelledAt)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {invoice.status !== "draft" ? (
            <InvoicePdfActions id={invoice.id} number={invoice.invoiceNumber} />
          ) : null}
          {invoice.status === "draft" ? (
            <Button asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>Edit draft</Link>
            </Button>
          ) : null}
          {invoice.status === "draft" ? (
            <IssueInvoiceButton
              id={invoice.id}
              disabled={blockers.length > 0}
            />
          ) : null}
          {invoice.status === "draft" && isAdmin ? (
            <DeleteDraftButton id={invoice.id} number={invoice.invoiceNumber} />
          ) : null}
          {invoice.status !== "cancelled" &&
          invoice.status !== "draft" &&
          isAdmin ? (
            <CancelInvoiceButton
              id={invoice.id}
              number={invoice.invoiceNumber}
            />
          ) : null}
          {invoice.status === "draft" && isAdmin ? (
            <CancelInvoiceButton
              id={invoice.id}
              number={invoice.invoiceNumber}
            />
          ) : null}
        </div>
      </div>

      {notice ? <InvoiceNotice notice={notice} /> : null}

      {blockers.length > 0 ? (
        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <p className="font-medium">This draft cannot be issued yet.</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoice.status === "issued" ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          This invoice stays issued until recorded payments cover the total.
          Payment recording is separate from this screen.
        </p>
      ) : null}

      <InvoicePreview invoice={invoice} />
    </div>
  );
}
