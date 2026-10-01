import { getPortalUser } from "@/lib/portal-user";
import { loadReport } from "@/lib/reports-data";
import { reportCsv, reportExportName } from "@/lib/reports";
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

async function recordExports(
  invoices: { id: string }[],
  from: string,
  to: string,
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
          p_metadata: { format: "csv", from, to },
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
    const { view, invoices } = await loadReport({
      range: "custom",
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (view.error || !view.from || !view.to) {
      return failure(400, view.error ?? "Choose a valid date range.");
    }

    if (invoices.length > 0) await recordExports(invoices, view.from, view.to);

    return new Response(reportCsv(invoices), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${reportExportName(view.from, view.to)}"`,
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
