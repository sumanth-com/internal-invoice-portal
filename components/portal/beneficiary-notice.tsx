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
  return (
    <p
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
    >
      {messages[notice]}
    </p>
  );
}
