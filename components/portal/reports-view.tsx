import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInvoiceDate, statusLabel, type InvoiceStatus } from "@/lib/invoice";
import { reportHref, type ReportMonth, type ReportRange, type ReportView } from "@/lib/reports";
import { Download } from "lucide-react";
import Link from "next/link";

const RANGE_LABELS: { range: ReportRange; label: string }[] = [
  { range: "month", label: "This Month" },
  { range: "last_month", label: "Last Month" },
  { range: "quarter", label: "This Quarter" },
  { range: "year", label: "This Year" },
  { range: "custom", label: "Custom Range" },
];

function statusVariant(status: InvoiceStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "issued") return "default" as const;
  return "secondary" as const;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight">{value}</p>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border bg-card shadow-sm">
      <div className="border-b p-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TrendChart({ months }: { months: ReportMonth[] }) {
  const maxCount = Math.max(...months.map((month) => month.count), 1);
  const maxValue = Math.max(...months.map((month) => month.value), 1);
  return (
    <div className="min-w-0 overflow-x-auto">
      <div
        className="flex h-56 min-w-full items-end gap-4 px-4 pt-4"
        style={{ minWidth: `${Math.max(months.length * 76, 280)}px` }}
      >
        {months.map((month) => (
          <div key={month.key} className="flex w-16 shrink-0 flex-col items-center gap-2">
            <div className="flex h-36 items-end gap-1">
              <div
                className="w-5 rounded-t bg-primary"
                style={{ height: `${Math.max((month.count / maxCount) * 100, month.count > 0 ? 4 : 0)}%` }}
                title={`${month.count} invoices`}
              />
              <div
                className="w-5 rounded-t bg-primary/35"
                style={{ height: `${Math.max((month.value / maxValue) * 100, month.value > 0 ? 4 : 0)}%` }}
                title={month.valueLabel}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">{month.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsView({ data }: { data: ReportView }) {
  const exportHref = `/reports/export?from=${data.from}&to=${data.to}`;
  const period =
    data.from && data.to ? `${formatInvoiceDate(data.from)} – ${formatInvoiceDate(data.to)}` : "Custom range";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {RANGE_LABELS.map((item) => (
            <Button
              key={item.range}
              asChild
              size="sm"
              variant={data.range === item.range ? "default" : "outline"}
            >
              <Link
                href={
                  item.range === "custom"
                    ? reportHref("custom", data.from, data.to)
                    : reportHref(item.range)
                }
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
        {data.range === "custom" ? (
          <form action="/reports" className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input type="hidden" name="range" value="custom" />
            <Input name="from" type="date" defaultValue={data.from} aria-label="From date" className="min-w-0" required />
            <Input name="to" type="date" defaultValue={data.to} aria-label="To date" className="min-w-0" required />
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{period}</p>
          {data.error ? null : (
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Download />
                Export CSV
              </a>
            </Button>
          )}
        </div>
        {data.error ? (
          <p role="alert" className="text-sm text-destructive">
            {data.error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Invoices" value={String(data.totalInvoices)} />
        <SummaryCard label="Total Invoice Value" value={data.totalValue} />
        <SummaryCard label="Total GST" value={data.totalGst} />
        <SummaryCard label="Amount Paid" value={data.amountPaid} />
        <SummaryCard label="Outstanding Amount" value={data.outstanding} />
      </div>

      <Section title="Invoice status" description="Counts and amounts for each invoice status.">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.statuses.map((status) => (
            <div key={status.status} className="min-w-0 rounded-lg border p-3">
              <Badge variant={statusVariant(status.status)}>{status.label}</Badge>
              <p className="mt-3 text-2xl font-semibold">{status.count}</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{status.amount}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Monthly trend" description="Invoice count and value for each month in this period.">
        {data.hasInvoices ? (
          <>
            <div className="flex flex-wrap gap-4 px-4 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-primary" />
                Invoice count
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-sm bg-primary/35" />
                Invoice value
              </span>
            </div>
            <TrendChart months={data.months} />
            <ul className="divide-y md:hidden">
              {data.months.map((month) => (
                <li key={month.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{month.label}</span>
                  <span className="text-right text-muted-foreground">
                    {month.count} {month.count === 1 ? "invoice" : "invoices"}
                    <span className="mt-1 block">{month.valueLabel}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-t text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 text-right font-medium">Invoices</th>
                    <th className="px-4 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((month) => (
                    <tr key={month.key} className="border-t">
                      <td className="px-4 py-3">{month.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{month.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{month.valueLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="px-4 py-10 text-sm text-muted-foreground">No invoices in this period.</p>
        )}
      </Section>

      <Section
        title="Payments"
        description="Payments recorded against invoices in this period."
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Total amount received" value={data.payments.received} />
          <Figure label="Number of payments" value={String(data.payments.count)} />
          <Figure label="Average payment amount" value={data.payments.average} />
          <Figure label="Outstanding amount" value={data.payments.outstanding} />
        </div>
        <ul className="divide-y border-t">
          {data.payments.modes.map((mode) => (
            <li key={mode.mode} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{mode.label}</span>
              <span className="text-right text-muted-foreground">
                {mode.count} {mode.count === 1 ? "payment" : "payments"}
                <span className="mt-1 block text-foreground">{mode.amount}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="GST"
        description="Subtotal, GST, and total stored on each invoice. Historical invoices keep the GST they were saved with."
      >
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Figure label="Subtotal" value={data.gst.subtotal} />
          <Figure label="GST amount" value={data.gst.gst} />
          <Figure label="Total invoice value" value={data.gst.total} />
        </div>
      </Section>

      <Section title="Beneficiaries">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Figure label="Active beneficiaries" value={String(data.beneficiaries.active)} />
          <Figure label="With invoices in this period" value={String(data.beneficiaries.withInvoices)} />
        </div>
        {data.beneficiaries.top.length === 0 ? (
          <p className="border-t px-4 py-8 text-sm text-muted-foreground">No beneficiaries in this period.</p>
        ) : (
          <ol className="divide-y border-t">
            {data.beneficiaries.top.map((beneficiary, index) => (
              <li key={beneficiary.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">
                    {index + 1}. {beneficiary.name}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {beneficiary.count} {beneficiary.count === 1 ? "invoice" : "invoices"}
                  </span>
                </span>
                <span className="shrink-0 font-medium">{beneficiary.value}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        title="Recent invoices"
        description="Latest invoices in this period."
      >
        {data.recent.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">No invoices in this period.</p>
        ) : (
          <>
            <ul className="divide-y lg:hidden">
              {data.recent.map((invoice) => (
                <li key={invoice.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/invoices/${invoice.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                        {invoice.number}
                      </Link>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{invoice.beneficiary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{invoice.total}</p>
                      <div className="mt-2">
                        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Beneficiary</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((invoice) => (
                    <tr key={invoice.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="underline-offset-4 hover:underline">
                          {invoice.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{invoice.beneficiary}</td>
                      <td className="px-4 py-3 text-muted-foreground">{invoice.date}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{invoice.total}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="border-t px-4 py-3">
          <Button asChild variant="outline" size="sm">
            <Link href={data.from && data.to ? `/invoices?from=${data.from}&to=${data.to}` : "/invoices"}>
              View all invoices
            </Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
