import { isInvoiceId } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";
import {
  invoicePdfFileName,
  loadInvoicePdfData,
} from "@/lib/pdf/invoice-pdf-data";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";

function failure(status: number, message: string) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isInvoiceId(id)) return failure(404, "Invoice not found.");

  const download = request.nextUrl.searchParams.get("download") === "1";

  try {
    const [user, data] = await Promise.all([
      getPortalUser(),
      loadInvoicePdfData(id),
    ]);
    if (!user?.isActive)
      return failure(403, "You do not have permission to view this invoice.");
    if (!data) return failure(404, "Invoice not found.");
    if (data.invoice.status === "draft") {
      return failure(409, "Issue this invoice before generating its PDF.");
    }

    const pdf = await renderInvoicePdf(data);
    const fileName = invoicePdfFileName(data.invoice.invoiceNumber);

    if (download) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("record_invoice_audit", {
        p_invoice_id: data.invoice.id,
        p_action: "pdf_downloaded",
        p_metadata: { invoice_number: data.invoice.invoiceNumber },
      });
      if (error)
        return failure(500, "The download could not be recorded. Try again.");
    }

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Invoice PDF generation failed", error);
    return failure(500, "The invoice PDF could not be generated. Try again.");
  }
}
