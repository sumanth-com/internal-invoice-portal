"use client";

import { ActionNotice } from "@/components/portal/modal-triggers";

const messages = {
  created: "Beneficiary added.",
  updated: "Beneficiary saved.",
  deleted: "Beneficiary deleted.",
} as const;

export function BeneficiaryNotice({
  notice,
}: {
  notice: keyof typeof messages;
}) {
  return <ActionNotice message={messages[notice]} />;
}
