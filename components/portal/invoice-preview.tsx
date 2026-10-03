import { formatGstRate } from "@/lib/gst";
import { formatInvoiceDate, formatMoney, invoiceUsesLegacyGst, type InvoiceDetail } from "@/lib/invoice";

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

function SupplyFact({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-6 font-semibold" : "flex justify-between gap-6"}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function InvoicePreview({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm md:p-8">
      <div className="grid grid-cols-2 gap-6 border-b pb-6">
        <Block label="Bill from" value={invoice.billFrom} />
        <Block label="Bill to" value={invoice.billTo} />
      </div>

      <div className="grid gap-4 border-b py-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invoice
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-muted-foreground">{formatInvoiceDate(invoice.invoiceDate)}</p>
        </div>
        <div className="grid gap-3 sm:justify-items-end">
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

      <dl className="grid gap-3 border-b py-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <SupplyFact label="Place of supply" value={invoice.placeOfSupply} />
        <SupplyFact label="State" value={invoice.supplyState} />
        <SupplyFact label="State code" value={invoice.stateCode} />
        <SupplyFact label="Client GSTIN" value={invoice.clientGstin} />
        <SupplyFact label="Deal / brand reference" value={invoice.dealReference} />
      </dl>

      <div className="overflow-x-auto py-6">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">SAC</th>
              <th className="py-2 pr-3 text-right font-medium">Qty</th>
              <th className="py-2 pr-3 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Taxable amount</th>
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

      <div className="ml-auto grid max-w-sm gap-2 border-t pt-4 text-sm">
        <MoneyRow label="Subtotal" value={formatMoney(invoice.subtotal, invoice.currency)} />
        {invoiceUsesLegacyGst(invoice) ? (
          <MoneyRow label="GST" value={formatMoney(invoice.gstAmount, invoice.currency)} />
        ) : (
          <>
            <MoneyRow
              label={`CGST @ ${formatGstRate(invoice.cgstAmount > 0 ? invoice.gstRate / 2 : 0)}%`}
              value={formatMoney(invoice.cgstAmount, invoice.currency)}
            />
            <MoneyRow
              label={`SGST @ ${formatGstRate(invoice.sgstAmount > 0 ? invoice.gstRate / 2 : 0)}%`}
              value={formatMoney(invoice.sgstAmount, invoice.currency)}
            />
            <MoneyRow
              label={`IGST @ ${formatGstRate(invoice.igstAmount > 0 ? invoice.gstRate : 0)}%`}
              value={formatMoney(invoice.igstAmount, invoice.currency)}
            />
          </>
        )}
        <MoneyRow label="Invoice total" value={formatMoney(invoice.total, invoice.currency)} strong />
        <MoneyRow label="TDS" value={formatMoney(invoice.tdsAmount, invoice.currency)} />
        <MoneyRow label="Balance due" value={formatMoney(invoice.balanceDue, invoice.currency)} strong />
        <p className="pt-2 text-muted-foreground">{invoice.amountInWords}</p>
      </div>

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
