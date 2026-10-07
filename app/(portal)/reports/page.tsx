import { ReportsView } from "@/components/portal/reports-view";
import { TableSkeleton } from "@/components/portal/skeletons";
import { beneficiaryLogoUrls } from "@/lib/beneficiaries";
import { loadReport } from "@/lib/reports-data";
import {
  beneficiaryIdFromParam,
  buildReport,
  filterReportInvoices,
  reportBeneficiaryOptions,
  reportTypeFromParam,
} from "@/lib/reports";
import { Suspense } from "react";

export const metadata = {
  title: "Reports",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function ReportsSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <span className="block h-7 w-32 animate-pulse rounded bg-muted" />
        <span className="mt-3 block h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </div>
      <TableSkeleton rows={6} label="Loading reports…" />
    </div>
  );
}

async function ReportsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  try {
    const loaded = await loadReport({
      range: read("range"),
      from: read("from"),
      to: read("to"),
    });
    const type = reportTypeFromParam(read("type"));
    const query = read("q")?.trim() ?? "";
    const beneficiary = beneficiaryIdFromParam(read("beneficiary"));
    const options = reportBeneficiaryOptions(loaded.invoices);
    const logos = await beneficiaryLogoUrls(options.map((item) => item.id));
    const beneficiaries = options.map((item) => ({
      ...item,
      logoUrl: logos.get(item.id) ?? null,
    }));
    if (loaded.view.error) {
      return (
        <ReportsView
          data={loaded.view}
          invoices={[]}
          type={type}
          query={query}
          beneficiaries={beneficiaries}
          beneficiary={beneficiary}
        />
      );
    }
    const invoices = filterReportInvoices(loaded.invoices, { type, query, beneficiaryId: beneficiary });
    const view = buildReport(invoices, {
      range: loaded.view.range,
      from: loaded.view.from,
      to: loaded.view.to,
      activeBeneficiaries: loaded.view.beneficiaries.active,
    });
    return (
      <ReportsView
        data={view}
        invoices={invoices}
        type={type}
        query={query}
        beneficiaries={beneficiaries}
        beneficiary={beneficiary}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reports could not be loaded.";
    return (
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      </section>
    );
  }
}

export default function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
