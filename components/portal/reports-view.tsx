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
  beneficiaries,
  beneficiary,
}: {
  data: ReportView;
  invoices: ReportInvoice[];
  type: ReportType;
  query: string;
  beneficiaries: { id: string; name: string }[];
  beneficiary: string;
}) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [reportType, setReportType] = useState(type);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [search, setSearch] = useState(query);
  const [client, setClient] = useState(beneficiary);

  if (source !== data) {
    setSource(data);
    setReportType(type);
    setFrom(data.from);
    setTo(data.to);
    setSearch(query);
    setClient(beneficiary);
  }

  const periodReady = Boolean(data.from && data.to && !data.error);
  const filtering =
    reportType !== "all" || search.trim().length > 0 || data.range === "custom" || Boolean(beneficiary);
  const exportFilters = { from: data.from, to: data.to, type, query, beneficiary };
  const excelHref = periodReady ? reportExportHref("xlsx", exportFilters) : "";
  const pdfHref = periodReady ? reportExportHref("pdf", exportFilters) : "";

  const pushFilters = useCallback(
    (next?: { type?: ReportType; from?: string; to?: string; search?: string; beneficiary?: string }) => {
      const href = reportPageHref({
        type: next?.type ?? reportType,
        from: next?.from ?? from,
        to: next?.to ?? to,
        query: next?.search ?? search,
        beneficiary: next?.beneficiary ?? client,
      });
      startTransition(() => router.push(href));
    },
    [reportType, from, to, search, client, router],
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
    setClient("");
    startTransition(() => router.push("/reports"));
  }

  const rows = sortedInvoices(invoices);
  const beneficiaryRows = reportBeneficiaryRows(invoices);
  const empty = rows.length === 0 || (type === "beneficiaries" && beneficiaryRows.length === 0);

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
            className="flex flex-wrap items-center gap-2"
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
            <FilterSelect
              label="Beneficiary"
              value={client}
              onChange={(value) => {
                const next = beneficiaries.some((item) => item.id === value) ? value : "";
                setClient(next);
                pushFilters({ beneficiary: next });
              }}
              className="w-52"
            >
              <option value="">All beneficiaries</option>
              {beneficiaries.map((item) => (
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
            countLabel={beneficiaryRows.length === 1 ? "1 beneficiary." : `${beneficiaryRows.length} beneficiaries.`}
          >
            <thead className="sticky top-0 z-10">
              <tr className="text-center text-primary-foreground">
                <Th>Beneficiary</Th>
                <Th>Invoices</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              {beneficiaryRows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <Td className="font-medium">{row.name}</Td>
                  <Td>{row.count}</Td>
                  <Td>{row.valueLabel}</Td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        ) : (
          <ReportTable countLabel={rows.length === 1 ? "1 invoice." : `${rows.length} invoices.`}>
            <thead className="sticky top-0 z-10">
              <tr className="text-center text-primary-foreground">
                <Th className="w-[15%]">Invoice</Th>
                <Th className="w-[13%]">Beneficiary</Th>
                {type !== "gst" && type !== "payments" ? <Th>Status</Th> : null}
                {type === "all" || type === "gst" ? <Th>Subtotal</Th> : null}
                {type === "all" || type === "gst" ? <Th>CGST</Th> : null}
                {type === "all" || type === "gst" ? <Th>SGST</Th> : null}
                {type === "all" || type === "gst" ? <Th>IGST</Th> : null}
                {type === "all" || type === "gst" ? <Th>Total GST</Th> : null}
                {type === "all" || type === "gst" ? <Th>TDS</Th> : null}
                {type === "all" || type === "gst" || type === "outstanding" ? <Th>Balance due</Th> : null}
                {type === "payments" ? <Th>Mode</Th> : null}
                {type === "all" || type === "outstanding" || type === "payments" ? <Th>Paid</Th> : null}
                {type === "all" || type === "outstanding" || type === "payments" ? <Th>Outstanding</Th> : null}
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const currency = invoice.currency || data.currency;
                return (
                  <tr key={invoice.id} className="hover:bg-muted/40">
                    <Td>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium underline-offset-4 hover:underline">
                        {invoice.number}
                      </Link>
                      <p className="mt-0.5 text-[11px] font-normal leading-4 text-muted-foreground">
                        {formatInvoiceDate(invoice.date)}
                      </p>
                    </Td>
                    <Td className="break-words">{invoice.beneficiaryName}</Td>
                    {type !== "gst" && type !== "payments" ? (
                      <Td>
                        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </Td>
                    ) : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.subtotal, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.cgstAmount, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.sgstAmount, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.igstAmount, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.gstAmount, currency)}</Td> : null}
                    {type === "all" || type === "gst" ? <Td>{money(invoice.tdsAmount, currency)}</Td> : null}
                    {type === "all" || type === "gst" || type === "outstanding" ? (
                      <Td>{money(invoice.balanceDue, currency)}</Td>
                    ) : null}
                    {type === "payments" ? <Td>{modes(invoice)}</Td> : null}
                    {type === "all" || type === "outstanding" || type === "payments" ? (
                      <Td>{money(invoice.amountPaid, currency)}</Td>
                    ) : null}
                    {type === "all" || type === "outstanding" || type === "payments" ? (
                      <Td>{money(invoice.outstanding, currency)}</Td>
                    ) : null}
                    <Td>{money(invoice.total, currency)}</Td>
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
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-xs">{children}</table>
      </div>
      <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">{countLabel}</p>
    </>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-primary bg-primary px-1.5 py-2.5 text-center align-middle text-[11px] font-medium leading-tight",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b px-1.5 py-2.5 text-center align-middle tabular-nums", className)}>{children}</td>
  );
}
