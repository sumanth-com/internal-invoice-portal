function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderAuthEmailCard(input: {
  subject: string;
  preheader: string;
  title: string;
  message: string;
  buttonLabel: string;
  href: string;
  note: string;
  logoHtml: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;width:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(input.preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;width:100%;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <!--[if mso]>
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" align="center"><tr><td>
          <![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:440px;width:100%;background:#ffffff;border-radius:24px;">
            <tr>
              <td align="center" bgcolor="#F4F0FF" style="background:#F4F0FF;border-top:6px solid #5B2BD6;padding:28px 24px 22px;text-align:center;border-radius:24px 24px 0 0;">
                ${input.logoHtml}
                <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.14em;color:#5B2BD6;text-align:center;">iFRANCHISE</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 36px 36px;text-align:center;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#111827;text-align:center;">${escapeHtml(input.title)}</p>
                <p style="margin:12px auto 0;max-width:320px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;text-align:center;">${escapeHtml(input.message)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;">
                  <tr>
                    <td align="center" bgcolor="#5B2BD6" style="border-radius:8px;background:#5B2BD6;">
                      <a href="${input.href}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(input.buttonLabel)}</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
                  <tr>
                    <td style="border-top:1px dashed #d1d5db;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">${escapeHtml(input.note)}</p>
                <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;text-align:center;">If the button does not open, use this link:<br /><a href="${input.href}" style="color:#5B2BD6;text-decoration:underline;word-break:break-all;">${input.href}</a></p>
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
}

export function emailLogoHtml(src: string) {
  return `<img src="${src}" alt="iFranchise" width="52" height="50" style="display:block;margin:0 auto;width:52px;height:50px;border:0;outline:none;text-decoration:none;" />`;
}
