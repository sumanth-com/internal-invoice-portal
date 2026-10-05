"use client";

import { ActionNotice } from "@/components/portal/modal-triggers";

const messages = {
  saved: "Invoice saved successfully.",
  issued: "Invoice issued successfully.",
  cancelled: "Invoice cancelled successfully.",
  deleted: "Invoice deleted successfully.",
} as const;

export function InvoiceNotice({ notice }: { notice: keyof typeof messages }) {
  return <ActionNotice message={messages[notice]} />;
}
