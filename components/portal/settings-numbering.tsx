"use client";

import { SettingsSection } from "@/components/portal/settings-fields";
import { formatSequenceNumber, type InvoiceSequenceRow } from "@/lib/settings";

function nextInvoiceLabel(row: InvoiceSequenceRow) {
  if (row.pending && row.issuedCount > 0) return formatSequenceNumber(row.period, row.floor);
  if (row.pending) return formatSequenceNumber(row.period, 1);
  return row.nextInvoiceNumber;
}

function SequenceCard({ row }: { row: InvoiceSequenceRow }) {
  const behind = row.id !== null && row.nextNumber < row.floor;

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{row.periodLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Period {row.period}</p>
        </div>
        <p className="text-sm">
          Next invoice number{" "}
          <span className="font-mono font-medium">{nextInvoiceLabel(row)}</span>
        </p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {row.issuedCount === 0
          ? "No invoices have been numbered in this financial year."
          : `${row.issuedCount} invoice${row.issuedCount === 1 ? "" : "s"} already numbered in this financial year.`}{" "}
        The next number is assigned automatically when an invoice is created.
      </p>
      {behind ? (
        <p className="mt-3 text-sm text-muted-foreground">
          The stored counter is behind invoices already issued. New invoices continue from{" "}
          {formatSequenceNumber(row.period, row.floor)} so issued numbers are not reused.
        </p>
      ) : null}
    </article>
  );
}

export function InvoiceNumberingSection({ sequences }: { sequences: InvoiceSequenceRow[] }) {
  return (
    <SettingsSection
      title="Invoice numbering"
      description="New invoice numbers follow the Indian financial year, from 1 April to 31 March. Each year uses IF, the year, and a sequence that restarts at 0001, such as IF/26-27/0001. Earlier invoices keep their original numbers. Issued numbers cannot be reused."
    >
      <div className="grid gap-3">
        {sequences.map((row) => (
          <SequenceCard key={row.period} row={row} />
        ))}
      </div>
    </SettingsSection>
  );
}
