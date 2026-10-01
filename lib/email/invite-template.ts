export const INVITE_EMAIL_LOGO_CID = "ifranchise-logo";

export type InviteEmailDetails = {
  recipientName: string;
  roleLabel: string;
  acceptUrl: string;
};

export type InviteEmailContent = {
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

export function renderInviteEmail(details: InviteEmailDetails): InviteEmailContent {
  const recipientName = singleLine(details.recipientName) || "there";
  const roleLabel = singleLine(details.roleLabel) || "Team Member";
  const acceptUrl = singleLine(details.acceptUrl);
  const subject = "You're invited to iFranchise";
  const message =
    "You have been invited to the iFranchise Internal Invoice Portal. Use the invitation link to create your password and activate your account.";

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
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f1f8;width:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(recipientName)}, you are invited to the iFranchise Internal Invoice Portal as ${escapeHtml(roleLabel)}.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f8;width:100%;">
      <tr>
        <td class="email-shell" align="center" style="padding:40px 16px;">
          <!--[if mso]>
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" align="center"><tr><td>
          <![endif]-->
          <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e3ee;border-radius:20px;">
            <tr>
              <td class="email-pad" align="center" style="padding:36px 40px 32px;text-align:center;">
                <img src="cid:${INVITE_EMAIL_LOGO_CID}" alt="iFranchise" width="56" height="54" style="display:block;margin:0 auto;width:56px;height:54px;border:0;outline:none;text-decoration:none;border-radius:10px;" />
                <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;font-weight:600;color:#2f0da3;text-align:center;">iFranchise</p>
                <h1 style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.25;font-weight:700;color:#1c1733;text-align:center;">You're invited to iFranchise</h1>
                <p style="margin:16px auto 0;max-width:420px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3f3a4d;text-align:center;">Hello ${escapeHtml(recipientName)},</p>
                <p style="margin:8px auto 0;max-width:420px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3f3a4d;text-align:center;">${escapeHtml(message)}</p>
                <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase;color:#6b6578;text-align:center;">Portal access</p>
                <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.4;font-weight:700;color:#1c1733;text-align:center;">${escapeHtml(roleLabel)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;">
                  <tr>
                    <td align="center" bgcolor="#2f0da3" style="border-radius:8px;background:#2f0da3;">
                      <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.2;font-weight:600;color:#ffffff;text-decoration:none;">Accept Invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px auto 0;max-width:420px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b6578;text-align:center;">Open the invitation link to create your password and activate your account. Your access level is already assigned and does not need to be chosen again.</p>
                <p style="margin:16px auto 0;max-width:420px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8496;text-align:center;word-break:break-all;">If the button does not open, copy this link into your browser:<br /><a href="${escapeHtml(acceptUrl)}" style="color:#2f0da3;text-decoration:underline;">${escapeHtml(acceptUrl)}</a></p>
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
    "You're invited to iFranchise",
    "",
    `Hello ${recipientName},`,
    "",
    message,
    "",
    `Portal access: ${roleLabel}`,
    "",
    `Accept invitation: ${acceptUrl}`,
    "",
    "Open the invitation link to create your password and activate your account.",
  ].join("\n");

  return { subject, html, text };
}
