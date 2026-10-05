"use server";

import { emptyEmailInvoiceState, type EmailInvoiceState } from "@/lib/email/invoice-email-state";
import { sendInvoiceEmail } from "@/lib/email/send-invoice-email";
import { isInvoiceId } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";
import {
  invoicePdfFileName,
  loadInvoicePdfData,
} from "@/lib/pdf/invoice-pdf-data";
import { recordInvoiceEmailNotification } from "@/lib/portal-notifications";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { unstable_rethrow } from "next/navigation";

const EMAILABLE = new Set(["issued", "paid", "cancelled"]);

export async function emailInvoice(
  _state: EmailInvoiceState,
  formData: FormData,
): Promise<EmailInvoiceState> {
  try {
    const user = await getPortalUser();
    if (!user?.isActive) {
      return { ...emptyEmailInvoiceState, error: "You do not have permission to email this invoice." };
    }

    const idValue = formData.get("invoice_id");
    const id = typeof idValue === "string" ? idValue : "";
    if (!isInvoiceId(id)) {
      return { ...emptyEmailInvoiceState, error: "This invoice was not found." };
    }

    const recipientValue = formData.get("recipient");
    const recipient = typeof recipientValue === "string" ? recipientValue.trim().toLowerCase() : "";
    if (!recipient) {
      return {
        ...emptyEmailInvoiceState,
        fieldErrors: { recipient: "Enter a recipient email address." },
      };
    }

    const data = await loadInvoicePdfData(id);
    if (!data) return { ...emptyEmailInvoiceState, error: "This invoice was not found." };
    if (!EMAILABLE.has(data.invoice.status)) {
      return {
        ...emptyEmailInvoiceState,
        error: "Issue this invoice before emailing it.",
      };
    }

    const pdf = await renderInvoicePdf(data);
    const sent = await sendInvoiceEmail({
      to: recipient,
      invoiceNumber: data.invoice.invoiceNumber,
      invoiceDate: data.invoice.invoiceDate,
      recipientName: data.invoice.beneficiaryName,
      total: data.invoice.balanceDue,
      currency: data.invoice.currency,
      pdf: Buffer.from(pdf),
      pdfFileName: invoicePdfFileName(data.invoice.invoiceNumber),
    });
    if (!sent.ok) {
      const fieldError = sent.error === "Enter a valid email address.";
      return fieldError
        ? { ...emptyEmailInvoiceState, fieldErrors: { recipient: sent.error } }
        : { ...emptyEmailInvoiceState, error: sent.error };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("record_invoice_audit", {
      p_invoice_id: data.invoice.id,
      p_action: "emailed",
      p_metadata: {
        recipient,
        invoice_number: data.invoice.invoiceNumber,
      },
    });
    if (error) {
      console.error("Invoice email audit failed", error.message);
      return {
        ...emptyEmailInvoiceState,
        error: "The invoice was emailed, but the activity could not be recorded.",
      };
    }

    await recordInvoiceEmailNotification(data.invoice.id, data.invoice.invoiceNumber, recipient);
    return { ...emptyEmailInvoiceState, sent: true };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Invoice email failed", error);
    return { ...emptyEmailInvoiceState, error: "The invoice email could not be sent." };
  }
}
