import { formatInvoiceDate, formatMoney } from "@/lib/invoice";

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

function displayDate(value: string) {
  const text = singleLine(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatInvoiceDate(text) : text || "—";
}

function displayName(value: string) {
  return singleLine(value) || "—";
}

function icon(paths: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8496" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;" aria-hidden="true">${paths}</svg>`;
}

const detailIcons = {
  number: icon(
    `<path d="M8 7h8M8 12h8M8 17h5"/><rect x="4" y="3" width="16" height="18" rx="2"/>`,
  ),
  date: icon(`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`),
  recipient: icon(
    `<circle cx="12" cy="8" r="3.25"/><path d="M5.5 19.25a6.5 6.5 0 0 1 13 0"/>`,
  ),
};

function detailRow(symbol: string, label: string, value: string) {
  return `<tr>
    <td width="18" valign="middle" style="width:18px;padding:12px 0;">${symbol}</td>
    <td valign="middle" style="padding:12px 0 12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:#6b6578;">${escapeHtml(label)}</td>
    <td class="detail-value" valign="middle" align="right" style="padding:12px 0 12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;font-weight:600;color:#1c1733;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderInvoiceEmail(details: InvoiceEmailDetails): InvoiceEmailContent {
  const invoiceNumber = singleLine(details.invoiceNumber) || "—";
  const invoiceDate = displayDate(details.invoiceDate);
  const recipientName = displayName(details.recipientName);
  const total = formatMoney(details.total, singleLine(details.currency) || "INR");
  const subject = invoiceEmailSubject(invoiceNumber);
  const message = INVOICE_EMAIL_MESSAGE;

  const detailHtml = [
    detailRow(detailIcons.number, "Invoice number", invoiceNumber),
    detailRow(detailIcons.recipient, "Recipient", recipientName),
  ].join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(subject)}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .email-shell { padding: 20px 12px !important; }
        .email-card { width: 100% !important; }
        .email-pad { padding: 28px 22px 24px !important; }
        .total-amount { font-size: 32px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f1f8;width:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Invoice ${escapeHtml(invoiceNumber)} for ${escapeHtml(total)}. The PDF is attached.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f8;width:100%;">
      <tr>
        <td class="email-shell" align="center" style="padding:40px 16px;">
          <!--[if mso]>
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" align="center"><tr><td>
          <![endif]-->
          <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e3ee;border-radius:20px;">
            <tr>
              <td class="email-pad" style="padding:36px 40px 28px;">
                <img src="cid:${INVOICE_EMAIL_LOGO_CID}" alt="iFranchise" width="56" height="54" style="display:block;margin:0 auto;width:56px;height:54px;border:0;outline:none;text-decoration:none;border-radius:10px;" />
                <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;font-weight:600;color:#2f0da3;text-align:center;">iFranchise</p>
                <p style="margin:32px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#3f3a4d;">Invoice</p>
                <p class="total-amount" style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:40px;line-height:1.1;font-weight:700;letter-spacing:-0.03em;color:#1c1733;">${escapeHtml(total)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                  <tr>
                    <td width="18" valign="middle" style="width:18px;">${detailIcons.date}</td>
                    <td valign="middle" style="padding-left:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:#6b6578;">${escapeHtml(invoiceDate)}</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #eceaf3;">
                  ${detailHtml}
                </table>
                <p style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3f3a4d;">${escapeHtml(message)}</p>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8a8496;">Sent by iFranchise</p>
              </td>
            </tr>
          </table>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "iFranchise",
    "",
    subject,
    "",
    message,
    "",
    `Invoice number: ${invoiceNumber}`,
    `Invoice date: ${invoiceDate}`,
    `Recipient: ${recipientName}`,
    `Total: ${total}`,
    "",
    "The invoice PDF is attached to this email.",
    "",
    "Sent by iFranchise",
  ].join("\n");

  return { subject, html, text };
}
