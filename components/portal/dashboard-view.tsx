"use client";

import { loadDashboardInvoiceDetail, type DashboardInvoiceDetail } from "@/app/(portal)/dashboard/detail-action";
import { InvoiceEmailButton } from "@/components/portal/invoice-email-dialog";
import { IconAction } from "@/components/portal/icon-action";
import {
  AddBeneficiaryButton,
  CreateInvoiceButton,
  RefreshOnBeneficiarySaved,
} from "@/components/portal/modal-triggers";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Input } from "@/components/ui/input";
import darkScene from "@/assets/dark.png";
import lightScene from "@/assets/light.png";
import type { DashboardData, DashboardInvoice, InvoiceStatus } from "@/lib/dashboard";
import { formatInvoiceDate, formatMoney, statusLabel } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { Check, CircleCheck, Download, Eye, FilePen, IndianRupee, Loader2, Plus, Search, Send, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

const panelActionClass =
  "size-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white";

const panelTipClass =
  "pointer-events-none absolute top-full z-20 mt-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100";

const cardWaves = {
  "Draft invoices": {
    back: "M0 46C78 46 128 22 206 30C286 38 338 16 400 24V120H0Z",
    front: "M0 74C92 74 146 52 224 58C302 64 348 46 400 52V120H0Z",
    backClass: "fill-sky-100 dark:fill-sky-900",
    frontClass: "fill-sky-200 dark:fill-sky-700",
  },
  "Issued invoices": {
    back: "M0 34C86 34 132 54 210 44C286 34 340 22 400 30V120H0Z",
    front: "M0 64C96 64 150 82 228 70C306 58 352 50 400 56V120H0Z",
    backClass: "fill-violet-100 dark:fill-violet-900",
    frontClass: "fill-violet-200 dark:fill-violet-700",
  },
  "Paid invoices": {
    back: "M0 42C72 28 138 24 214 38C292 52 346 36 400 26V120H0Z",
    front: "M0 70C84 56 148 52 226 66C304 80 350 66 400 54V120H0Z",
    backClass: "fill-amber-100 dark:fill-amber-900",
    frontClass: "fill-amber-200 dark:fill-amber-700",
  },
} as const;

function SoftWave({ label }: { label: keyof typeof cardWaves }) {
  const wave = cardWaves[label];
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full"
      aria-hidden
    >
      <path d={wave.back} className={wave.backClass} />
      <path d={wave.front} className={wave.frontClass} />
    </svg>
  );
}

function VisualStatCard({ label, value }: { label: string; value: number }) {
  return (
    <Link
      href="/invoices"
      className="relative block h-full min-h-[168px] overflow-hidden rounded-2xl border shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image
        src={lightScene}
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover object-[center_70%] dark:hidden"
      />
      <Image
        src={darkScene}
        alt=""
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="hidden object-cover object-[center_70%] dark:block"
      />
      <div className="relative z-10 p-4">
        <p className="text-sm font-medium text-neutral-600 dark:text-white/80">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums dark:text-white">{value}</p>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: keyof typeof cardWaves;
  value: number;
  href: string;
  icon: typeof FilePen;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative z-10 flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <SoftWave label={label} />
    </Link>
  );
}

