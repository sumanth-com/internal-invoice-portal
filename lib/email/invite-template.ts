import { emailLogoHtml, renderAuthEmailCard } from "@/lib/email/auth-email-card";

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

const INVITE_SUBJECT = "You've been invited to iFranchise";
const INVITE_MESSAGE = "Join the iFranchise invoice portal and set your password to activate your account.";

export function renderInviteEmail(details: InviteEmailDetails): InviteEmailContent {
  const recipientName = singleLine(details.recipientName);
  const roleLabel = singleLine(details.roleLabel) || "Team Member";
  const acceptUrl = singleLine(details.acceptUrl);
  const accessLine = `Your access is set to ${roleLabel}.`;
  const html = renderAuthEmailCard({
    subject: INVITE_SUBJECT,
    preheader: recipientName ? `${recipientName}, ${INVITE_MESSAGE}` : INVITE_MESSAGE,
    title: "You've been invited",
    message: INVITE_MESSAGE,
    buttonLabel: "Accept invitation",
    href: escapeHtml(acceptUrl),
    note: accessLine,
    logoHtml: emailLogoHtml(`cid:${INVITE_EMAIL_LOGO_CID}`),
  });
  const text = [
    "You've been invited",
    "",
    INVITE_MESSAGE,
    "",
    accessLine,
    "",
    `Accept invitation: ${acceptUrl}`,
    "",
    "iFranchise",
  ].join("\n");

  return { subject: INVITE_SUBJECT, html, text };
}
