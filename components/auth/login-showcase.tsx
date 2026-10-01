import { Check, FileText } from "lucide-react";

const lines = ["w-28", "w-36", "w-24"];
const bars = [46, 72, 54, 88, 64, 78];

export function LoginShowcase() {
  return (
    <aside className="flex h-[calc(100svh-2rem)] flex-col justify-between rounded-[28px] bg-[hsl(258,32%,8%)] px-6 py-8 text-white xl:h-[calc(100svh-2.5rem)] xl:px-8 xl:py-10">
      <div className="grid content-start gap-3 sm:grid-cols-2" aria-hidden>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs text-white/50">Collected</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">On track</p>
          <div className="mt-5 flex h-16 items-end gap-1.5">
            {bars.map((height) => (
              <span
                key={height}
                className="w-full rounded-md bg-[hsl(262,83%,68%)]"
                style={{ height: `${height}%`, opacity: 0.45 + height / 220 }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <FileText className="size-4" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-1 text-xs font-medium text-emerald-300">
              <Check className="size-3.5" strokeWidth={2.5} />
              Paid
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">Invoice</p>
            <p className="mt-1 text-xs text-white/45">October 2026</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/50">Line items</p>
            <p className="text-xs text-white/50">Amount</p>
          </div>
          <div className="mt-4 grid gap-3">
            {lines.map((width) => (
              <div key={width} className="flex items-center justify-between gap-6">
                <span className={`h-2 rounded-full bg-white/25 ${width}`} />
                <span className="h-2 w-12 rounded-full bg-white/15" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:col-span-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-4" strokeWidth={2.75} />
          </span>
          <span>
            <span className="block text-xs text-white/45">Payment recorded</span>
            <span className="block text-sm font-medium">NEFT · Cleared</span>
          </span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-sm text-center">
        <h2 className="text-[1.75rem] font-semibold tracking-tight">Invoices, simplified.</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Issue documents, record payments, and keep every balance in one place.
        </p>
      </div>
    </aside>
  );
}
