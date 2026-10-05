import { renderReportPdf, reportPdfName } from "@/lib/pdf/report-document";
import { getPortalUser } from "@/lib/portal-user";
import { loadReport } from "@/lib/reports-data";
import { reportExcelName, reportWorkbook } from "@/lib/reports-excel";
import {
  beneficiaryIdFromParam,
  buildReport,
  filterReportInvoices,
  reportTypeFromParam,
  type ReportType,
} from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { unstable_rethrow } from "next/navigation";

function failure(status: number, message: string) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

function generatedAt() {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

async function recordExports(
  invoices: { id: string }[],
  from: string,
  to: string,
  format: "xlsx" | "pdf",
) {
  const supabase = await createClient();
  const size = 20;
  for (let index = 0; index < invoices.length; index += size) {
    const slice = invoices.slice(index, index + size);
    const results = await Promise.all(
      slice.map((invoice) =>
        supabase.rpc("record_invoice_audit", {
          p_invoice_id: invoice.id,
          p_action: "exported",
          p_metadata: { format, from, to },
        }),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error("The export could not be recorded.");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getPortalUser();
    if (!user?.isActive) return failure(403, "You do not have permission to export reports.");

    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "xlsx" && format !== "pdf") {
      return failure(400, "Choose an Excel or PDF export.");
    }
    const loaded = await loadReport({
      range: "custom",
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (loaded.view.error || !loaded.view.from || !loaded.view.to) {
      return failure(400, loaded.view.error ?? "Choose a valid date range.");
    }

    const type: ReportType = reportTypeFromParam(url.searchParams.get("type") ?? undefined);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const beneficiaryId = beneficiaryIdFromParam(url.searchParams.get("beneficiary") ?? undefined);
    const beneficiary =
      loaded.invoices.find((invoice) => invoice.beneficiaryId === beneficiaryId)?.beneficiaryName ?? "";
    const invoices = filterReportInvoices(loaded.invoices, { type, query, beneficiaryId });
    const view = buildReport(invoices, {
      range: loaded.view.range,
      from: loaded.view.from,
      to: loaded.view.to,
      activeBeneficiaries: loaded.view.beneficiaries.active,
    });
    const payload = { type, view, invoices, query, beneficiary, generatedAt: generatedAt() };

    if (invoices.length > 0) await recordExports(invoices, view.from, view.to, format);

    if (format === "pdf") {
      const pdf = await renderReportPdf(payload);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${reportPdfName(type, view.from, view.to)}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const workbook = await reportWorkbook(payload);
    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${reportExcelName(type, view.from, view.to)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "The report could not be exported.";
    return failure(500, message);
  }
}
