"use client";

import { ActionNotice } from "@/components/portal/modal-triggers";

const messages = {
  created: "Beneficiary created successfully.",
  updated: "Beneficiary updated successfully.",
  deleted: "Beneficiary deleted successfully.",
} as const;

export function BeneficiaryNotice({
  notice,
}: {
  notice: keyof typeof messages;
}) {
  return <ActionNotice message={messages[notice]} />;
}
