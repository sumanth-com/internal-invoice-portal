import "server-only";

import { Resend } from "resend";

export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return new Resend(apiKey);
}

export function resendFromAddress() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}
