import { emailLogoHtml, renderAuthEmailCard } from "@/lib/email/auth-email-card";

const RECOVERY_SUBJECT = "Reset your iFranchise password";
const RECOVERY_MESSAGE = "Choose a new password for your iFranchise account.";
const RECOVERY_NOTE = "If you did not ask for this, you can ignore this email.";

export function renderRecoveryEmail(resetUrl: string) {
  const href = resetUrl
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return {
    subject: RECOVERY_SUBJECT,
    html: renderAuthEmailCard({
      subject: RECOVERY_SUBJECT,
      preheader: RECOVERY_MESSAGE,
      title: "Reset your password",
      message: RECOVERY_MESSAGE,
      buttonLabel: "Reset password",
      href,
      note: RECOVERY_NOTE,
      logoHtml: emailLogoHtml("cid:ifranchise-logo"),
    }),
    text: ["Reset your password", "", RECOVERY_MESSAGE, "", RECOVERY_NOTE, "", `Reset password: ${resetUrl}`, "", "iFranchise"].join(
      "\n",
    ),
  };
}

export function renderSupabaseRecoveryEmail(logoSrc: string) {
  return renderAuthEmailCard({
    subject: RECOVERY_SUBJECT,
    preheader: RECOVERY_MESSAGE,
    title: "Reset your password",
    message: RECOVERY_MESSAGE,
    buttonLabel: "Reset password",
    href: "{{ .ConfirmationURL }}",
    note: RECOVERY_NOTE,
    logoHtml: emailLogoHtml(logoSrc),
  });
}

export function renderSupabaseInviteEmail(logoSrc: string) {
  return renderAuthEmailCard({
    subject: "You've been invited to iFranchise",
    preheader: "Join the iFranchise invoice portal and set your password to activate your account.",
    title: "You've been invited",
    message: "Join the iFranchise invoice portal and set your password to activate your account.",
    buttonLabel: "Accept invitation",
    href: "{{ .ConfirmationURL }}",
    note: "Your access is already assigned.",
    logoHtml: emailLogoHtml(logoSrc),
  });
}
