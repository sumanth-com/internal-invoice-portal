import { BarChart3, FileText, Zap } from "lucide-react";
import type { ReactNode } from "react";

export function CreateInvoiceMock() {
  return (
    <div aria-hidden className="rounded-2xl border border-slate-100 bg-[#faf8ff] p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Tax invoice</span>
        <span className="font-medium text-slate-800">IF/26-27/0148</span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-4/5 rounded-full bg-slate-200" />
        <div className="h-2 w-3/5 rounded-full bg-slate-200" />
        <div className="h-2 w-2/3 rounded-full bg-violet-200" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs">
        <span className="text-slate-500">IGST 18%</span>
        <span className="font-semibold tabular-nums text-slate-900">₹18,000.00</span>
      </div>
    </div>
  );
}

export function PaymentStatusMock() {
  const rows = [
    ["Paid", "₹1,18,000.00", "bg-emerald-500"],
    ["Partial", "₹42,500.00", "bg-amber-400"],
    ["Outstanding", "₹42,500.00", "bg-rose-400"],
  ];
  return (
    <div aria-hidden className="space-y-2 rounded-2xl border border-slate-100 bg-[#faf8ff] p-3">
      {rows.map(([label, amount, dot]) => (
        <div key={label} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
          <span className={`size-2 rounded-full ${dot}`} />
          <span className="text-slate-600">{label}</span>
          <span className="ml-auto font-semibold tabular-nums text-slate-900">{amount}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportBarsMock() {
  const bars = [
    ["May", "45%"],
    ["Jun", "70%"],
    ["Jul", "52%"],
    ["Aug", "88%"],
    ["Sep", "64%"],
  ];
  return (
    <div aria-hidden className="rounded-2xl border border-slate-100 bg-[#faf8ff] px-4 pb-3 pt-5">
      <div className="flex h-28 items-end justify-between gap-3">
        {bars.map(([month, height]) => (
          <div key={month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end">
              <div className="w-full rounded-t-lg bg-[#5B2BD6]" style={{ height }} />
            </div>
            <span className="text-[11px] text-slate-400">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleInvoice() {
  const lines = [
    ["Consulting services", "2", "₹14,000.00", "₹28,000.00"],
    ["Project setup", "1", "₹10,000.00", "₹10,000.00"],
  ];
  return (
    <article className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-4 text-left shadow-[0_28px_70px_-36px_rgba(49,24,110,0.5)] sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-3 h-1.5 w-10 rounded-full bg-[#5B2BD6]" />
          <p className="text-2xl font-semibold tracking-tight text-slate-950">INVOICE</p>
        </div>
        <p className="text-[11px] font-medium text-slate-400">IF/26-27/0102</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-[10px] leading-4">
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-400">From</p>
          <p className="mt-1 font-medium text-slate-800">iFranchise Services Private Limited</p>
          <p className="text-slate-500">Bengaluru, Karnataka</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-1 font-medium text-slate-800">Example Client</p>
          <p className="text-slate-500">Bengaluru, Karnataka</p>
        </div>
        <div className="text-right">
          <p className="font-semibold uppercase tracking-wide text-slate-400">Issued</p>
          <p className="text-slate-800">03 Oct 2026</p>
          <p className="mt-2 font-semibold uppercase tracking-wide text-slate-400">Due</p>
          <p className="text-slate-800">18 Oct 2026</p>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 text-[10px] sm:text-[11px]">
        <div className="grid grid-cols-[1.2fr_0.35fr_0.9fr_0.95fr] gap-x-2 bg-slate-50 px-2 py-1.5 font-semibold uppercase tracking-wide text-slate-400">
          <span>Item</span>
          <span>Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        {lines.map((line) => (
          <div key={line[0]} className="grid grid-cols-[1.2fr_0.35fr_0.9fr_0.95fr] gap-x-2 border-t border-slate-100 px-2 py-2 text-slate-700">
            <span className="min-w-0">{line[0]}</span>
            <span>{line[1]}</span>
            <span className="text-right tabular-nums">{line[2]}</span>
            <span className="text-right tabular-nums">{line[3]}</span>
          </div>
        ))}
      </div>
      <dl className="mt-3 space-y-1 text-right text-[11px] text-slate-500">
        <div className="flex justify-end gap-6">
          <dt>Subtotal</dt>
          <dd className="w-24 tabular-nums text-slate-800">₹38,000.00</dd>
        </div>
        <div className="flex justify-end gap-6">
          <dt>IGST 18%</dt>
          <dd className="w-24 tabular-nums text-slate-800">₹6,840.00</dd>
        </div>
        <div className="flex justify-end gap-6 border-t border-slate-100 pt-1 text-sm font-semibold text-slate-950">
          <dt>Total</dt>
          <dd className="w-24 tabular-nums">₹44,840.00</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        Example invoice. Payment due by the date stated. Quote the invoice number when paying.
      </p>
    </article>
  );
}

function FadedInvoice({ number, client, total }: { number: string; client: string; total: string }) {
  return (
    <div className="h-full w-full bg-white p-5 text-left text-[11px] leading-4 text-slate-500">
      <div className="mb-3 h-1.5 w-8 rounded-full bg-[#5B2BD6]/70" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-semibold text-slate-800">INVOICE</p>
        <p className="text-[10px]">{number}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">From</p>
          <p className="mt-1 font-medium text-slate-700">iFranchise Services Private Limited</p>
          <p>Bengaluru, Karnataka</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-1 font-medium text-slate-700">{client}</p>
          <p>Karnataka</p>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex justify-between">
          <span>Advisory</span>
          <span className="tabular-nums">₹12,000.00</span>
        </div>
        <div className="flex justify-between">
          <span>Support</span>
          <span className="tabular-nums">₹8,000.00</span>
        </div>
      </div>
      <p className="mt-3 text-right text-sm font-semibold text-slate-800">Total {total}</p>
      <p className="mt-3 text-[10px]">Quote the invoice number when paying.</p>
    </div>
  );
}

function SideNote({
  className,
  icon,
  title,
  detail,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className={`absolute hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-left shadow-md backdrop-blur lg:flex ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-[#5B2BD6]">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-[11px] text-slate-500">{detail}</span>
      </span>
    </div>
  );
}

export function HeroShowcase() {
  return (
    <div aria-hidden className="relative mx-auto mt-10 h-[640px] max-w-5xl sm:h-[560px] lg:h-[520px]">
      <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[12%] top-6 -z-10 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-[18%] -z-10 h-64 w-80 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="absolute left-[6%] top-[16%] hidden h-[360px] w-[300px] -rotate-[14deg] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg lg:block">
        <FadedInvoice number="IF/26-27/0098" client="Example Studio" total="₹23,600.00" />
      </div>
      <div className="absolute right-[6%] top-[12%] hidden h-[360px] w-[300px] rotate-[14deg] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg lg:block">
        <FadedInvoice number="IF/26-27/0104" client="Example Retail" total="₹31,860.00" />
      </div>
      <div className="absolute left-1/2 top-6 z-10 w-full max-w-[380px] -translate-x-1/2 px-1">
        <SampleInvoice />
      </div>
      <SideNote
        className="left-0 top-[58%]"
        icon={<FileText className="size-4" />}
        title="GST ready"
        detail="CGST, SGST, or IGST"
      />
      <SideNote
        className="right-0 top-4"
        icon={<Zap className="size-4" />}
        title="Faster invoicing"
        detail="Create and send in seconds"
      />
      <SideNote
        className="bottom-6 right-2"
        icon={<BarChart3 className="size-4" />}
        title="Better control"
        detail="Track payments as you grow"
      />
    </div>
  );
}

