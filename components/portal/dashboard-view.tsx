import type { DashboardData, InvoiceStatus } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AddBeneficiaryButton,
  CreateInvoiceButton,
  RefreshOnBeneficiarySaved,
} from "@/components/portal/modal-triggers";
import { Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";

const statusLabel: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  cancelled: "Cancelled",
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </section>
  );
}

export function DashboardActions() {
  return (
    <>
      <CreateInvoiceButton>
        <Plus />
        Create Invoice
      </CreateInvoiceButton>
      <AddBeneficiaryButton variant="outline">
        <UserPlus />
        Add Beneficiary
      </AddBeneficiaryButton>
    </>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const hasInvoices = data.total > 0;
  const hasBeneficiaries = data.beneficiaryCount > 0;
  const searching = data.search.length > 0;

  return (
    <>
      <RefreshOnBeneficiarySaved />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total invoices" value={data.total} />
        <StatCard label="Draft invoices" value={data.draft} />
        <StatCard label="Issued invoices" value={data.issued} />
        <StatCard label="Paid invoices" value={data.paid} />
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              {searching ? "Invoice history" : "Recent invoices"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {searching
                ? "Invoices matching your search."
                : "The latest invoices in the portal."}
            </p>
          </div>
          <form action="/dashboard" className="flex w-full gap-2 md:max-w-md">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={data.search}
                placeholder="Search invoice history"
                aria-label="Search invoice history"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>

        {!hasBeneficiaries ? (
          <p className="border-b px-4 py-3 text-sm text-muted-foreground">
            No beneficiaries yet.
          </p>
        ) : null}

        {!hasInvoices ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">
            No invoices yet.
          </p>
        ) : data.invoices.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            <p>No invoices match “{data.search}”.</p>
            <div className="mt-2 flex gap-4">
              <Link href="/dashboard" className="underline">
                Clear search
              </Link>
              <Link href="/invoices" className="font-medium text-foreground underline">
                Invoice history
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Beneficiary</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-4 py-3">{invoice.beneficiaryName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {statusLabel[invoice.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
              <p>
                {data.truncated
                  ? `Showing the latest ${data.invoices.length} invoices.`
                  : searching
                    ? `${data.invoices.length} matching invoice${data.invoices.length === 1 ? "" : "s"}.`
                    : null}
              </p>
              <Link href="/invoices" className="font-medium text-foreground underline">
                Invoice history
              </Link>
            </div>
          </div>
        )}

        {!hasInvoices ? (
          <div className="border-t px-4 py-3 text-sm">
            <Link href="/invoices" className="font-medium underline">
              Invoice history
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}
