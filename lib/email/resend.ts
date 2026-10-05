import "server-only";

import { Resend } from "resend";

export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return new Resend(apiKey);
}

const FROM_ADDRESS =
  /^(?:[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[^<>\r\n"]{1,80} <[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}>)$/;

export function resendFromAddress() {
  const raw = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  const from = raw.replace(/^["']+|["']+$/g, "").trim();
  if (!FROM_ADDRESS.test(from)) return null;
  return from;
}

export function resendSendError(message: string | undefined, fallback: string) {
  const text = message?.trim() ?? "";
  if (!text || /re_[A-Za-z0-9]|api[_ -]?key|sb_secret/i.test(text)) return fallback;
  if (/invalid ['"]?from['"]? field/i.test(text)) {
    return "The sender address is not configured. Use a verified sender such as iFranchise Invoices <sumanth.reddy@ifranchise.in>.";
  }
  if (/domain is not verified|not verified|not authorized to send/i.test(text)) {
    return "The sender domain is not verified, so the email could not be sent.";
  }
  return text;
}
