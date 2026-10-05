import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  INVOICE_EMAIL_LOGO_CID,
  renderInvoiceEmail,
  type InvoiceEmailDetails,
} from "@/lib/email/invoice-template";
import { createResendClient, resendFromAddress, resendSendError } from "@/lib/email/resend";

const EMAIL_LOGO_PATH = path.join(process.cwd(), "assets", "Logo.png");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendInvoiceEmailInput = InvoiceEmailDetails & {
  to: string;
  pdf: Buffer;
  pdfFileName: string;
};

export type SendInvoiceEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function invoiceEmailError(message: string | undefined) {
  return resendSendError(message, "The invoice email could not be sent.");
}

function pdfFileName(fileName: string, invoiceNumber: string) {
  const cleaned = fileName.replace(/[^A-Za-z0-9._-]/g, "");
  if (cleaned.toLowerCase().endsWith(".pdf")) return cleaned;
  const number = invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "") || "invoice";
  return `Invoice-${number}.pdf`;
}

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult> {
  const to = input.to.trim().toLowerCase();
  if (!to || to.length > 160 || !EMAIL_PATTERN.test(to)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.pdf.length === 0) {
    return { ok: false, error: "The invoice PDF could not be attached." };
  }

  const resend = createResendClient();
  const from = resendFromAddress();
  if (!resend && !from) {
    return { ok: false, error: "Email sending is not configured. RESEND_API_KEY and RESEND_FROM_EMAIL are missing." };
  }
  if (!resend) {
    return { ok: false, error: "Email sending is not configured. RESEND_API_KEY is missing." };
  }
  if (!from) {
    return {
      ok: false,
      error:
        "The sender address is not configured. Use a verified sender such as iFranchise Invoices <sumanth.reddy@ifranchise.in>.",
    };
  }

  const content = renderInvoiceEmail(input);
  const logo = await readFile(EMAIL_LOGO_PATH);
  const sent = await resend.emails.send({
    from,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: [
      {
        filename: "ifranchise-logo.png",
        content: logo,
        contentType: "image/png",
        contentId: INVOICE_EMAIL_LOGO_CID,
      },
      {
        filename: pdfFileName(input.pdfFileName, input.invoiceNumber),
        content: input.pdf,
        contentType: "application/pdf",
      },
    ],
  });

  if (sent.error || !sent.data?.id) {
    console.error("Invoice email failed", sent.error?.name, sent.error?.message);
    return { ok: false, error: invoiceEmailError(sent.error?.message) };
  }

  return { ok: true, id: sent.data.id };
}
