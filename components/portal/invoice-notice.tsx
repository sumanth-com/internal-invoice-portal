"use client";

import { ActionNotice } from "@/components/portal/modal-triggers";

const messages = {
  saved: "Invoice draft saved.",
  issued: "Invoice issued.",
  cancelled: "Invoice cancelled.",
  deleted: "Draft invoice deleted.",
} as const;

export function InvoiceNotice({ notice }: { notice: keyof typeof messages }) {
  return <ActionNotice message={messages[notice]} />;
}