function preferredInvoice(invoices: DashboardInvoice[]) {
  return (
    invoices.find((invoice) => invoice.status === "issued" && invoice.outstanding > 0) ??
    invoices[0] ??
    null
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [search, setSearch] = useState(data.search);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "paid">("all");
  const hasInvoices = data.total > 0;
  const hasBeneficiaries = data.beneficiaryCount > 0;
  const searching = data.search.length > 0;
  const visibleInvoices = data.invoices.filter(
    (invoice) => statusFilter === "all" || invoice.status === statusFilter,
  );
  const selected =
    visibleInvoices.find((invoice) => invoice.id === pickedId) ?? preferredInvoice(visibleInvoices);
  useEffect(() => {
    setSearch(data.search);
  }, [data.search]);

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => {
      const href = query ? `/dashboard?q=${encodeURIComponent(query)}` : "/dashboard";
      startTransition(() => router.push(href));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, router]);

  return (
    <>
      <RefreshOnBeneficiarySaved />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VisualStatCard label="Total invoices" value={data.total} />
        <StatCard label="Draft invoices" value={data.draft} href="/invoices?status=draft" icon={FilePen} />
        <StatCard label="Issued invoices" value={data.issued} href="/invoices?status=issued" icon={Send} />
        <StatCard label="Paid invoices" value={data.paid} href="/invoices?status=paid" icon={CircleCheck} />
      </div>

      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["draft", "Draft"],
              ["issued", "Issued"],
              ["paid", "Paid"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <CreateInvoiceButton className="rounded-full">
            <Plus />
            Create Invoice
          </CreateInvoiceButton>
          <AddBeneficiaryButton variant="outline" className="rounded-full">
            <UserPlus />
            Add Beneficiary
          </AddBeneficiaryButton>
        </div>
        <form
          className="w-full justify-self-end lg:max-w-xs"
          onSubmit={(event) => {
            event.preventDefault();
            const query = search.trim();
            const href = query ? `/dashboard?q=${encodeURIComponent(query)}` : "/dashboard";
            startTransition(() => router.push(href));
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Invoice number or beneficiary"
              aria-label="Search invoices"
              className="h-9 rounded-full bg-card pl-8 shadow-sm"
            />
          </div>
        </form>
      </div>

      {!hasBeneficiaries ? (
        <p className="text-sm text-muted-foreground">No beneficiaries yet.</p>
      ) : null}

      <section className="grid min-h-[28rem] min-w-0 flex-1 overflow-hidden rounded-[28px] bg-neutral-950 shadow-sm lg:min-h-0 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col text-white">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <h2 className="text-sm font-semibold">
              {searching ? "Matching invoices" : "Recent invoices"}
            </h2>
            <Link
              href="/invoices"
              className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
            >
              History
            </Link>
          </div>

          {!hasInvoices ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/60">
              No invoices yet.
            </div>
          ) : visibleInvoices.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-white/60">
              <p>{searching ? `No invoices match “${data.search}”.` : "No invoices in this view."}</p>
              {searching ? (
                <Link href="/dashboard" className="mt-2 font-medium text-white underline">
                  Show recent invoices
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="min-h-0 space-y-1 overflow-y-auto px-2">
              {visibleInvoices.map((invoice) => {
                const active = invoice.id === selected?.id;
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      onClick={() => setPickedId(invoice.id)}
                      className={cn(
                        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-4 rounded-2xl px-3 py-3 text-left",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-white/5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                          active ? "bg-white/20 text-white" : "bg-white/10 text-white/80",
                        )}
                        aria-hidden
                      >
                        {partyInitials(invoice.beneficiaryName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{invoice.beneficiaryName}</span>
                        <span className={cn("mt-0.5 block truncate text-xs", active ? "text-primary-foreground/80" : "text-white/50")}>
                          {formatInvoiceDate(invoice.invoiceDate)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "justify-self-center rounded-full px-2.5 py-1 text-xs font-medium",
                          active ? "bg-white text-neutral-900" : "bg-white/10 text-white/80",
                        )}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                      <span className="min-w-[6.75rem] text-right text-sm font-semibold tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasInvoices && visibleInvoices.length > 0 ? (
            <div className="flex min-h-24 flex-1 items-center justify-center px-6 py-6">
              <ListSummary invoices={visibleInvoices} truncated={data.truncated} />
            </div>
          ) : null}
        </div>

        <InvoicePanel
          invoice={selected}
          message={
            !hasInvoices
              ? "No invoices yet."
              : searching
                ? "No invoices match this search."
                : "No invoices in this view."
          }
        />
      </section>
    </>
  );
}

function InvoicePanel({
  invoice,
  message,
}: {
  invoice: DashboardInvoice | null;
  message: string;
}) {
  const { notify } = usePortalModals();
  const [detail, setDetail] = useState<DashboardInvoiceDetail | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!invoice) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    loadDashboardInvoiceDetail(invoice.id)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="flex h-full min-h-48 min-w-0 items-center justify-center bg-primary px-6 text-center text-sm text-primary-foreground/70">
        {message}
      </div>
    );
  }

  const full = detail?.invoice.id === invoice.id ? detail : null;
  const amountPaid = full?.amountPaid ?? invoice.amountPaid;
  const outstanding = full?.outstanding ?? invoice.outstanding;
  const beneficiaryName = full?.invoice.beneficiaryName ?? invoice.beneficiaryName;
  const beneficiaryEmail = full?.invoice.beneficiaryEmail ?? invoice.beneficiaryEmail;
  const canShare = invoice.status !== "draft";

  async function downloadPdf() {
    if (!invoice || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(`/invoices/${invoice.id}/pdf?download=1`, { cache: "no-store" });
      if (!response.ok) {
        const text = (await response.text()).trim();
        throw new Error(text || "The PDF could not be downloaded.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const match = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] ?? `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The PDF could not be downloaded.", "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-primary text-primary-foreground">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight">#{invoice.invoiceNumber}</h2>
            {invoice.status === "paid" ? (
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-primary"
                aria-label="Paid"
                title="Paid"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <StatusPill status={invoice.status} />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <IconAction
              label="View invoice"
              href={`/invoices/${invoice.id}`}
              className={panelActionClass}
              tipSide="bottom"
            >
              <Eye />
            </IconAction>
            {canShare ? (
              <span className="group/tip relative inline-flex">
                <button
                  type="button"
                  aria-label="Download PDF"
                  disabled={downloading}
                  onClick={() => void downloadPdf()}
                  className={cn("inline-flex items-center justify-center disabled:opacity-60", panelActionClass)}
                >
                  {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                </button>
                <span role="tooltip" className={cn(panelTipClass, "left-1/2 -translate-x-1/2")}>
                  Download PDF
                </span>
              </span>
            ) : null}
            {canShare ? (
              <InvoiceEmailButton
                id={invoice.id}
                number={invoice.invoiceNumber}
                beneficiaryId={invoice.beneficiaryId}
                beneficiaryName={beneficiaryName}
                beneficiaryEmail={beneficiaryEmail}
                total={invoice.total}
                currency={invoice.currency}
                compact
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold"
              aria-hidden
            >
              {partyInitials(beneficiaryName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5">{beneficiaryName}</p>
              <p className="truncate text-sm leading-5 text-primary-foreground/75">
                {formatInvoiceDate(invoice.invoiceDate)}
                {full?.invoice.dueDate ? ` · Due ${formatInvoiceDate(full.invoice.dueDate)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden>
              <IndianRupee className="size-4" />
            </span>
            <div>
              <p className="text-xs leading-5 text-primary-foreground/75">Paid</p>
              <p className="text-sm font-semibold leading-5 tabular-nums">{formatMoney(amountPaid, invoice.currency)}</p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Subtotal" value={formatMoney(invoice.subtotal, invoice.currency)} />
          <Metric label="GST" value={formatMoney(invoice.gstAmount, invoice.currency)} />
          <Metric label="Total" value={formatMoney(invoice.total, invoice.currency)} />
          <Metric label="Outstanding" value={formatMoney(outstanding, invoice.currency)} />
        </dl>

        {full ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <TextCard label="Bill from" value={full.invoice.billFrom} />
            <TextCard label="Bill to" value={full.invoice.billTo} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ListSummary({ invoices, truncated }: { invoices: DashboardInvoice[]; truncated: boolean }) {
  const currencies = new Set(invoices.map((invoice) => invoice.currency));
  const currency = currencies.size === 1 ? invoices[0]?.currency : null;
  const listed = currency ? invoices.reduce((sum, invoice) => sum + invoice.total, 0) : null;
  const outstanding = currency ? invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0) : null;

  return (
    <div className="text-center">
      <p className="text-xs font-medium text-white/50">{truncated ? "Latest listed total" : "Listed total"}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {listed !== null && currency ? formatMoney(listed, currency) : "—"}
      </p>
      {outstanding !== null && currency ? (
        <p className="mt-1 text-xs text-white/50">Outstanding {formatMoney(outstanding, currency)}</p>
      ) : null}
    </div>
  );
}

function partyInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "—";
}

function TextCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5">
      <p className="text-xs text-primary-foreground/70">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5">{value?.trim() || "—"}</p>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
      {statusLabel(status)}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5">
      <dt className="text-xs text-primary-foreground/70">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
