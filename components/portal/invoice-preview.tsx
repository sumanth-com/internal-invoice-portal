import { bankAccountLabel, formatInvoiceDate, formatMoney, type InvoiceDetail } from "@/lib/invoice";

function Block({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm">{value?.trim() || "—"}</p>
    </div>
  );
}

export function InvoicePreview({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm md:p-8">
      <div className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:justify-between">
        <Block label="Bill from" value={invoice.billFrom} />
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invoice
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight">
            {invoice.invoiceNumber}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatInvoiceDate(invoice.invoiceDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 border-b py-6 sm:grid-cols-2">
        <Block label="Bill to" value={invoice.billTo} />
        <div className="grid gap-3 text-sm sm:justify-items-end">
          <p>
            <span className="text-muted-foreground">Beneficiary </span>
            {invoice.beneficiaryName}
          </p>
          <p>
            <span className="text-muted-foreground">Due </span>
            {invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : "—"}
          </p>
          {invoice.paymentTerms ? (
            <p className="whitespace-pre-line sm:text-right">{invoice.paymentTerms}</p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto py-6">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">HSN/SAC</th>
              <th className="py-2 pr-3 text-right font-medium">Qty</th>
              <th className="py-2 pr-3 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-muted-foreground">
                  No line items yet.
                </td>
              </tr>
            ) : (
              invoice.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">{item.description}</td>
                  <td className="py-3 pr-3">{item.hsn || "—"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {formatMoney(item.rate, invoice.currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney(item.lineSubtotal, invoice.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="ml-auto grid max-w-xs gap-2 border-t pt-4 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">
            {formatMoney(invoice.subtotal, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">
            GST {invoice.gstEnabled ? `(${invoice.gstRate}%)` : "(not applied)"}
          </span>
          <span className="tabular-nums">
            {formatMoney(invoice.gstAmount, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-6 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(invoice.total, invoice.currency)}
          </span>
        </div>
        <p className="pt-2 text-muted-foreground">{invoice.amountInWords}</p>
      </div>

      {invoice.bank ? (
        <div className="mt-6 border-t pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bank account
          </p>
          <p className="mt-2 text-sm">{bankAccountLabel(invoice.bank)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[invoice.bank.branch, invoice.bank.ifscCode].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ) : null}

      {invoice.notes ? (
        <div className="mt-6 border-t pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-line text-sm">{invoice.notes}</p>
        </div>
      ) : null}
    </article>
  );
}
