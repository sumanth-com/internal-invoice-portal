"use client";

import { PageHeader } from "@/components/portal/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInvoiceDate, formatMoney, roundMoney, statusLabel, type InvoiceStatus } from "@/lib/invoice";
import { paymentModeLabel } from "@/lib/payment";
import {
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  reportBeneficiaryRows,
  reportExportHref,
  reportPageHref,
  type ReportInvoice,
  type ReportType,
  type ReportView,
} from "@/lib/reports";
import { cn } from "@/lib/utils";
import { ChevronDown, Download, FileSpreadsheet, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

function statusVariant(status: InvoiceStatus) {
  if (status === "cancelled") return "destructive" as const;
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

function money(amount: number, currency: string) {
  return formatMoney(roundMoney(amount), currency);
}

function modes(invoice: ReportInvoice) {
  const labels = [...new Set(invoice.payments.map((payment) => paymentModeLabel(payment.mode)))];
  return labels.length > 0 ? labels.join(", ") : "—";
}

function sortedInvoices(invoices: ReportInvoice[]) {
  return [...invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? 1 : -1;
    return left.number < right.number ? 1 : -1;
  });
}

export function ReportsView({
  data,
  invoices,
  type,
  query,
}: {
  data: ReportView;
  invoices: ReportInvoice[];
  type: ReportType;
  query: string;
}) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [reportType, setReportType] = useState(type);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [search, setSearch] = useState(query);

  if (source !== data) {
    setSource(data);
    setReportType(type);
    setFrom(data.from);
    setTo(data.to);
    setSearch(query);
  }

  const periodReady = Boolean(data.from && data.to && !data.error);
  const filtering = reportType !== "all" || search.trim().length > 0 || data.range === "custom";
  const excelHref = periodReady ? reportExportHref("xlsx", { from: data.from, to: data.to, type, query }) : "";
  const pdfHref = periodReady ? reportExportHref("pdf", { from: data.from, to: data.to, type, query }) : "";

  const pushFilters = useCallback(
    (next?: { type?: ReportType; from?: string; to?: string; search?: string }) => {
      const href = reportPageHref({
        type: next?.type ?? reportType,
        from: next?.from ?? from,
        to: next?.to ?? to,
        query: next?.search ?? search,
      });
      startTransition(() => router.push(href));
    },
    [reportType, from, to, search, router],
  );

  useEffect(() => {
    const value = search.trim();
    if (value === query) return;
    const timer = window.setTimeout(() => pushFilters({ search: value }), 300);
    return () => window.clearTimeout(timer);
  }, [search, query, pushFilters]);

  function showAll() {
    setReportType("all");
    setSearch("");
    startTransition(() => router.push("/reports"));
  }

  const rows = sortedInvoices(invoices);
  const beneficiaries = reportBeneficiaryRows(invoices);
  const empty = rows.length === 0 || (type === "beneficiaries" && beneficiaries.length === 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Reports"
          description="Invoice, payment, GST, collection, and outstanding reports."
          actions={
            periodReady ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={excelHref}>
                    <FileSpreadsheet />
                    Export Excel
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={pdfHref}>
                    <Download />
                    Download PDF
                  </a>
                </Button>
              </>
            ) : null
          }
        />
      </div>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? REPORT_TYPE_LABELS[type] : "All reports"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.error
                ? data.error
                : `${formatInvoiceDate(data.from)} – ${formatInvoiceDate(data.to)}`}
            </p>
          </div>
          <form
            className="flex items-center gap-2 overflow-x-auto"
            onSubmit={(event) => {
              event.preventDefault();
              pushFilters({ search: search.trim() });
            }}
          >
            <FilterSelect
              label="Report type"
              value={reportType}
              onChange={(value) => {
                const next = REPORT_TYPES.find((item) => item === value) ?? "all";
                setReportType(next);
                pushFilters({ type: next });
              }}
              className="w-52"
            >
              {REPORT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {REPORT_TYPE_LABELS[item]}
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
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice, beneficiary, or status"
                aria-label="Search reports"
                className="h-9 py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
              />
            </div>
          </form>
        </div>

        {data.error || empty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {data.error ? data.error : filtering ? "No rows match these filters." : "No invoices in this period."}
            </p>
            {filtering && !data.error ? (
              <Button type="button" variant="outline" className="mt-4" onClick={showAll}>
                Show all reports
              </Button>
            ) : null}
          </div>
        ) : type === "beneficiaries" ? (
          <ReportTable
            countLabel={beneficiaries.length === 1 ? "1 beneficiary." : `${beneficiaries.length} beneficiaries.`}
          >
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-muted-foreground">
                <Th>Beneficiary</Th>
                <Th align="right">Invoices</Th>
                <Th align="right">Value</Th>
              </tr>
            </thead>
            <tbody>
              {beneficiaries.map((row) => (
                <tr key={row.id}>
                  <Td className="font-medium">{row.name}</Td>
                  <Td align="right">{row.count}</Td>
                  <Td align="right">{row.valueLabel}</Td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        ) : (
          <ReportTable countLabel={rows.length === 1 ? "1 invoice." : `${rows.length} invoices.`}>
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-muted-foreground">
                <Th>Invoice</Th>
                <Th>Beneficiary</Th>
                <Th>Date</Th>
                {type !== "gst" && type !== "payments" ? <Th>Status</Th> : null}
                {type === "gst" ? <Th align="right">Subtotal</Th> : null}
                {type === "all" || type === "gst" ? <Th align="right">GST</Th> : null}
                {type === "payments" ? <Th>Mode</Th> : null}
                {type === "all" || type === "outstanding" || type === "payments" ? <Th align="right">Paid</Th> : null}
                {type === "all" || type === "outstanding" || type === "payments" ? <Th align="right">Outstanding</Th> : null}
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const currency = invoice.currency || data.currency;
                return (
                  <tr key={invoice.id}>
                    <Td className="font-medium whitespace-nowrap">
                      <Link href={`/invoices/${invoice.id}`} className="underline-offset-4 hover:underline">
                        {invoice.number}
                      </Link>
                    </Td>
                    <Td>{invoice.beneficiaryName}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatInvoiceDate(invoice.date)}</Td>
                    {type !== "gst" && type !== "payments" ? (
                      <Td>
                        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </Td>
                    ) : null}
                    {type === "gst" ? <Td align="right">{money(invoice.subtotal, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td align="right">{money(invoice.gstAmount, currency)}</Td> : null}
                    {type === "payments" ? <Td>{modes(invoice)}</Td> : null}
                    {type === "all" || type === "outstanding" || type === "payments" ? (
                      <Td align="right">{money(invoice.amountPaid, currency)}</Td>
                    ) : null}
                    {type === "all" || type === "outstanding" || type === "payments" ? (
                      <Td align="right">{money(invoice.outstanding, currency)}</Td>
                    ) : null}
                    <Td align="right">{money(invoice.total, currency)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </ReportTable>
        )}
      </section>
    </div>
  );
}

function ReportTable({ children, countLabel }: { children: ReactNode; countLabel: string }) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">{children}</table>
      </div>
      <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">{countLabel}</p>
    </>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th className={cn("border-b bg-card px-4 py-3 font-medium whitespace-nowrap", align === "right" && "text-right")}>
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className,
}: {
  children: ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td className={cn("border-b px-4 py-3 align-middle", align === "right" && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}
