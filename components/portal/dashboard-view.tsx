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
import { Ban, Building2, ChevronRight, CircleCheck, Coins, Download, Eye, FilePen, FileText, IndianRupee, LayoutGrid, Loader2, Percent, Plus, Search, Send, UserPlus, UserRound, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

const panelActionClass =
  "size-9 rounded-full border border-violet-200/80 bg-white/80 text-violet-700 shadow-sm hover:bg-white hover:text-violet-800";

const detailPanelClass =
  "relative overflow-hidden rounded-[28px] border border-violet-100 text-foreground shadow-sm dark:border-violet-900/40 dark:text-white";

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
  "Cancelled invoices": {
    back: "M0 40C80 40 140 18 220 28C300 38 344 20 400 28V120H0Z",
    front: "M0 68C88 68 146 48 228 56C310 64 350 48 400 54V120H0Z",
    backClass: "fill-rose-100 dark:fill-rose-900",
    frontClass: "fill-rose-200 dark:fill-rose-700",
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
        sizes="(min-width: 1280px) 20vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover object-[center_70%] dark:hidden"
      />
      <Image
        src={darkScene}
        alt=""
        fill
        sizes="(min-width: 1280px) 20vw, (min-width: 640px) 50vw, 100vw"
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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4 lg:overflow-hidden">
      <RefreshOnBeneficiarySaved />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <VisualStatCard label="Total invoices" value={data.total} />
        <StatCard label="Draft invoices" value={data.draft} href="/invoices?status=draft" icon={FilePen} />
        <StatCard label="Issued invoices" value={data.issued} href="/invoices?status=issued" icon={Send} />
        <StatCard label="Paid invoices" value={data.paid} href="/invoices?status=paid" icon={CircleCheck} />
        <StatCard label="Cancelled invoices" value={data.cancelled} href="/invoices?status=cancelled" icon={Ban} />
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

      <section className="grid min-h-[28rem] min-w-0 flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] lg:overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {searching ? "Matching invoices" : "Recent invoices"}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {searching ? "Invoices matching your search" : "Latest invoices and their status"}
                </p>
              </div>
            </div>
            <Link
              href="/invoices"
              className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              History
            </Link>
          </div>

          {!hasInvoices ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              No invoices yet.
            </div>
          ) : visibleInvoices.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
              <p>{searching ? `No invoices match “${data.search}”.` : "No invoices in this view."}</p>
              {searching ? (
                <Link href="/dashboard" className="mt-2 font-medium text-foreground underline">
                  Show recent invoices
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3">
              {visibleInvoices.map((invoice) => {
                const active = invoice.id === selected?.id;
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      onClick={() => setPickedId(invoice.id)}
                      className={cn(
                        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 rounded-2xl px-2 py-2.5 text-left",
                        active ? "bg-violet-50 dark:bg-white/5" : "hover:bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                          avatarTone(invoice.beneficiaryName),
                        )}
                        aria-hidden
                      >
                        {partyInitials(invoice.beneficiaryName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{invoice.beneficiaryName}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {formatInvoiceDate(invoice.invoiceDate)}
                        </span>
                      </span>
                      <StatusPill status={invoice.status} />
                      <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasInvoices && visibleInvoices.length > 0 ? (
            <div className="mt-auto px-3 pb-3 pt-3">
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
    </div>
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
      <div className={cn("flex h-full min-h-48 min-w-0 items-center justify-center px-6 text-center text-sm text-muted-foreground", detailPanelClass)}>
        <PanelBackdrop />
        <p className="relative">{message}</p>
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
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col", detailPanelClass)}>
      <PanelBackdrop />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-violet-600 shadow-sm dark:bg-white/10 dark:text-violet-200">
              <FileText className="size-4" />
            </span>
            <h2 className="truncate text-lg font-semibold tracking-tight">#{invoice.invoiceNumber}</h2>
            <StatusPill status={invoice.status} />
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
                total={invoice.balanceDue}
                currency={invoice.currency}
                compact
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                avatarTone(beneficiaryName),
              )}
              aria-hidden
            >
              {partyInitials(beneficiaryName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-5">{beneficiaryName}</p>
              <p className="truncate text-sm leading-5 text-muted-foreground dark:text-white/70">
                {formatInvoiceDate(invoice.invoiceDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-violet-600 shadow-sm dark:bg-white/10 dark:text-violet-200" aria-hidden>
              <IndianRupee className="size-4" />
            </span>
            <div>
              <p className="text-xs leading-5 text-muted-foreground dark:text-white/70">Paid</p>
              <p className="text-sm font-semibold leading-5 tabular-nums">{formatMoney(amountPaid, invoice.currency)}</p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Subtotal" value={formatMoney((full?.invoice ?? invoice).subtotal, invoice.currency)} />
          {full &&
          full.invoice.cgstAmount + full.invoice.sgstAmount + full.invoice.igstAmount === 0 &&
          full.invoice.gstAmount > 0 ? (
            <Metric label="GST" value={formatMoney(full.invoice.gstAmount, invoice.currency)} />
          ) : (
            <>
              <Metric label="CGST" value={formatMoney((full?.invoice ?? invoice).cgstAmount, invoice.currency)} />
              <Metric label="SGST" value={formatMoney((full?.invoice ?? invoice).sgstAmount, invoice.currency)} />
              <Metric label="IGST" value={formatMoney((full?.invoice ?? invoice).igstAmount, invoice.currency)} />
            </>
          )}
          <Metric label="Invoice total" value={formatMoney((full?.invoice ?? invoice).total, invoice.currency)} />
          <Metric label="TDS" value={formatMoney((full?.invoice ?? invoice).tdsAmount, invoice.currency)} />
          <Metric
            label="Balance due"
            value={formatMoney((full?.invoice ?? invoice).balanceDue, invoice.currency)}
          />
          <Metric label="Outstanding" value={formatMoney(outstanding, invoice.currency)} />
        </dl>

        {full ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <TextCard label="Bill from" value={full.invoice.billFrom} icon={Building2} />
            <TextCard label="Bill to" value={full.invoice.billTo} icon={UserRound} />
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function PanelBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#fbf9ff_0%,#f4edff_52%,#f7f5ff_100%)] dark:bg-[linear-gradient(155deg,hsl(262,34%,14%),hsl(250,30%,11%))]" />
      <div className="absolute -right-16 -top-20 size-72 rounded-full bg-fuchsia-200/70 blur-2xl dark:bg-fuchsia-500/20" />
      <div className="absolute -bottom-24 right-10 size-72 rounded-full bg-sky-200/70 blur-2xl dark:bg-sky-500/15" />
      <div className="absolute -left-16 bottom-0 size-56 rounded-full bg-violet-200/80 blur-2xl dark:bg-violet-500/20" />
      <svg className="absolute -right-10 top-0 h-48 w-48" viewBox="0 0 160 160">
        <circle cx="108" cy="42" r="58" fill="none" stroke="white" strokeWidth="16" opacity="0.7" />
        <circle cx="118" cy="36" r="28" fill="rgb(244 114 182)" opacity="0.18" />
      </svg>
      <svg className="absolute bottom-0 left-0 h-24 w-full" viewBox="0 0 400 80" preserveAspectRatio="none">
        <path d="M0 46C80 46 130 16 210 30C290 44 330 18 400 28V80H0Z" fill="white" fillOpacity="0.45" />
        <path d="M0 60C100 60 150 40 230 50C310 60 350 46 400 54V80H0Z" fill="rgb(221 214 254)" fillOpacity="0.45" />
      </svg>
    </div>
  );
}

function ListSummary({ invoices, truncated }: { invoices: DashboardInvoice[]; truncated: boolean }) {
  const currencies = new Set(invoices.map((invoice) => invoice.currency));
  const currency = currencies.size === 1 ? invoices[0]?.currency : null;
  const listed = currency ? invoices.reduce((sum, invoice) => sum + invoice.total, 0) : null;
  const outstanding = currency ? invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0) : null;

  return (
    <div className="relative flex min-h-[6.75rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-400 px-4 py-4 text-center text-white">
      <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
        <path d="M0 42C90 42 150 18 230 30C310 42 350 20 400 28V80H0Z" className="fill-white/15" />
        <path d="M0 58C100 58 160 42 240 50C320 58 360 46 400 52V80H0Z" className="fill-white/25" />
      </svg>
      <div className="relative flex items-center justify-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <IndianRupee className="size-5" />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-xs font-medium text-white/80">{truncated ? "Latest listed total" : "Listed total"}</p>
          <p className="text-xl font-semibold tabular-nums">
            {listed !== null && currency ? formatMoney(listed, currency) : "—"}
          </p>
          {outstanding !== null && currency ? (
            <p className="text-xs text-white/80">Outstanding {formatMoney(outstanding, currency)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const avatarTones = [
  "bg-violet-600 text-white",
  "bg-neutral-900 text-white",
  "bg-fuchsia-600 text-white",
  "bg-indigo-600 text-white",
];

function avatarTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % avatarTones.length;
  return avatarTones[hash] ?? avatarTones[0];
}

function partyInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "—";
}

function TextCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon: typeof FileText;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/80 px-3 py-3 shadow-sm dark:bg-white/10">
      <p className="flex items-center gap-2 text-xs text-muted-foreground dark:text-white/70">
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-white/10 dark:text-violet-200">
          <Icon className="size-3.5" />
        </span>
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-5">{value?.trim() || "—"}</p>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 justify-self-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        status === "paid" && "bg-emerald-100 text-emerald-700",
        status === "issued" && "bg-violet-100 text-violet-700",
        status === "cancelled" && "bg-rose-100 text-rose-600",
        status === "draft" && "bg-slate-100 text-slate-600",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

const metricStyles: Record<string, { icon: typeof FileText; tone: string }> = {
  Subtotal: { icon: LayoutGrid, tone: "bg-violet-100 text-violet-600" },
  CGST: { icon: IndianRupee, tone: "bg-rose-100 text-rose-500" },
  SGST: { icon: IndianRupee, tone: "bg-emerald-100 text-emerald-600" },
  IGST: { icon: IndianRupee, tone: "bg-lime-100 text-lime-700" },
  GST: { icon: IndianRupee, tone: "bg-emerald-100 text-emerald-600" },
  "Invoice total": { icon: FileText, tone: "bg-amber-100 text-amber-600" },
  TDS: { icon: Percent, tone: "bg-violet-100 text-violet-600" },
  "Balance due": { icon: Wallet, tone: "bg-rose-100 text-rose-500" },
  Outstanding: { icon: Coins, tone: "bg-sky-100 text-sky-600" },
};

function Metric({ label, value }: { label: string; value: string }) {
  const style = metricStyles[label] ?? { icon: FileText, tone: "bg-violet-100 text-violet-600" };
  const Icon = style.icon;
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm dark:bg-white/10">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.tone)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-xs text-muted-foreground dark:text-white/70">{label}</dt>
        <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
      </div>
    </div>
  );
}
