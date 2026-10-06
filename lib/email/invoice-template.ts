import { formatMoney } from "@/lib/invoice";

export const INVOICE_EMAIL_LOGO_CID = "ifranchise-logo";

export const INVOICE_EMAIL_MESSAGE =
  "Please find your invoice attached as a PDF.";

export function invoiceEmailSubject(invoiceNumber: string) {
  const number = invoiceNumber.replace(/[\r\n]+/g, " ").trim() || "—";
  return `Invoice ${number} from iFranchise`;
}

export type InvoiceEmailDetails = {
  invoiceNumber: string;
  invoiceDate: string;
  recipientName: string;
  total: number;
  currency: string;
};

export type InvoiceEmailContent = {
  subject: string;
  html: string;
  text: string;
};

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function displayDate(value: string) {
  const text = singleLine(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text || "—";
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return text;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function displayName(value: string) {
  return singleLine(value) || "—";
}

function label(text: string) {
  return `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.3;font-weight:700;letter-spacing:0.08em;color:#9aa0a6;text-transform:uppercase;">${text}</p>`;
}

function value(text: string, align: "left" | "right") {
  return `<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.35;font-weight:700;color:#111827;text-align:${align};">${escapeHtml(text)}</p>`;
}

export function renderInvoiceEmail(details: InvoiceEmailDetails): InvoiceEmailContent {
  const invoiceNumber = singleLine(details.invoiceNumber) || "—";
  const invoiceDate = displayDate(details.invoiceDate);
  const recipientName = displayName(details.recipientName);
  const total = formatMoney(details.total, singleLine(details.currency) || "INR");
  const subject = invoiceEmailSubject(invoiceNumber);
  const message = INVOICE_EMAIL_MESSAGE;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;width:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Invoice ${escapeHtml(invoiceNumber)} for ${escapeHtml(total)}. The PDF is attached.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;width:100%;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <!--[if mso]>
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" align="center"><tr><td>
          <![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:440px;width:100%;background:#ffffff;border-radius:24px;">
            <tr>
              <td align="center" style="padding:36px 32px 8px;">
                <img src="cid:${INVOICE_EMAIL_LOGO_CID}" alt="iFranchise" width="48" height="46" style="display:block;margin:0 auto;width:48px;height:46px;border:0;outline:none;text-decoration:none;" />
                <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.2;font-weight:700;color:#111827;text-align:center;">Invoice</p>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6b7280;text-align:center;">${escapeHtml(message)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-top:1px dashed #d1d5db;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="55%" valign="top" align="left" style="width:55%;padding:0 12px 0 0;">
                      ${label("Invoice number")}
                      ${value(invoiceNumber, "left")}
                    </td>
                    <td width="45%" valign="top" align="right" style="width:45%;padding:0 0 0 12px;">
                      ${label("Amount")}
                      ${value(total, "right")}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:22px 32px 0;">
                ${label("Date")}
                ${value(invoiceDate, "left")}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ff;border-radius:16px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;font-weight:700;color:#111827;">${escapeHtml(recipientName)}</p>
                      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">Quote the invoice number when paying.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#9aa0a6;text-align:center;">Sent by iFranchise</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "iFranchise",
    "",
    "Invoice",
    message,
    "",
    `Invoice number: ${invoiceNumber}`,
    `Amount: ${total}`,
    `Date: ${invoiceDate}`,
    `Recipient: ${recipientName}`,
    "",
    "The invoice PDF is attached to this email.",
    "",
    "Sent by iFranchise",
  ].join("\n");

  return { subject, html, text };
}
