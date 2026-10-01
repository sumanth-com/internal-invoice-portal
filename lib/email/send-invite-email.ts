import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { INVITE_EMAIL_LOGO_CID, renderInviteEmail } from "@/lib/email/invite-template";
import { createResendClient, resendFromAddress } from "@/lib/email/resend";
import type { AppRole } from "@/lib/portal";

const EMAIL_LOGO_PATH = path.join(process.cwd(), "assets", "Logo.png");

export async function sendInviteEmail(input: {
  to: string;
  recipientName: string;
  role: AppRole;
  acceptUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = createResendClient();
  const from = resendFromAddress();
  if (!resend || !from) {
    return { ok: false, error: "Email sending is not configured." };
  }

  const content = renderInviteEmail({
    recipientName: input.recipientName,
    roleLabel: input.role === "admin" ? "Administrator" : "Team Member",
    acceptUrl: input.acceptUrl,
  });
  const logo = await readFile(EMAIL_LOGO_PATH);
  const sent = await resend.emails.send({
    from,
    to: input.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: [
      {
        filename: "ifranchise-logo.png",
        content: logo,
        contentType: "image/png",
        contentId: INVITE_EMAIL_LOGO_CID,
      },
    ],
  });

  if (sent.error || !sent.data?.id) {
    console.error("Invitation email failed", sent.error?.name);
    return { ok: false, error: "The invitation email could not be sent." };
  }

  return { ok: true };
}
